import { useState } from "react";
import { useListAgents, useComputeResonance } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Waves, CheckCircle, XCircle, Zap } from "lucide-react";

const DIM_LABELS: Record<string, string> = {
  transactionEntropy: "Transaction Entropy",
  liquidityConsistency: "Liquidity Consistency",
  crossChainBreadth: "Cross-Chain Breadth",
  governanceQuality: "Governance Quality",
  mevSustainability: "MEV Sustainability",
  socialCoherence: "Social Coherence",
};

const DIM_COLORS: Record<string, string> = {
  transactionEntropy: "bg-primary",
  liquidityConsistency: "bg-green-400",
  crossChainBreadth: "bg-violet-400",
  governanceQuality: "bg-yellow-400",
  mevSustainability: "bg-orange-400",
  socialCoherence: "bg-cyan-400",
};

export default function BehavioralLab() {
  const [agentAId, setAgentAId] = useState("");
  const [agentBId, setAgentBId] = useState("");
  const computeResonance = useComputeResonance();
  const { data: agents } = useListAgents();
  const { toast } = useToast();

  function handleCompute() {
    if (!agentAId || !agentBId) return;
    computeResonance.mutate(
      { data: { agentAId, agentBId } },
      { onError: () => toast({ title: "Error computing resonance", variant: "destructive" }) }
    );
  }

  const result = computeResonance.data;
  const agentA = (agents || []).find(a => a.id === agentAId);
  const agentB = (agents || []).find(a => a.id === agentBId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight glow-text-cyan text-primary flex items-center gap-3">
          <FlaskConical className="h-7 w-7" /> Behavioral Lab
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compute behavioral resonance — cosine similarity in 128-dimensional behavioral space
        </p>
      </div>

      {/* Formula card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="font-mono text-xs text-primary space-y-1">
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-2">Resonance Communication Condition (L0.3)</div>
            <div>Comm(A,B) iff ∃f : RF(A,f) &gt; 0 AND RF(B,f) &gt; 0</div>
            <div className="mt-2">TRUST(i,j,t) = Σ_k [w_k · sim(BHV_i(k,t), BHV_j(k,t))]</div>
          </div>
        </CardContent>
      </Card>

      {/* Agent selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Waves className="h-4 w-4 text-primary" /> Select Agents to Probe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Agent A</Label>
              <Select value={agentAId} onValueChange={setAgentAId}>
                <SelectTrigger data-testid="select-agent-a" className="mt-1">
                  <SelectValue placeholder="Select Agent A" />
                </SelectTrigger>
                <SelectContent>
                  {(agents || []).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">rep:{a.reputationScore.toFixed(0)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Agent B</Label>
              <Select value={agentBId} onValueChange={setAgentBId}>
                <SelectTrigger data-testid="select-agent-b" className="mt-1">
                  <SelectValue placeholder="Select Agent B" />
                </SelectTrigger>
                <SelectContent>
                  {(agents || []).filter(a => a.id !== agentAId).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">rep:{a.reputationScore.toFixed(0)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleCompute}
            disabled={!agentAId || !agentBId || computeResonance.isPending}
            className="gap-2"
            data-testid="button-compute-resonance"
          >
            <Zap className="h-4 w-4" />
            {computeResonance.isPending ? "Computing..." : "Compute Resonance"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="resonance-result">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Resonance Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold font-mono text-primary">
                  {(result.resonanceScore * 100).toFixed(1)}%
                </div>
                <div>
                  {result.canCommunicate ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Can Communicate</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-400">
                      <XCircle className="h-5 w-5" />
                      <span className="font-semibold">Cannot Communicate</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {result.sharedFrequencies} shared behavioral frequencies
                  </div>
                </div>
              </div>

              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${result.resonanceScore * 100}%`,
                    background: result.resonanceScore > 0.7
                      ? "hsl(185 100% 50%)"
                      : result.resonanceScore > 0.4
                        ? "hsl(45 100% 50%)"
                        : "hsl(0 80% 50%)",
                    boxShadow: result.resonanceScore > 0.7 ? "0 0 8px hsl(185 100% 50% / 0.6)" : "",
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="font-medium">{agentA?.name || "Agent A"}</div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {result.resonanceScore > 0.7 ? "HIGH RESONANCE" : result.resonanceScore > 0.4 ? "PARTIAL RESONANCE" : "LOW RESONANCE"}
                </Badge>
                <div className="font-medium">{agentB?.name || "Agent B"}</div>
              </div>
            </CardContent>
          </Card>

          {result.dimensionScores && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Dimension Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" data-testid="dimension-scores">
                {Object.entries(result.dimensionScores).map(([dim, score]) => (
                  <div key={dim} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{DIM_LABELS[dim] || dim}</span>
                      <span className="font-mono">{((score as number) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${DIM_COLORS[dim] || "bg-primary"}`}
                        style={{ width: `${(score as number) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !computeResonance.isPending && (
        <div className="text-center py-12 text-muted-foreground">
          <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select two agents and compute their behavioral resonance</p>
          <p className="text-xs mt-1">Resonance is computed via cosine similarity in 128-dimensional behavioral space</p>
        </div>
      )}
    </div>
  );
}
