import { useGetNetworkStats, useGetNetworkActivity, useGetLosarRoutes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Activity, Bot, GitBranch, CheckSquare, DollarSign, TrendingUp, Radio, Zap } from "lucide-react";
import { formatReward, formatScore, formatAgo, statusColor } from "@/lib/format";

const ACTIVITY_ICONS: Record<string, string> = {
  agent_registered: "BOT",
  coalition_formed: "LINK",
  coalition_dissolved: "DSLV",
  task_completed: "DONE",
  task_silenced: "SLNC",
  trust_milestone: "TRST",
  genomic_evolution: "DNA",
};

const ACTIVITY_COLORS: Record<string, string> = {
  agent_registered: "text-green-400",
  coalition_formed: "text-primary",
  coalition_dissolved: "text-muted-foreground",
  task_completed: "text-green-400",
  task_silenced: "text-yellow-400",
  trust_milestone: "text-violet-400",
  genomic_evolution: "text-cyan-400",
};

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`rounded-md p-2 bg-muted/50 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
          <div className="text-xl font-bold font-mono">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function NetworkOverview() {
  const { data: stats, isLoading: statsLoading } = useGetNetworkStats();
  const { data: activity, isLoading: activityLoading } = useGetNetworkActivity();
  const { data: losar, isLoading: losarLoading } = useGetLosarRoutes();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight glow-text-cyan text-primary">Network Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time AETHERNAUT mesh status</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : stats ? (
          <>
            <StatCard icon={Bot} label="Total Agents" value={stats.totalAgents} sub={`${stats.activeAgents} active`} />
            <StatCard icon={GitBranch} label="Active Coalitions" value={stats.activeCoalitions} color="text-violet-400" />
            <StatCard icon={CheckSquare} label="Tasks Completed" value={stats.totalTasksCompleted} color="text-green-400" />
            <StatCard icon={DollarSign} label="Reward Distributed" value={formatReward(stats.totalRewardDistributed)} color="text-yellow-400" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Coherence */}
        {!statsLoading && stats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" /> Network Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Network Coherence</span>
                  <span className="font-mono">{formatScore(stats.networkCoherence)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(stats.networkCoherence || 0) * 100}%`, boxShadow: "0 0 8px hsl(185 100% 50% / 0.6)" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Avg Trust Score</span>
                  <span className="font-mono">{formatScore(stats.averageTrustScore)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(stats.averageTrustScore || 0) * 100}%` }} />
                </div>
              </div>
              {/* Agents by Capability */}
              {stats.agentsByCapability && stats.agentsByCapability.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Capabilities</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={stats.agentsByCapability} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                      <XAxis dataKey="capability" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 11 }} />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {(stats.agentsByCapability || []).map((_, i) => (
                          <Cell key={i} fill={i % 2 === 0 ? "hsl(185 100% 50% / 0.8)" : "hsl(275 80% 60% / 0.8)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Live Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1" data-testid="activity-feed">
                {(activity || []).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <span className={`text-[10px] font-mono font-bold w-10 shrink-0 ${ACTIVITY_COLORS[event.eventType] || "text-muted-foreground"}`}>
                      {ACTIVITY_ICONS[event.eventType] || "EVT"}
                    </span>
                    <span className="text-xs text-foreground flex-1 truncate">{event.description}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatAgo(event.timestamp)}</span>
                  </div>
                ))}
                {(!activity || activity.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LOSAR Routes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" /> LOSAR — Liquidity Ocean Score for Agent Routing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {losarLoading ? <Skeleton className="h-24" /> : (
            <div className="space-y-2" data-testid="losar-routes">
              {(losar || []).map((r) => (
                <div key={r.route} className="flex items-center gap-4 py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-xs text-foreground whitespace-nowrap">{r.route}</span>
                    {r.isOptimal && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30 shrink-0">OPTIMAL</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-primary">{(r.losarScore * 100).toFixed(1)}</div>
                      <div className="text-[10px] text-muted-foreground">LOSAR</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono">{(r.sybildResistance * 100).toFixed(0)}%</div>
                      <div className="text-[10px] text-muted-foreground">Sybil Resist</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-mono ${r.manipulationScore > 0.15 ? "text-red-400" : "text-green-400"}`}>
                        {(r.manipulationScore * 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">MF Score</div>
                    </div>
                    <div className="w-20">
                      <div className="h-1 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${r.losarScore * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
