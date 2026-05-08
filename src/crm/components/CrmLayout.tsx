import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, Moon, Sun, ExternalLink } from "lucide-react";
import { CrmGlobalSearch } from "./CrmGlobalSearch";
import { CrmSidebar } from "./CrmSidebar";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { useEffect, useState } from "react";

export function CrmLayout() {
  const { user, hasAccess, loading, signOut, role } = useCrmAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/crm/login" replace />;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-heading font-bold">No CRM access</h1>
          <p className="text-muted-foreground text-sm">
            Your account is signed in but has not been granted a CRM role yet.
            Please ask an admin to add you as <b>admin</b> or <b>counsellor</b>.
          </p>
          <p className="text-xs text-muted-foreground">Signed in as: {user.email}</p>
          <Button variant="outline" onClick={async () => { await signOut(); navigate("/crm/login"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CrmSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center px-3 gap-2 sticky top-0 z-40">
            <SidebarTrigger />
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm text-muted-foreground w-72">
              <Search className="w-4 h-4" />
              <span className="text-xs">Search students, courses... (coming soon)</span>
            </div>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" asChild title="Open public site">
              <a href="/" target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" title="Notifications">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="hidden sm:flex flex-col items-end leading-tight pl-2">
              <span className="text-xs font-medium truncate max-w-[160px]">{user.email}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate("/crm/login"); }} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
