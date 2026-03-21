"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
var server_1 = require("@/lib/supabase/server");
var navigation_1 = require("next/navigation");
var badge_1 = require("@/components/ui/badge");
var card_1 = require("@/components/ui/card");
var empty_1 = require("@/components/ui/empty");
var lucide_react_1 = require("lucide-react");
var server_user_1 = require("@/lib/auth/server-user");
var link_1 = require("next/link");
var button_1 = require("@/components/ui/button");
function DashboardPage() {
    return __awaiter(this, void 0, void 0, function () {
        var user, supabase, trades, totalTrades, completed, wins, losses, winRate, avgScore, bestSetup, profitFactor, hasTrades;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, server_user_1.getAuthenticatedUser)()];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        (0, navigation_1.redirect)('/auth/login');
                    }
                    return [4 /*yield*/, (0, server_1.createClient)()];
                case 2:
                    supabase = _a.sent();
                    return [4 /*yield*/, supabase
                            .from('trades')
                            .select('*')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: false })
                            .limit(100)];
                case 3:
                    trades = (_a.sent()).data;
                    totalTrades = (trades === null || trades === void 0 ? void 0 : trades.length) || 0;
                    completed = (trades || []).filter(function (trade) { return trade.result && trade.result !== 'pending'; });
                    wins = completed.filter(function (trade) { return trade.result === 'win'; }).length;
                    losses = completed.filter(function (trade) { return trade.result === 'loss'; }).length;
                    winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;
                    avgScore = totalTrades > 0
                        ? Math.round(((trades || []).reduce(function (acc, trade) { return acc + (trade.score || 0); }, 0) / totalTrades) * 10) / 10
                        : 0;
                    bestSetup = (trades || []).reduce(function (best, trade) {
                        if ((trade.score || 0) > (best.score || 0))
                            return trade;
                        return best;
                    }, { pair: '-', score: 0 });
                    profitFactor = losses === 0 ? (wins > 0 ? '∞' : '0.00') : (wins / losses).toFixed(2);
                    hasTrades = totalTrades > 0;
                    return [2 /*return*/, (<div className="page-wrap overflow-auto">
      <section className="page-hero px-6 py-7 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(121,164,255,0.16),transparent_26%),radial-gradient(circle_at_20%_22%,rgba(96,228,187,0.1),transparent_22%)]"/>
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-primary">
              <lucide_react_1.Activity className="h-3.5 w-3.5"/>
              Daily Command View
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your trading process, summarized in one clean view.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Review your edge, spot discipline drift early, and keep your best setups visible without clutter.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[460px]">
            <Snapshot label="Completed" value={String(completed.length)}/>
            <Snapshot label="Wins" value={String(wins)}/>
            <Snapshot label="Losses" value={String(losses)}/>
          </div>
        </div>
      </section>

      {hasTrades ? (<>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <MetricCard title="Win Rate" value={"".concat(winRate, "%")} tone="profit"/>
            <MetricCard title="Profit Factor" value={profitFactor}/>
            <MetricCard title="Total Trades" value={String(totalTrades)}/>
            <MetricCard title="Best Setup" value={"".concat(bestSetup.pair, " (").concat(bestSetup.score || 0, "/10)")} compact/>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <card_1.Card className="glass-panel">
              <card_1.CardHeader className="pb-2">
                <card_1.CardTitle className="flex items-center gap-2 text-sm"><lucide_react_1.BarChart3 className="h-4 w-4"/> AI Market Bias</card_1.CardTitle>
                <card_1.CardDescription>Contextual signals that help reinforce selective execution.</card_1.CardDescription>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Bias updates live in Trade → AI Analysis mode.</p>
                <div className="flex flex-wrap gap-2">
                  <badge_1.Badge variant="outline">Gold: Dynamic</badge_1.Badge>
                  <badge_1.Badge variant="outline">Indices: Dynamic</badge_1.Badge>
                  <badge_1.Badge variant="outline">Confidence: Dynamic</badge_1.Badge>
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card className="glass-panel">
              <card_1.CardHeader className="pb-2">
                <card_1.CardTitle className="flex items-center gap-2 text-sm"><lucide_react_1.AlertTriangle className="h-4 w-4"/> Alerts</card_1.CardTitle>
                <card_1.CardDescription>Important risk notes and trade-quality pressure points.</card_1.CardDescription>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>High-impact events and macro conflicts are shown in AI Analysis.</p>
                <p>Average checklist score this cycle: <span className="text-foreground font-medium">{avgScore}/10</span></p>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card className="glass-panel">
              <card_1.CardHeader className="pb-2">
                <card_1.CardTitle className="flex items-center gap-2 text-sm"><lucide_react_1.Target className="h-4 w-4"/> Today’s Plan</card_1.CardTitle>
                <card_1.CardDescription>Simple guardrails that keep quality ahead of activity.</card_1.CardDescription>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Session focus: London / New York overlap.</p>
                <p>Plan: only A/B setups with macro alignment.</p>
                <p className="flex items-center gap-2"><lucide_react_1.ShieldAlert className="h-4 w-4"/> Avoid entries near high-impact releases.</p>
              </card_1.CardContent>
            </card_1.Card>
          </div>

          <card_1.Card className="glass-panel overflow-hidden">
            <card_1.CardHeader className="border-b border-white/8 pb-4">
              <card_1.CardTitle className="flex items-center gap-2 text-base">
                <lucide_react_1.TrendingUp className="h-4 w-4 text-primary"/>
                Process Readout
              </card_1.CardTitle>
              <card_1.CardDescription>TradeOS is strongest when your score, context, and execution stay aligned.</card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent className="grid gap-4 pt-6 md:grid-cols-3">
              <Insight title="Stay selective" body="A-grade setups deserve more attention than more volume."/>
              <Insight title="Protect timing" body="Average quality matters less if you keep forcing early entries."/>
              <Insight title="Review weekly" body="Use the calendar and journal together so behavior trends stay visible."/>
            </card_1.CardContent>
          </card_1.Card>
        </>) : (<card_1.Card className="glass-panel overflow-hidden">
          <card_1.CardContent className="p-8 sm:p-10">
            <empty_1.Empty className="border-white/8 bg-white/3">
              <empty_1.EmptyHeader>
                <empty_1.EmptyMedia variant="icon" className="bg-white/6 text-primary">
                  <lucide_react_1.Sparkles className="h-5 w-5"/>
                </empty_1.EmptyMedia>
                <empty_1.EmptyTitle>Start with your first logged trade</empty_1.EmptyTitle>
                <empty_1.EmptyDescription>
                  Once trades are logged, this command view will surface your win rate, process quality, macro context, and weekly review signals.
                </empty_1.EmptyDescription>
              </empty_1.EmptyHeader>
              <div className="flex flex-col gap-3 sm:flex-row">
                <link_1.default href="/dashboard/trade">
                  <button_1.Button className="gap-2">
                    Open Trade Workspace
                    <lucide_react_1.ArrowRight className="h-4 w-4"/>
                  </button_1.Button>
                </link_1.default>
                <link_1.default href="/dashboard/journal">
                  <button_1.Button variant="outline">Review Journal Layout</button_1.Button>
                </link_1.default>
              </div>
            </empty_1.Empty>
          </card_1.CardContent>
        </card_1.Card>)}
    </div>)];
            }
        });
    });
}
function MetricCard(_a) {
    var title = _a.title, value = _a.value, tone = _a.tone, _b = _a.compact, compact = _b === void 0 ? false : _b;
    return (<card_1.Card className="glass-panel">
      <card_1.CardHeader className="pb-2">
        <card_1.CardTitle className="text-sm text-muted-foreground">{title}</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="flex items-center justify-between gap-3">
          <p className={"font-semibold tracking-tight ".concat(compact ? 'text-lg' : 'text-3xl', " ").concat(tone === 'profit' ? 'text-profit' : 'text-foreground')}>
            {value}
          </p>
          <div className="rounded-2xl bg-white/6 p-2 text-muted-foreground">
            <lucide_react_1.ArrowUpRight className="h-4 w-4"/>
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
function Snapshot(_a) {
    var label = _a.label, value = _a.value;
    return (<div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>);
}
function Insight(_a) {
    var title = _a.title, body = _a.body;
    return (<div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>);
}
