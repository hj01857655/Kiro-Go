package proxy

// maxResponsesHistoryDepth caps how far back we walk the previous_response_id
// chain when expanding history. The cap prevents pathological loops in
// corrupted/cyclic stores from running forever; legitimate chains rarely go
// this deep within the 30-day TTL.
const maxResponsesHistoryDepth = 64

// expandPreviousResponseHistory rebuilds the conversation history that led up
// to prev. It walks the previous_response_id chain backwards (oldest → newest)
// and emits OpenAI messages for both stored inputs and stored outputs of every
// ancestor, so a multi-turn /v1/responses session preserves full context.
//
// If a link in the chain is missing on disk (e.g. expired past TTL or the
// referenced ID was deleted), expansion stops at the deepest reachable
// ancestor instead of failing — the most recent context is still useful.
func expandPreviousResponseHistory(prev *ResponsesObject) []OpenAIMessage {
	if prev == nil {
		return nil
	}

	chain := collectAncestorChain(prev)

	messages := make([]OpenAIMessage, 0)
	for _, node := range chain {
		// Inject the instructions stored on the ancestor as a system message
		// so it remains in scope for downstream turns. Without this, an early
		// system prompt set on response A would be lost the moment a new
		// turn omits it.
		if node.Instructions != "" {
			messages = append(messages, OpenAIMessage{
				Role:    "system",
				Content: node.Instructions,
			})
		}
		if prior, err := parseResponsesInput(node.StoredInput); err == nil {
			messages = append(messages, prior...)
		}
		messages = append(messages, outputToMessages(node.Output)...)
	}

	return messages
}

// collectAncestorChain walks previous_response_id backwards, returning the
// chain in oldest-first order: [root, ..., parent, prev]. The walker is
// bounded by maxResponsesHistoryDepth and a visited-set to short-circuit
// any cycle in the stored data.
func collectAncestorChain(prev *ResponsesObject) []*ResponsesObject {
	stack := []*ResponsesObject{prev}
	visited := map[string]bool{prev.ID: true}

	cursor := prev
	for depth := 0; depth < maxResponsesHistoryDepth; depth++ {
		if cursor.PreviousResponseID == "" {
			break
		}
		if visited[cursor.PreviousResponseID] {
			break
		}
		ancestor, err := loadResponse(cursor.PreviousResponseID)
		if err != nil || ancestor == nil {
			break
		}
		visited[ancestor.ID] = true
		stack = append(stack, ancestor)
		cursor = ancestor
	}

	// Reverse to oldest-first.
	for i, j := 0, len(stack)-1; i < j; i, j = i+1, j-1 {
		stack[i], stack[j] = stack[j], stack[i]
	}
	return stack
}

func outputToMessages(items []ResponseOutputItem) []OpenAIMessage {
	if len(items) == 0 {
		return nil
	}
	out := make([]OpenAIMessage, 0, len(items))
	for _, item := range items {
		switch item.Type {
		case "message":
			text := joinTextParts(item.Content)
			role := item.Role
			if role == "" {
				role = "assistant"
			}
			if text == "" && role == "assistant" {
				continue
			}
			out = append(out, OpenAIMessage{Role: role, Content: text})
		case "function_call":
			tc := ToolCall{ID: item.CallID, Type: "function"}
			if tc.ID == "" {
				tc.ID = item.ID
			}
			tc.Function.Name = item.Name
			tc.Function.Arguments = item.Arguments
			out = append(out, OpenAIMessage{
				Role:      "assistant",
				Content:   "",
				ToolCalls: []ToolCall{tc},
			})
		}
	}
	return out
}

func joinTextParts(parts []ResponseContentPart) string {
	if len(parts) == 0 {
		return ""
	}
	out := ""
	for _, p := range parts {
		if p.Type == "output_text" || p.Type == "text" || p.Type == "input_text" {
			out += p.Text
		}
	}
	return out
}
