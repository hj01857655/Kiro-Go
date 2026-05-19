import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { LogIn, Loader2, Sparkles } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onLogin(password)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/30 dark:bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400/30 dark:bg-pink-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      <Card className="w-full max-w-md mx-4 shadow-2xl border-0 glass relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mb-2 shadow-xl relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <LogIn className="w-10 h-10 text-white relative z-10" />
            <Sparkles className="w-4 h-4 text-white absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-4xl font-bold text-gradient mb-2">
              Kiro-Go
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              管理面板登录
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="请输入管理员密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 text-base border-2 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200 btn-scale"
              disabled={loading || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  登录
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
