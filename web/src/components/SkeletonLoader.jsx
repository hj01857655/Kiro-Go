import { Card, CardContent } from './ui/card'

export function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-5 bg-gray-200 rounded w-16" />
              <div className="h-5 bg-gray-200 rounded w-16" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-64" />
            <div className="flex gap-4">
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-2 bg-gray-200 rounded-full w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonStats() {
  return (
    <Card className="animate-pulse">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
