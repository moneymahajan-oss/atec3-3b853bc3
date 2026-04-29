import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, BookOpen, Users, GraduationCap, Wallet, CalendarDays,
  ClipboardCheck, Award, Receipt, BarChart3, FileSpreadsheet, MessageSquare,
  Settings, Megaphone, Search as SearchIcon, GraduationCap as GradIcon, BellRing, Ban,
  AlertTriangle,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useCrmAuth } from "../hooks/useCrmAuth";
import { loadAllReminderCounts } from "../lib/reminders";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: string | number;
  badgeTone?: "default" | "danger";
  adminOnly?: boolean;
};

const ops: NavItem[] = [
  { title: "Fees", url: "/crm/fees", icon: Wallet },
  { title: "Batches", url: "/crm/batches", icon: CalendarDays },
  { title: "Attendance", url: "/crm/attendance", icon: ClipboardCheck },
  { title: "Certificates", url: "/crm/certificates", icon: Award },
  { title: "Expenses", url: "/crm/expenses", icon: Receipt, adminOnly: true },
];

const tools: NavItem[] = [
  { title: "WhatsApp Templates", url: "/crm/whatsapp", icon: MessageSquare },
  { title: "Campaigns", url: "/crm/campaigns", icon: Megaphone },
  { title: "Reports", url: "/crm/reports", icon: BarChart3 },
  { title: "Voided / Cancelled", url: "/crm/voided", icon: Ban },
  { title: "Import / Export", url: "/crm/import-export", icon: FileSpreadsheet },
  { title: "SEO Meta", url: "/crm/seo", icon: SearchIcon, adminOnly: true },
  { title: "Enquiry Config", url: "/crm/enquiry-settings", icon: Settings, adminOnly: true },
];

const system: NavItem[] = [
  { title: "Danger Zone", url: "/crm/settings#danger-zone", icon: AlertTriangle, adminOnly: true, badge: "!", badgeTone: "danger" },
];

export function CrmSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin, hasAccess } = useCrmAuth();
  const [reminderTotal, setReminderTotal] = useState<number>(0);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    const load = async () => {
      try {
        const c = await loadAllReminderCounts();
        if (!cancelled) setReminderTotal(c.total);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000); // refresh every 5min
    return () => { cancelled = true; clearInterval(t); };
  }, [hasAccess, pathname]);

  const main: NavItem[] = [
    { title: "Dashboard", url: "/crm", icon: LayoutDashboard, exact: true },
    {
      title: "Reminders", url: "/crm/reminders", icon: BellRing,
      badge: reminderTotal > 0 ? reminderTotal : undefined,
      badgeTone: "danger",
    },
    { title: "Courses", url: "/crm/courses", icon: BookOpen },
    { title: "Enquiries", url: "/crm/enquiries", icon: Users },
    { title: "Students", url: "/crm/students", icon: GraduationCap },
  ];

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const renderItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
          <NavLink to={item.url} end={item.exact} className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="flex-1 truncate">{item.title}</span>
            )}
            {!collapsed && item.badge !== undefined && (
              <span className={
                "ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold " +
                (item.badgeTone === "danger"
                  ? "bg-rose-500 text-white"
                  : "bg-muted text-muted-foreground")
              }>
                {item.badge}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <GradIcon className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-heading font-bold text-sm">ATEC CRM</span>
              <span className="text-[10px] text-muted-foreground">Education Suite</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operations</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{ops.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Tools</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{tools.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-destructive">System</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{system.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
