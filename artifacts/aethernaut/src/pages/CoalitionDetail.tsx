import { useRoute } from "wouter";
import { useGetCoalition, getGetCoalitionQueryKey, useGetCoalitionMembers, getGetCoalitionMembersQueryKey, useGetCoherenceScore, getGetCoherenceScoreQueryKey, useDissolveCoalition, getListCoalitionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Users, Zap, ShieldAlert } from "lucide-react";
import { statusColor, formatReward, formatAgo } from "@/lib/format";

const PLANE_LABELS: Record<string, string> = {
  physical: "Physical",
  mental: "Mental",
  spiritual: "Spiritual",
  conscious: "Conscious",
  anima: "ANIMA",
};

const ROLE_COLORS: Record<string, string> = {
  seed: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  participant: "text-primary border-primary/30 bg-primary/10",
  validator: "text-violet-400 border-violet-400/30 bg-violet-400/10",
};

export default function CoalitionDetail() {
  const [, params] = useRoute("/coalitions/:id");
  const id = params?.id || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: coalition, isLoading } = useGetCoalition(id, { query: { enabled: !!id, queryKey: getGetCoalitionQueryKey(id) } });
  const { data: members } = useGetCoalitionMembers(id, { query: { enabled: !!id, queryKey: getGetCoalitionMembersQueryKey(id) } });
  const { data: coherence } = useGetCoherenceScore(id, { query: { enabled: !!id, queryKey: getGetCoherenceScoreQueryKey(id) } });
  const dissolve = useDissolveCoalition();

  function handleDissolve() {
    dissolve.mutate(
      { id } as never,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCoalitionQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListCoalitionsQueryKey() });
          toast({ title: "Coalition dissolved", description: "The coalition has been dissolved ephemerally." });
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-40" /></div>;
  if (!coalition) return <div className="p-6 text-muted-foreground">Coalition not found.</div>;

  const radarData = coherence?.planes
    ? Object.entries(coherence.planes).map(([k, v]) => ({ plane: PLANE_LABELS[k] || k, value: Math.round((v as number) * 100) }))
    : [];

  const canDissolve = coalition.status !== "dissolved" && coalition.status !== "timed_out";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-violet-400/10 border border-violet-400/20">
            <GitBranch className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-primary glow-text-cyan">{coalition.taskType}</h1>
              <Badge className={`capitalize ${statusColor(coalition.status)} border-current/30`}>
                {coalition.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1 font-mono">{id}</div>
            <div className="text-xs text-muted-foreground mt-1">Formed {formatAgo(coalition.createdAt)} · {coalition.valueSplit}</div>
          </div>
        </div>
        {canDissolve && (
          <Button variant="destructive" size="sm" onClick={handleDissolve} disabled={dissolve.isPending} data-testid="button-dissolve">
            <ShieldAlert className="h-4 w-4 mr-2" />
            {dissolve.isPending ? "Dissolving..." : "Dissolve Coalition"}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Members", value: `${coalition.memberCount}/${coalition.maxAgents}`, icon: Users },
          { label: "Formation Trust", value: `${((coalition.formationTrust || 0) * 100).toFixed(0)}%` },
          { label: "Coherence Score", value: coalition.coherenceScore != null ? `${(coalition.coherenceScore * 100).toFixed(0)}%` : "—" },
          { label: "Reward Distributed", value: formatReward(coalition.totalRewardDistributed) },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              {Icon && <Icon className="h-4 w-4 text-primary mb-1" />}
              <div className="text-lg font-bold font-mono">{value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Five-Plane Coherence */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" /> Five-Plane Coherence (5PC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coherence ? (
              <>
                <div className="flex items-center gap-3 mb-3 p-3 rounded border border-border bg-muted/30">
                  <div className="text-2xl font-bold font-mono text-primary">{(coherence.totalScore * 100).toFixed(1)}%</div>
                  <div>
                    <div className="text-xs text-muted-foreground">C_swarm vs Θ_swarm: <span className="font-mono text-foreground">{(coherence.threshold * 100).toFixed(1)}%</span></div>
                    <Badge className={coherence.isActionable ? "bg-green-400/20 text-green-400 border-green-400/30" : "bg-yellow-400/20 text-yellow-400 border-yellow-400/30"}>
                      {coherence.isActionable ? "ACTIONABLE" : "SILENCE"}
                    </Badge>
                  </div>
                </div>
                {radarData.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="plane" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Radar dataKey="value" stroke="hsl(275 80% 60%)" fill="hsl(275 80% 60% / 0.2)" strokeWidth={1.5} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
                <div className="space-y-2 mt-2">
                  {Object.entries(coherence.planes || {}).map(([plane, value]) => (
                    <div key={plane} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20 capitalize">{PLANE_LABELS[plane] || plane}</span>
                      <Progress value={(value as number) * 100} className="flex-1 h-1" />
                      <span className="text-xs font-mono w-10 text-right">{((value as number) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <Skeleton className="h-48" />}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Coalition Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="coalition-members">
              {(members || []).map(m => (
                <div key={m.agentId} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center text-sm font-bold text-primary">
                    {m.agentName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.agentName}</span>
                      <Badge className={`text-[9px] px-1.5 py-0 ${ROLE_COLORS[m.role] || ""}`}>{m.role.toUpperCase()}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">Contribution</span>
                      <Progress value={m.contribution * 100} className="w-20 h-1" />
                      <span className="text-[10px] font-mono">{(m.contribution * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-green-400">{formatReward(m.rewardShare)}</div>
                    <div className="text-[10px] text-muted-foreground">reward</div>
                  </div>
                </div>
              ))}
              {(!members || members.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No members yet — coalition still forming.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
