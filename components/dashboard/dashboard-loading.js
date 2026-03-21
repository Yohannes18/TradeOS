"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPageSkeleton = DashboardPageSkeleton;
exports.TradeWorkspaceSkeleton = TradeWorkspaceSkeleton;
exports.CalendarPageSkeleton = CalendarPageSkeleton;
exports.JournalPageSkeleton = JournalPageSkeleton;
var card_1 = require("@/components/ui/card");
var skeleton_1 = require("@/components/ui/skeleton");
function DashboardPageSkeleton(_a) {
    var _b = _a.metrics, metrics = _b === void 0 ? 4 : _b, _c = _a.detailColumns, detailColumns = _c === void 0 ? 3 : _c;
    return (<div className="page-wrap overflow-auto">
      <section className="page-hero px-6 py-7 sm:px-8">
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <skeleton_1.Skeleton className="h-7 w-36 rounded-full"/>
            <skeleton_1.Skeleton className="h-10 w-full max-w-[540px]"/>
            <skeleton_1.Skeleton className="h-5 w-full max-w-[680px]"/>
            <skeleton_1.Skeleton className="h-5 w-full max-w-[520px]"/>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[460px]">
            {Array.from({ length: 3 }).map(function (_, index) { return (<div key={index} className="stat-tile">
                <skeleton_1.Skeleton className="h-3 w-16"/>
                <skeleton_1.Skeleton className="mt-3 h-8 w-20"/>
              </div>); })}
          </div>
        </div>
      </section>

      <div className={"grid grid-cols-1 gap-4 ".concat(metrics === 5 ? 'sm:grid-cols-2 xl:grid-cols-5' : 'lg:grid-cols-4')}>
        {Array.from({ length: metrics }).map(function (_, index) { return (<card_1.Card key={index} className="glass-panel interactive-panel">
            <card_1.CardHeader className="pb-2">
              <skeleton_1.Skeleton className="h-4 w-24"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <skeleton_1.Skeleton className="h-9 w-28"/>
            </card_1.CardContent>
          </card_1.Card>); })}
      </div>

      <div className={"grid grid-cols-1 gap-4 ".concat(detailColumns === 2 ? 'xl:grid-cols-2' : 'xl:grid-cols-3')}>
        {Array.from({ length: detailColumns }).map(function (_, index) { return (<card_1.Card key={index} className="glass-panel interactive-panel">
            <card_1.CardHeader className="space-y-2 pb-2">
              <skeleton_1.Skeleton className="h-5 w-32"/>
              <skeleton_1.Skeleton className="h-4 w-full max-w-[280px]"/>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-3">
              <skeleton_1.Skeleton className="h-4 w-full"/>
              <skeleton_1.Skeleton className="h-4 w-[92%]"/>
              <skeleton_1.Skeleton className="h-4 w-[78%]"/>
            </card_1.CardContent>
          </card_1.Card>); })}
      </div>

      <card_1.Card className="glass-panel interactive-panel overflow-hidden">
        <card_1.CardHeader className="border-b border-white/8 pb-4">
          <skeleton_1.Skeleton className="h-5 w-40"/>
          <skeleton_1.Skeleton className="mt-2 h-4 w-full max-w-[420px]"/>
        </card_1.CardHeader>
        <card_1.CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map(function (_, index) { return (<div key={index} className="stat-tile space-y-3 p-4">
              <skeleton_1.Skeleton className="h-4 w-28"/>
              <skeleton_1.Skeleton className="h-4 w-full"/>
              <skeleton_1.Skeleton className="h-4 w-[88%]"/>
            </div>); })}
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
function TradeWorkspaceSkeleton() {
    return (<div className="page-wrap h-full overflow-hidden">
      <section className="page-hero px-5 py-5 sm:px-6">
        <div className="relative space-y-3">
          <skeleton_1.Skeleton className="h-4 w-32 rounded-full"/>
          <skeleton_1.Skeleton className="h-8 w-full max-w-[560px]"/>
          <skeleton_1.Skeleton className="h-4 w-full max-w-[640px]"/>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/8 bg-white/4 p-2">
        {Array.from({ length: 3 }).map(function (_, index) { return (<skeleton_1.Skeleton key={index} className="h-10 w-32 rounded-2xl"/>); })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[28px] border border-white/8 bg-white/3 p-1">
        <div className="grid h-full gap-4 p-4 xl:grid-cols-[0.95fr_1.05fr]">
          <card_1.Card className="glass-panel interactive-panel">
            <card_1.CardHeader className="space-y-3">
              <skeleton_1.Skeleton className="h-6 w-44"/>
              <skeleton_1.Skeleton className="h-4 w-full max-w-[360px]"/>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              {Array.from({ length: 3 }).map(function (_, index) { return (<div key={index} className="stat-tile space-y-3 p-4">
                  <skeleton_1.Skeleton className="h-4 w-36"/>
                  <skeleton_1.Skeleton className="h-10 w-full"/>
                  <skeleton_1.Skeleton className="h-10 w-full"/>
                </div>); })}
            </card_1.CardContent>
          </card_1.Card>

          <div className="space-y-4">
            <card_1.Card className="glass-panel interactive-panel">
              <card_1.CardHeader className="space-y-3">
                <skeleton_1.Skeleton className="h-6 w-40"/>
                <skeleton_1.Skeleton className="h-4 w-full max-w-[280px]"/>
              </card_1.CardHeader>
              <card_1.CardContent>
                <skeleton_1.Skeleton className="h-[360px] w-full rounded-[24px]"/>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card className="glass-panel interactive-panel">
              <card_1.CardContent className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map(function (_, index) { return (<div key={index} className="stat-tile space-y-3">
                    <skeleton_1.Skeleton className="h-4 w-24"/>
                    <skeleton_1.Skeleton className="h-8 w-20"/>
                  </div>); })}
              </card_1.CardContent>
            </card_1.Card>
          </div>
        </div>
      </div>
    </div>);
}
function CalendarPageSkeleton() {
    return (<div className="page-wrap grid grid-cols-1 overflow-auto xl:grid-cols-3">
      <card_1.Card className="glass-panel interactive-panel xl:col-span-2">
        <card_1.CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <skeleton_1.Skeleton className="h-6 w-52"/>
              <skeleton_1.Skeleton className="h-4 w-64"/>
            </div>
            <div className="flex gap-2">
              <skeleton_1.Skeleton className="h-10 w-10 rounded-2xl"/>
              <skeleton_1.Skeleton className="h-10 w-40 rounded-2xl"/>
              <skeleton_1.Skeleton className="h-10 w-10 rounded-2xl"/>
            </div>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map(function (_, index) { return (<skeleton_1.Skeleton key={index} className="h-28 rounded-2xl"/>); })}
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card className="glass-panel interactive-panel">
        <card_1.CardHeader className="space-y-2">
          <skeleton_1.Skeleton className="h-6 w-28"/>
          <skeleton_1.Skeleton className="h-4 w-48"/>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          {Array.from({ length: 6 }).map(function (_, index) { return (<skeleton_1.Skeleton key={index} className="h-4 w-full"/>); })}
          <div className="stat-tile space-y-3">
            <skeleton_1.Skeleton className="h-4 w-40"/>
            <skeleton_1.Skeleton className="h-4 w-full"/>
            <skeleton_1.Skeleton className="h-4 w-[85%]"/>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
function JournalPageSkeleton() {
    return (<div className="page-wrap overflow-auto">
      <section className="page-hero px-6 py-6 sm:px-7">
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <skeleton_1.Skeleton className="h-4 w-32 rounded-full"/>
            <skeleton_1.Skeleton className="h-9 w-full max-w-[540px]"/>
            <skeleton_1.Skeleton className="h-4 w-full max-w-[620px]"/>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[430px]">
            {Array.from({ length: 3 }).map(function (_, index) { return (<div key={index} className="stat-tile">
                <skeleton_1.Skeleton className="h-3 w-20"/>
                <skeleton_1.Skeleton className="mt-3 h-8 w-24"/>
              </div>); })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <card_1.Card className="glass-panel interactive-panel">
          <card_1.CardContent className="space-y-3 p-4">
            {Array.from({ length: 6 }).map(function (_, index) { return (<div key={index} className="stat-tile space-y-3 p-4">
                <skeleton_1.Skeleton className="h-4 w-32"/>
                <skeleton_1.Skeleton className="h-4 w-full"/>
                <skeleton_1.Skeleton className="h-4 w-[82%]"/>
              </div>); })}
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card className="glass-panel interactive-panel">
          <card_1.CardHeader className="space-y-2">
            <skeleton_1.Skeleton className="h-6 w-40"/>
            <skeleton_1.Skeleton className="h-4 w-full max-w-[360px]"/>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map(function (_, index) { return (<skeleton_1.Skeleton key={index} className="h-10 w-24 rounded-2xl"/>); })}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map(function (_, index) { return (<div key={index} className="stat-tile">
                  <skeleton_1.Skeleton className="h-3 w-20"/>
                  <skeleton_1.Skeleton className="mt-3 h-7 w-24"/>
                </div>); })}
            </div>
            <skeleton_1.Skeleton className="h-48 w-full rounded-[24px]"/>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </div>);
}
