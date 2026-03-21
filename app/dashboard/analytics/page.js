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
exports.default = AnalyticsPage;
var server_1 = require("@/lib/supabase/server");
var navigation_1 = require("next/navigation");
var card_1 = require("@/components/ui/card");
var empty_1 = require("@/components/ui/empty");
var session_1 = require("@/lib/session");
var server_user_1 = require("@/lib/auth/server-user");
var lucide_react_1 = require("lucide-react");
var link_1 = require("next/link");
var button_1 = require("@/components/ui/button");
function AnalyticsPage() {
    return __awaiter(this, void 0, void 0, function () {
        var user, supabase, trades, list, getEffectiveScore, getSessionKey, hasMistake, completed, wins, losses, breakeven, winRate, avgRR, avgRRValue, expectancy, profitFactor, byScore, scoreWinRate, london, ny, asia, againstBiasLosses, earlyEntryLosses, mistakeTaggedTrades, hasCompletedTrades;
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
                            .limit(300)];
                case 3:
                    trades = (_a.sent()).data;
                    list = trades || [];
                    getEffectiveScore = function (trade) {
                        var _a;
                        var checklistScore = trade.checklist_score;
                        var score = trade.score;
                        return (_a = checklistScore !== null && checklistScore !== void 0 ? checklistScore : score) !== null && _a !== void 0 ? _a : 0;
                    };
                    getSessionKey = function (trade) {
                        var _a, _b;
                        return (0, session_1.normalizeSessionValue)((_a = trade.session) !== null && _a !== void 0 ? _a : null, (_b = trade.notes) !== null && _b !== void 0 ? _b : null);
                    };
                    hasMistake = function (trade) {
                        var mistake = trade.mistake;
                        if (Array.isArray(mistake) && mistake.length > 0)
                            return true;
                        return String(trade.notes || '').toLowerCase().includes('mistake');
                    };
                    completed = list.filter(function (trade) { return trade.result && trade.result !== 'pending'; });
                    wins = completed.filter(function (trade) { return trade.result === 'win'; }).length;
                    losses = completed.filter(function (trade) { return trade.result === 'loss'; }).length;
                    breakeven = completed.filter(function (trade) { return trade.result === 'breakeven'; }).length;
                    winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;
                    avgRR = list
                        .map(function (trade) {
                        if (typeof trade.rr === 'number' && !Number.isNaN(trade.rr))
                            return trade.rr;
                        if (!trade.entry || !trade.sl || !trade.tp)
                            return null;
                        var risk = Math.abs(trade.entry - trade.sl);
                        var reward = Math.abs(trade.tp - trade.entry);
                        if (!risk)
                            return null;
                        return reward / risk;
                    })
                        .filter(function (value) { return value !== null; });
                    avgRRValue = avgRR.length > 0 ? (avgRR.reduce(function (acc, v) { return acc + v; }, 0) / avgRR.length).toFixed(2) : '0.00';
                    expectancy = completed.length > 0 ? ((wins - losses) / completed.length).toFixed(2) : '0.00';
                    profitFactor = losses === 0 ? (wins > 0 ? '∞' : '0.00') : (wins / losses).toFixed(2);
                    byScore = {
                        a: completed.filter(function (trade) {
                            var setupGrade = trade.setup_grade;
                            return setupGrade ? setupGrade === 'A' : getEffectiveScore(trade) >= 8;
                        }),
                        b: completed.filter(function (trade) {
                            var setupGrade = trade.setup_grade;
                            if (setupGrade)
                                return setupGrade === 'B';
                            var score = getEffectiveScore(trade);
                            return score >= 6 && score < 8;
                        }),
                        c: completed.filter(function (trade) {
                            var setupGrade = trade.setup_grade;
                            if (setupGrade)
                                return setupGrade === 'C';
                            var score = getEffectiveScore(trade);
                            return score >= 4 && score < 6;
                        }),
                    };
                    scoreWinRate = function (items) {
                        if (items.length === 0)
                            return 0;
                        return Math.round((items.filter(function (trade) { return trade.result === 'win'; }).length / items.length) * 100);
                    };
                    london = completed.filter(function (trade) { return getSessionKey(trade) === 'london'; });
                    ny = completed.filter(function (trade) { return getSessionKey(trade) === 'ny'; });
                    asia = completed.filter(function (trade) { return getSessionKey(trade) === 'asia'; });
                    againstBiasLosses = completed.filter(function (trade) {
                        if (trade.result !== 'loss')
                            return false;
                        var notes = (trade.notes || '').toLowerCase();
                        return notes.includes('against bias') || notes.includes('counter trend');
                    }).length;
                    earlyEntryLosses = completed.filter(function (trade) {
                        if (trade.result !== 'loss')
                            return false;
                        var notes = (trade.notes || '').toLowerCase();
                        return notes.includes('early') || notes.includes('chase');
                    }).length;
                    mistakeTaggedTrades = completed.filter(function (trade) { return hasMistake(trade); }).length;
                    hasCompletedTrades = completed.length > 0;
                    return [2 /*return*/, (<div className="page-wrap overflow-auto">
            <section className="page-hero px-6 py-7 sm:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(108,158,255,0.14),transparent_24%),radial-gradient(circle_at_24%_20%,rgba(95,230,184,0.1),transparent_22%)]"/>
                <div className="relative">
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">Analytics</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Sharper feedback for your trading behavior.</h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                        These metrics turn journal entries into pattern recognition so you can improve quality, timing, and session selection.
                    </p>
                </div>
            </section>

            {hasCompletedTrades ? (<>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <MetricCard title="Win Rate" value={"".concat(winRate, "%")}/>
                        <MetricCard title="Expectancy" value={expectancy}/>
                        <MetricCard title="Avg RR" value={"1:".concat(avgRRValue)}/>
                        <MetricCard title="Profit Factor" value={profitFactor}/>
                        <MetricCard title="Completed" value={String(completed.length)}/>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <card_1.Card className="glass-panel">
                            <card_1.CardHeader className="pb-2">
                                <card_1.CardTitle className="text-sm">Win Rate by Score</card_1.CardTitle>
                                <card_1.CardDescription>Quality should beat quantity over time.</card_1.CardDescription>
                            </card_1.CardHeader>
                            <card_1.CardContent className="space-y-4 text-sm text-muted-foreground">
                                <BarRow label="A Setups" value={scoreWinRate(byScore.a)}/>
                                <BarRow label="B Setups" value={scoreWinRate(byScore.b)}/>
                                <BarRow label="C Setups" value={scoreWinRate(byScore.c)}/>
                            </card_1.CardContent>
                        </card_1.Card>

                        <card_1.Card className="glass-panel">
                            <card_1.CardHeader className="pb-2">
                                <card_1.CardTitle className="text-sm">Win Rate by Session</card_1.CardTitle>
                                <card_1.CardDescription>Time-of-day edge matters more than frequency.</card_1.CardDescription>
                            </card_1.CardHeader>
                            <card_1.CardContent className="space-y-4 text-sm text-muted-foreground">
                                <BarRow label={session_1.SESSION_LABELS.london} value={scoreWinRate(london)}/>
                                <BarRow label={session_1.SESSION_LABELS.ny} value={scoreWinRate(ny)}/>
                                <BarRow label={session_1.SESSION_LABELS.asia} value={scoreWinRate(asia)}/>
                            </card_1.CardContent>
                        </card_1.Card>

                        <card_1.Card className="glass-panel">
                            <card_1.CardHeader className="pb-2">
                                <card_1.CardTitle className="text-sm">Mistake Analysis</card_1.CardTitle>
                                <card_1.CardDescription>Execution leaks that deserve immediate attention.</card_1.CardDescription>
                            </card_1.CardHeader>
                            <card_1.CardContent className="space-y-3 text-sm text-muted-foreground">
                                <p>Early entry losses: <span className="font-medium text-foreground">{earlyEntryLosses}</span></p>
                                <p>Against bias losses: <span className="font-medium text-foreground">{againstBiasLosses}</span></p>
                                <p>Mistake-tagged trades: <span className="font-medium text-foreground">{mistakeTaggedTrades}</span></p>
                                <p>Breakeven trades: <span className="font-medium text-foreground">{breakeven}</span></p>
                            </card_1.CardContent>
                        </card_1.Card>
                    </div>

                    <card_1.Card className="glass-panel">
                        <card_1.CardHeader className="pb-2">
                            <card_1.CardTitle className="text-sm">AI Insights</card_1.CardTitle>
                            <card_1.CardDescription>High-level readouts to guide your next review cycle.</card_1.CardDescription>
                        </card_1.CardHeader>
                        <card_1.CardContent className="grid gap-4 md:grid-cols-3">
                            <InsightCard text="You perform best when score is high and context aligns with execution."/>
                            <InsightCard text="A-setups currently outperform B/C setups, so selectivity is paying off."/>
                            <InsightCard text="Loss clusters around early timing and bias conflicts point to discipline drift."/>
                        </card_1.CardContent>
                    </card_1.Card>
                </>) : (<card_1.Card className="glass-panel">
                    <card_1.CardContent className="p-8 sm:p-10">
                        <empty_1.Empty className="border-white/8 bg-white/3">
                            <empty_1.EmptyHeader>
                                <empty_1.EmptyMedia variant="icon" className="bg-white/6 text-primary">
                                    <lucide_react_1.BarChart3 className="h-5 w-5"/>
                                </empty_1.EmptyMedia>
                                <empty_1.EmptyTitle>Analytics will unlock after completed trades</empty_1.EmptyTitle>
                                <empty_1.EmptyDescription>
                                    Once you have a few closed trades, this page will show session edge, setup quality, expectancy, and the mistakes that need attention.
                                </empty_1.EmptyDescription>
                            </empty_1.EmptyHeader>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <link_1.default href="/dashboard/trade">
                                    <button_1.Button className="gap-2">
                                        Log a Trade
                                        <lucide_react_1.ArrowRight className="h-4 w-4"/>
                                    </button_1.Button>
                                </link_1.default>
                                <link_1.default href="/dashboard/calendar">
                                    <button_1.Button variant="outline">Open Calendar</button_1.Button>
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
    var title = _a.title, value = _a.value;
    return (<card_1.Card className="glass-panel">
            <card_1.CardHeader className="pb-2">
                <card_1.CardTitle className="text-sm text-muted-foreground">{title}</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
                <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            </card_1.CardContent>
        </card_1.Card>);
}
function BarRow(_a) {
    var label = _a.label, value = _a.value;
    return (<div>
            <div className="mb-2 flex items-center justify-between text-xs">
                <span>{label}</span>
                <span className="text-foreground">{value}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(112,157,255,1),rgba(123,230,198,1))]" style={{ width: "".concat(Math.max(0, Math.min(100, value)), "%") }}/>
            </div>
        </div>);
}
function InsightCard(_a) {
    var text = _a.text;
    return (<div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-6 text-muted-foreground">
            {text}
        </div>);
}
