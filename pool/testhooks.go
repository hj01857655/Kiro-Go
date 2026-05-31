package pool

import "kiro-go/config"

// 本文件仅供测试使用：暴露内部可注入点，让测试能消除异步落盘逃逸出测试体的竞态。
// 生产代码不应调用这些函数。

// SetSyncAccountStatsPersistForTest 把账号统计落盘从默认的异步 fire-and-forget
// 切成同步。返回恢复原行为的函数，便于调用方 defer 还原。
//
// 动机：UpdateStats 默认 `go config.UpdateAccountStats(...)`，该 goroutine 在 Save()
// 时读全局 cfgPath。若它逃出 spawn 它的测试体，下一个测试 config.Init 改了 cfgPath
// 后它才落盘，会把 config.json 写进正被 t.TempDir 拆除的目录，随机以
// "directory not empty" 打挂无关测试。同步化保证写盘在测试体内完成。
func SetSyncAccountStatsPersistForTest() func() {
	prev := persistAccountStats
	persistAccountStats = func(id string, requestCount, errorCount, totalTokens int, totalCredits float64, lastUsed int64) {
		config.UpdateAccountStats(id, requestCount, errorCount, totalTokens, totalCredits, lastUsed)
	}
	return func() { persistAccountStats = prev }
}
