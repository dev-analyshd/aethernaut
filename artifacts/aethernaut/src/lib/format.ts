export function truncateHash(hash: string, start = 8, end = 6): string {
  if (!hash || hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function truncateAddress(address: string): string {
  if (!address || address.length <= 16) return address;
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

export function formatReward(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null) return "—";
  return (value * 100).toFixed(1) + "%";
}

export function formatAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: "text-green-400",
    in_coalition: "text-primary",
    idle: "text-yellow-400",
    offline: "text-muted-foreground",
    forming: "text-yellow-400",
    executing: "text-primary",
    dissolved: "text-muted-foreground",
    timed_out: "text-destructive",
    pending: "text-yellow-400",
    assigned: "text-primary",
    completed: "text-green-400",
    failed: "text-destructive",
    silenced: "text-muted-foreground",
  };
  return map[status] || "text-foreground";
}

export function priorityColor(p: string): string {
  const map: Record<string, string> = {
    critical: "text-red-400 border-red-400/30 bg-red-400/10",
    high: "text-orange-400 border-orange-400/30 bg-orange-400/10",
    medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    low: "text-muted-foreground border-border bg-muted/30",
  };
  return map[p] || "";
}
