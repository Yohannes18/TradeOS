import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardPageSkeleton({
  metrics = 4,
  detailColumns = 3,
}: {
  metrics?: number
  detailColumns?: number
}) {
  return (
    <div className="page-wrap overflow-auto">
      <section className="page-hero px-6 py-7 sm:px-8">
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-10 w-full max-w-[540px]" />
            <Skeleton className="h-5 w-full max-w-[680px]" />
            <Skeleton className="h-5 w-full max-w-[520px]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[460px]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="stat-tile">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-3 h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={`grid grid-cols-1 gap-4 ${metrics === 5 ? 'sm:grid-cols-2 xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {Array.from({ length: metrics }).map((_, index) => (
          <Card key={index} className="glass-panel interactive-panel">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${detailColumns === 2 ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
        {Array.from({ length: detailColumns }).map((_, index) => (
          <Card key={index} className="glass-panel interactive-panel">
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full max-w-[280px]" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[78%]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel interactive-panel overflow-hidden">
        <CardHeader className="border-b border-white/8 pb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-full max-w-[420px]" />
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="stat-tile space-y-3 p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[88%]" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function TradeWorkspaceSkeleton() {
  return (
    <div className="page-wrap h-full overflow-hidden">
      <section className="page-hero px-5 py-5 sm:px-6">
        <div className="relative space-y-3">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-full max-w-[560px]" />
          <Skeleton className="h-4 w-full max-w-[640px]" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/8 bg-white/4 p-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-32 rounded-2xl" />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[28px] border border-white/8 bg-white/3 p-1">
        <div className="grid h-full gap-4 p-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="glass-panel interactive-panel">
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-full max-w-[360px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="stat-tile space-y-3 p-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="glass-panel interactive-panel">
              <CardHeader className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full max-w-[280px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[360px] w-full rounded-[24px]" />
              </CardContent>
            </Card>

            <Card className="glass-panel interactive-panel">
              <CardContent className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="stat-tile space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalendarPageSkeleton() {
  return (
    <div className="page-wrap grid grid-cols-1 overflow-auto xl:grid-cols-3">
      <Card className="glass-panel interactive-panel xl:col-span-2">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <Skeleton className="h-10 w-40 rounded-2xl" />
              <Skeleton className="h-10 w-10 rounded-2xl" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </CardContent>
      </Card>

      <Card className="glass-panel interactive-panel">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
          <div className="stat-tile space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function JournalPageSkeleton() {
  return (
    <div className="page-wrap overflow-auto">
      <section className="page-hero px-6 py-6 sm:px-7">
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-9 w-full max-w-[540px]" />
            <Skeleton className="h-4 w-full max-w-[620px]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[430px]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="stat-tile">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="glass-panel interactive-panel">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="stat-tile space-y-3 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[82%]" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel interactive-panel">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-[360px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-24 rounded-2xl" />
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="stat-tile">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-7 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-[24px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
