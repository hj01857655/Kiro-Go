# ==================== 前端构建阶段 ====================
# 用 bun 构建 React 前端（Vite 输出到 web/dist，base 配置为 /admin/）。
# 单独成阶段，避免把 node_modules / 构建工具带进最终镜像。
FROM oven/bun:1-alpine AS frontend
WORKDIR /web

# 先拷锁文件与清单，命中 layer 缓存
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile

# 再拷源码并构建
COPY web/ ./
RUN bun run build

# ==================== 后端构建阶段 ====================
# builder 阶段始终运行在构建机原生平台（amd64），用 Go 交叉编译目标平台二进制
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o kiro-go .

# ==================== 运行阶段 ====================
FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=builder /app/kiro-go .
# 运行时只读 web/dist（const webDir = "web/dist"），React 源码不进镜像。
COPY --from=frontend /web/dist ./web/dist
RUN mkdir -p /app/data

EXPOSE 8080
VOLUME /app/data

CMD ["./kiro-go"]
