import { useState } from "react";
import { Link } from "wouter";
import { useListCoalitions, useFormCoalition, getListCoalitionsQueryKey, useListAgents } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Plus, ChevronRight, Users } from "lucide-react";
import { statusColor, formatAgo, formatReward } from "@/lib/format";

const TASK_TYPES = ["cross-chain-arbitrage", "liquidity-migration", "mev-resistance", "governance-vote", "regulatory-adapt"];
const VALUE_SPLITS = ["proportional-to-contribution", "equal", "reputation-weighted"];

const STATUS_COLORS: Record<string, string> = {
  forming: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  active: "border-green-400/30 bg-green-400/10 text-green-400",
  executing: "border-primary/30 bg-primary/10 text-primary",
  dissolved: "border-border bg-muted/30 text-muted-foreground",
  timed_out: "border-red-400/30 bg-red-400/10 text-red-400",
};

function FormCoalitionDialog() {
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState("");
  const [minAgents, setMinAgents] = useState("3");
  const [maxAgents, setMaxAgents] = useState("7");
  const [valueSplit, setValueSplit] = useState("proportional-to-contribution");
  const [seedAgentId, setSeedAgentId] = useState("");
  const formCoalition = useFormCoalition();
  const { data: agents } = useListAgents();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    formCoalition.mutate(
      { data: { taskType, minAgents: Number(minAgents), maxAgents: Number(maxAgents), valueSplit: valueSplit as never, seedAgentId: seedAgentId || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCoalitionsQueryKey() });
          toast({ title: "Coalition formed", description: `${taskType} coalition is now forming` });
          setOpen(false);
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-form-coalition" className="gap-2">
          <Plus className="h-4 w-4" /> Form Coalition
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary glow-text-cyan">Form Ephemeral Coalition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger data-testid="select-task-type" className="mt-1">
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="min-agents">Min Agents</Label>
              <Input id="min-agents" data-testid="input-min-agents" type="number" value={minAgents} onChange={e => setMinAgents(e.target.value)} min={2} max={10} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="max-agents">Max Agents</Label>
              <Input id="max-agents" data-testid="input-max-agents" type="number" value={maxAgents} onChange={e => setMaxAgents(e.target.value)} min={2} max={20} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Value Split</Label>
            <Select value={valueSplit} onValueChange={setValueSplit}>
              <SelectTrigger data-testid="select-value-split" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALUE_SPLITS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Seed Agent (optional)</Label>
            <Select value={seedAgentId} onValueChange={setSeedAgentId}>
              <SelectTrigger data-testid="select-seed-agent" className="mt-1">
                <SelectValue placeholder="Select seed agent" />
              </SelectTrigger>
              <SelectContent>
                {(agents || []).filter(a => a.status === "active" || a.status === "idle").map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={!taskType || formCoalition.isPending} data-testid="button-submit-coalition">
            {formCoalition.isPending ? "Forming..." : "Form Coalition"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Coalitions() {
  const { data: coalitions, isLoading } = useListCoalitions();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight glow-text-cyan text-primary">Coalitions</h1>
          <p className="text-sm text-muted-foreground mt-1">Ephemeral task-specific agent swarms</p>
        </div>
        <FormCoalitionDialog />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-2" data-testid="coalitions-list">
          {(coalitions || []).map(c => (
            <Link key={c.id} href={`/coalitions/${c.id}`}>
              <Card className="cursor-pointer hover:border-primary/40 transition-all hover:bg-accent/30" data-testid={`card-coalition-${c.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted/50 shrink-0">
                    <GitBranch className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{c.taskType}</span>
                      <Badge className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[c.status] || ""}`}>{c.status.replace("_", " ").toUpperCase()}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {c.memberCount}/{c.maxAgents} agents
                      </span>
                      <span className="text-xs text-muted-foreground">Trust: <span className="font-mono text-foreground">{((c.formationTrust || 0) * 100).toFixed(0)}%</span></span>
                      {c.coherenceScore != null && (
                        <span className="text-xs text-muted-foreground">5PC: <span className="font-mono text-foreground">{((c.coherenceScore) * 100).toFixed(0)}%</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    {c.totalRewardDistributed != null && (
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-green-400">{formatReward(c.totalRewardDistributed)}</div>
                        <div className="text-[10px] text-muted-foreground">Distributed</div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{formatAgo(c.createdAt)}</div>
                      {c.dissolvedAt && <div className="text-[10px] text-muted-foreground">Dissolved {formatAgo(c.dissolvedAt)}</div>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!coalitions || coalitions.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">No coalitions yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
