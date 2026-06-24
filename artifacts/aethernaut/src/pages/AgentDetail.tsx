import { useRoute } from "wouter";
import {
  useGetAgent, getGetAgentQueryKey,
  useGetAgentGenomicKey, getGetAgentGenomicKeyQueryKey,
  useGetAgentBehavioralHistory, getGetAgentBehavioralHistoryQueryKey,
  useGetAgentTrustScore, getGetAgentTrustScoreQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { truncateAddress, truncateHash, formatAgo, statusColor } from "@/lib/format";
import { ShieldCheck, Dna, Activity, Star } from "lucide-react";

const DIM_LABELS: Record<string, string> = {
  transactionEntropy: "Tx Entropy",
  liquidityConsistency: "Liquidity",
  crossChainBreadth: "Cross-chain",
  governanceQuality: "Governance",
  mevSustainability: "MEV",
  socialCoherence: "Social",
};

const EVENT_COLORS: Record<string, string> = {
  SWAP: "text-primary",
  TRANSFER: "text-blue-400",
  LIQUIDITY: "text-green-400",
  STAKE: "text-violet-400",
  GOVERNANCE: "text-yellow-400",
  COALITION_JOIN: "text-cyan-400",
  COALITION_EXIT: "text-orange-400",
  TASK_COMPLETE: "text-green-400",
  MEV_RESIST: "text-red-400",
  ARBITRAGE: "text-primary",
};

export default function AgentDetail() {
  const [, params] = useRoute("/agents/:id");
  const id = params?.id || "";

  const { data: agent, isLoading } = useGetAgent(id, { query: { enabled: !!id, queryKey: getGetAgentQueryKey(id) } });
  const { data: agk } = useGetAgentGenomicKey(id, { query: { enabled: !!id, queryKey: getGetAgentGenomicKeyQueryKey(id) } });
  const { data: history } = useGetAgentBehavioralHistory(id, { query: { enabled: !!id, queryKey: getGetAgentBehavioralHistoryQueryKey(id) } });
  const { data: trust } = useGetAgentTrustScore(id, { query: { enabled: !!id, queryKey: getGetAgentTrustScoreQueryKey(id) } });

  if (isLoading) return <div className="p-6"><Skeleton className="h-40" /></div>;
  if (!agent) return <div className="p-6 text-muted-foreground">Agent not found.</div>;

  const radarData = trust?.dimensions
    ? Object.entries(trust.dimensions).map(([k, v]) => ({ dim: DIM_LABELS[k] || k, value: Math.round((v as number) * 100) }))
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-xl font-bold text-primary">{agent.name[0]}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold glow-text-cyan text-primary">{agent.name}</h1>
            <Badge variant="outline" className={`capitalize ${statusColor(agent.status)} border-current/30`}>
              {agent.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="font-mono text-sm text-muted-foreground mt-1">{agent.address}</div>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span>Joined {formatAgo(agent.createdAt)}</span>
            <span>Last active {formatAgo(agent.lastActiveAt)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono text-primary">{agent.reputationScore.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Reputation Score</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Genomic Depth", value: agent.genomicDepth.toLocaleString(), icon: Dna, color: "text-cyan-400" },
          { label: "Coalitions Formed", value: agent.coalitionsFormed, icon: Star, color: "text-violet-400" },
          { label: "Tasks Completed", value: agent.tasksCompleted, icon: Activity, color: "text-green-400" },
          { label: "Resonance Threshold", value: `${((agent.resonanceThreshold || 0) * 100).toFixed(0)}%`, icon: ShieldCheck, color: "text-primary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <div className="text-lg font-bold font-mono">{value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genomic Key */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Dna className="h-4 w-4 text-cyan-400" /> Agent Genomic Key (AGK)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agk ? (
              <>
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">CURRENT HASH</div>
                    <div className="font-mono text-xs bg-muted/50 rounded p-2 text-primary break-all">{agk.currentHash}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">SENSE STRAND (SHA3-256 + 0x00)</div>
                    <div className="font-mono text-[10px] bg-muted/50 rounded p-2 text-green-400 break-all">{truncateHash(agk.senseStrand, 16, 8)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">ANTISENSE STRAND (SHA3-256 + 0xFF)</div>
                    <div className="font-mono text-[10px] bg-muted/50 rounded p-2 text-violet-400 break-all">{truncateHash(agk.antisenseStrand, 16, 8)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Evolution Depth</span>
                  <span className="font-mono text-sm font-bold text-primary">{agk.depth.toLocaleString()} blocks</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Verification</span>
                  <Badge className={agk.isVerified ? "bg-green-400/20 text-green-400 border-green-400/30" : "bg-red-400/20 text-red-400 border-red-400/30"}>
                    {agk.isVerified ? "VERIFIED" : "UNVERIFIED"}
                  </Badge>
                </div>
              </>
            ) : <Skeleton className="h-32" />}
          </CardContent>
        </Card>

        {/* Trust Profile Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Trust Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trust ? (
              <>
                <div className="text-center mb-2">
                  <span className="text-2xl font-bold font-mono text-primary">{((trust.overallTrust || 0) * 100).toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground ml-2">Overall Trust</span>
                </div>
                {radarData.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <Radar dataKey="value" stroke="hsl(185 100% 50%)" fill="hsl(185 100% 50% / 0.2)" strokeWidth={1.5} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
                {trust.topTrustedAgents?.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Top Trusted Agents</div>
                    {trust.topTrustedAgents.map(pair => (
                      <div key={pair.agentId} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 truncate">{pair.agentName}</span>
                        <Progress value={(pair.score || 0) * 100} className="flex-1 h-1" />
                        <span className="text-xs font-mono w-10 text-right">{((pair.score || 0) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : <Skeleton className="h-48" />}
          </CardContent>
        </Card>
      </div>

      {/* Behavioral History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Behavioral Event History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-64 overflow-y-auto" data-testid="behavioral-history">
            {(history || []).map(evt => (
              <div key={evt.id} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                <span className={`text-[10px] font-mono font-bold w-20 shrink-0 ${EVENT_COLORS[evt.eventType] || "text-muted-foreground"}`}>
                  {evt.eventType}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">#{evt.blockNumber.toLocaleString()}</span>
                <span className="font-mono text-[10px] text-muted-foreground flex-1 truncate">{truncateHash(evt.behavioralHash, 10, 6)}</span>
                {evt.entropyScore != null && (
                  <span className="text-[10px] text-muted-foreground shrink-0">entropy: <span className="text-foreground">{(evt.entropyScore * 100).toFixed(0)}%</span></span>
                )}
                {evt.manipulationFingerprintDetected && (
                  <Badge className="text-[9px] bg-red-400/20 text-red-400 border-red-400/30 px-1">MF</Badge>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0">{formatAgo(evt.timestamp)}</span>
              </div>
            ))}
            {(!history || history.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No behavioral events recorded.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
