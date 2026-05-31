package proxy

import (
	accountpool "kiro-go/pool"
	"os"
	"testing"
)

// TestMain 给整个 proxy 测试包安装"同步落盘"钩子。
//
// 背景：成功请求会走 pool.UpdateStats → 默认 `go config.UpdateAccountStats(...)`，
// 该 goroutine 在 Save() 时读全局 cfgPath。proxy 这边大量测试用 t.TempDir() + config.Init
// 起隔离配置，一旦那个 goroutine 逃出 spawn 它的测试体，下一个测试改了 cfgPath 后它才落盘，
// 就会把 config.json 写进正被 t.TempDir 自动 RemoveAll 的目录，随机以 "directory not empty"
// 打挂一个看似无关的测试（CI 上 TestResponsesStreamSSE 中招过）。
//
// 同步化保证写盘在测试体内完成，goroutine 不再逃逸。生产仍是异步，行为不变。
func TestMain(m *testing.M) {
	restore := accountpool.SetSyncAccountStatsPersistForTest()
	code := m.Run()
	restore()
	os.Exit(code)
}
