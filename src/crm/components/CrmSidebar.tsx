import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Users, GraduationCap, Wallet, CalendarDays,
  ClipboardCheck, Award, Receipt, BarChart3, FileSpreadsheet, MessageSquare,
  Settings, GraduationCap as GradIcon,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useCrmAuth } from "../hooks/useCrmAuth";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: string;
  adminOnly?: boolean;
};

const main: NavItem[] = [
  { title: "Dashboard", url: "/crm", icon: LayoutDashboard, exact: true },
  { title: "Courses", url: "/crm/courses", icon: BookOpen },
  { title: "Enquiries", url: "/crm/enquiries", icon: Users },
  { title: "Students", url: "/crm/students", icon: GraduationCap },
];

const ops: NavItem[] = [
  { title: "Fees", url: "/crm/fees", icon: Wallet },
  { title: "Batches", url: "/crm/batches", icon: CalendarDays },
  { title: "Attendance", url: "/crm/attendance", icon: ClipboardCheck },
  { title: "Certificates", url: "/crm/certificates", icon: Award, badge: "Soon" },
  { title: "Expenses", url: "/crm/expenses", icon: Receipt, adminOnly: true },
];

const tools: NavItem[] = [
  { title: "WhatsApp Templates", url: "/crm/whatsapp", icon: MessageSquare },
  { title: "Reports", url: "/crm/reports", icon: BarChart3 },
  { title: "Import / Export", url: "/crm/import-export", icon: FileSpreadsheet },
  { title: "Settings", url: "/crm/settings", icon: Settings, adminOnly: true },
];

export function CrmSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin } = useCrmAuth();

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
            {!collapsed && item.badge && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
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
      </SidebarContent>
    </Sidebar>
  );
}
