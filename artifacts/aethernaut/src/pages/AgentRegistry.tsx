import { useState } from "react";
import { useListAgents, useRegisterAgent, getListAgentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, ChevronRight } from "lucide-react";
import { truncateAddress, statusColor, formatAgo } from "@/lib/format";

const CAPABILITIES = ["arbitrage", "mev-resistance", "liquidity-provision", "governance-vote", "regulatory-adapt", "cross-chain"];

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-400",
    in_coalition: "bg-primary",
    idle: "bg-yellow-400",
    offline: "bg-muted-foreground",
  };
  const glow: Record<string, string> = {
    active: "0 0 6px hsl(142 76% 36%)",
    in_coalition: "0 0 6px hsl(185 100% 50%)",
    idle: "",
    offline: "",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full shrink-0 ${colors[status] || "bg-muted-foreground"}`}
      style={{ boxShadow: glow[status] || "" }}
    />
  );
}

function RegisterAgentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const registerAgent = useRegisterAgent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function toggle(cap: string) {
    setSelected(s => s.includes(cap) ? s.filter(c => c !== cap) : [...s, cap]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !address || selected.length === 0) return;
    registerAgent.mutate(
      { data: { name, address, capabilities: selected } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
          toast({ title: "Agent registered", description: `${name} joined the mesh network` });
          setOpen(false);
          setName(""); setAddress(""); setSelected([]);
        },
        onError: () => toast({ title: "Error", description: "Failed to register agent", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-register-agent" className="gap-2">
          <Plus className="h-4 w-4" /> Register Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary glow-text-cyan">Register New Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input id="agent-name" data-testid="input-agent-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nexus-Prime" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="agent-address">Injective Address</Label>
            <Input id="agent-address" data-testid="input-agent-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="inj1..." className="mt-1 font-mono text-sm" />
          </div>
          <div>
            <Label>Capabilities</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CAPABILITIES.map(cap => (
                <button
                  key={cap}
                  type="button"
                  data-testid={`cap-${cap}`}
                  onClick={() => toggle(cap)}
                  className={`px-2 py-1 rounded border text-xs font-mono transition-all ${selected.includes(cap) ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={registerAgent.isPending} data-testid="button-submit-agent">
            {registerAgent.isPending ? "Registering..." : "Register Agent"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentRegistry() {
  const { data: agents, isLoading } = useListAgents();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight glow-text-cyan text-primary">Agent Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">ERC-8004 identities on the Injective mesh</p>
        </div>
        <RegisterAgentDialog />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-2" data-testid="agents-list">
          {(agents || []).map(agent => (
            <Link key={agent.id} href={`/agents/${agent.id}`}>
              <Card className="cursor-pointer hover:border-primary/40 transition-all hover:bg-accent/30" data-testid={`card-agent-${agent.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted/50 shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{agent.name}</span>
                      <StatusDot status={agent.status} />
                      <span className={`text-xs capitalize ${statusColor(agent.status)}`}>{agent.status.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-xs text-muted-foreground">{truncateAddress(agent.address)}</span>
                      <span className="text-xs text-muted-foreground">Depth: <span className="font-mono text-foreground">{agent.genomicDepth.toLocaleString()}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-primary">{agent.reputationScore.toFixed(1)}</div>
                      <div className="text-[10px] text-muted-foreground">Reputation</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">{agent.tasksCompleted}</div>
                      <div className="text-[10px] text-muted-foreground">Tasks</div>
                    </div>
                    <div className="flex flex-wrap gap-1 max-w-40">
                      {(agent.capabilities as string[] || []).slice(0, 2).map(cap => (
                        <Badge key={cap} variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 text-primary/80">{cap}</Badge>
                      ))}
                      {(agent.capabilities as string[] || []).length > 2 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{(agent.capabilities as string[]).length - 2}</Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!agents || agents.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">No agents registered yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
