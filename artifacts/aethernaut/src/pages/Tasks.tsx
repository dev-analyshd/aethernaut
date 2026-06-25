import { useState } from "react";
import { useListTasks, useCreateTask, getListTasksQueryKey, TaskInputTaskType, TaskInputPriority } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Plus, ArrowRight, VolumeX } from "lucide-react";
import { statusColor, priorityColor, formatReward, formatAgo } from "@/lib/format";

const TASK_TYPES = ["cross-chain-arbitrage", "liquidity-migration", "mev-resistance", "governance-vote", "regulatory-adapt"];
const PRIORITIES = ["low", "medium", "high", "critical"];

function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState("");
  const [priority, setPriority] = useState("medium");
  const [route, setRoute] = useState("");
  const [reward, setReward] = useState("");
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTask.mutate(
      { data: { name, taskType: taskType as TaskInputTaskType, priority: priority as TaskInputPriority, route: route || undefined, estimatedReward: reward ? Number(reward) : undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task created" });
          setOpen(false); setName(""); setTaskType(""); setPriority("medium"); setRoute(""); setReward("");
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-create-task" className="gap-2">
          <Plus className="h-4 w-4" /> Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary glow-text-cyan">Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="task-name">Task Name</Label>
            <Input id="task-name" data-testid="input-task-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. INJ-ATOM Triangular Arb" className="mt-1" />
          </div>
          <div>
            <Label>Task Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger data-testid="select-task-type" className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="select-priority" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="task-route">Route (optional)</Label>
            <Input id="task-route" data-testid="input-task-route" value={route} onChange={e => setRoute(e.target.value)} placeholder="INJ→ATOM→OSMO→INJ" className="mt-1 font-mono" />
          </div>
          <div>
            <Label htmlFor="task-reward">Estimated Reward USD (optional)</Label>
            <Input id="task-reward" data-testid="input-task-reward" type="number" value={reward} onChange={e => setReward(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={!name || !taskType || createTask.isPending} data-testid="button-submit-task">
            {createTask.isPending ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  silenced: VolumeX,
};

export default function Tasks() {
  const { data: tasks, isLoading } = useListTasks();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight glow-text-cyan text-primary">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Coalition execution queue</p>
        </div>
        <CreateTaskDialog />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="space-y-2" data-testid="tasks-list">
          {(tasks || []).map(task => {
            const StatusIcon = STATUS_ICONS[task.status] || CheckSquare;
            return (
              <Card key={task.id} className="hover:border-primary/30 transition-all" data-testid={`card-task-${task.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <StatusIcon className={`h-5 w-5 shrink-0 ${statusColor(task.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{task.name}</span>
                      <Badge className={`text-[9px] px-1.5 py-0 border ${priorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{task.taskType}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className={`capitalize font-medium ${statusColor(task.status)}`}>{task.status}</span>
                      {task.route && (
                        <span className="flex items-center gap-1 font-mono">
                          <ArrowRight className="h-3 w-3" />{task.route}
                        </span>
                      )}
                      {task.silenceReason && (
                        <span className="text-yellow-400 truncate max-w-xs">{task.silenceReason}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-mono text-green-400">{task.actualReward != null ? formatReward(task.actualReward) : task.estimatedReward != null ? `~${formatReward(task.estimatedReward)}` : "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{task.actualReward != null ? "earned" : "estimated"}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">{formatAgo(task.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!tasks || tasks.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">No tasks yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
