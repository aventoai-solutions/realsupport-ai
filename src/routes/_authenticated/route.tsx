import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bot, Inbox, MessagesSquare, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading console...
      </div>
    );
  }

  const navItem = (to: string, label: string, Icon: typeof Inbox) => {
    const active = pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-primary/15 text-foreground"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        }`}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface/70 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-display text-sm font-bold">
            <Bot className="size-4 text-primary" />
            Nova Support Console
          </Link>
          <nav className="flex items-center gap-1">
            {navItem("/chat", "Live chat", MessagesSquare)}
            {navItem("/leads", "Lead inbox", Inbox)}
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
