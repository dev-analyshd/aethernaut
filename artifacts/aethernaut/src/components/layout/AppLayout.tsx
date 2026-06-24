import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, Bot, GitBranch, Network, FlaskConical, CheckSquare, Cpu } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: Network, label: "Network" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/coalitions", icon: GitBranch, label: "Coalitions" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/behavioral", icon: FlaskConical, label: "Behavioral Lab" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
          <Cpu className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 6px hsl(185 100% 50% / 0.8))" }} />
          <div>
            <div className="text-sm font-bold tracking-widest text-primary glow-text-cyan">AETHERNAUT</div>
            <div className="text-[10px] text-muted-foreground tracking-widest">MESH v0.1.0</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 rounded px-3 py-2 text-sm cursor-pointer transition-all",
                    active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                  <span className="font-medium tracking-wide">{label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" style={{ boxShadow: "0 0 6px hsl(185 100% 50%)" }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-green-400" />
            <span className="text-[11px] text-muted-foreground">Network live</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">Block #19,482,041</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
