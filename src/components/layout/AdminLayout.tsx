import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Users,
  Shield,
  BookOpen,
  Layers,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  Settings,
  LogOut,
  GraduationCap,
  FileQuestion
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Users, label: 'User Management', href: '/admin/users' },
  { icon: BookOpen, label: 'Subjects', href: '/admin/subjects' },
  { icon: Layers, label: 'Topics', href: '/admin/topics' },
  { icon: FileQuestion, label: 'Questions', href: '/admin/questions' },
  { icon: ClipboardList, label: 'Tests', href: '/admin/tests' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: BarChart3, label: 'Activity', href: '/admin/activity' },
  { icon: AlertTriangle, label: 'Anti-Cheat Logs', href: '/admin/anti-cheat-logs' },
  { icon: Settings, label: 'Profile', href: '/admin/profile' },
];

const mentorNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/mentor/dashboard' },
  { icon: BookOpen, label: 'Subjects', href: '/mentor/subjects' },
  { icon: Layers, label: 'Topics', href: '/mentor/topics' },
  { icon: FileQuestion, label: 'Questions', href: '/mentor/questions' },
  { icon: ClipboardList, label: 'Tests', href: '/mentor/tests' },
  { icon: GraduationCap, label: 'Assignments', href: '/mentor/assignments' },
  { icon: BarChart3, label: 'Analytics', href: '/mentor/analytics' },
  { icon: AlertTriangle, label: 'Anti-Cheat Logs', href: '/mentor/anti-cheat-logs' },
];

interface AdminSidebarContentProps {
  role: 'admin' | 'mentor';
}

function AdminSidebarContent({ role }: AdminSidebarContentProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navItems = role === 'admin' ? adminNavItems : mentorNavItems;

  return (
    <>
{/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to={`/${role}/dashboard`} className="flex items-center gap-3">
          <img 
            src="/favicon.ico" 
            alt="Logo" 
            className="w-10 h-10 rounded-xl shrink-0 object-contain shadow-md" 
          />
          <div>
            <span className="font-game font-bold text-lg text-sidebar-foreground block">Gamify IAS</span>
            <span className="text-xs text-sidebar-foreground/60 capitalize">{role} Panel</span>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            role === 'admin' 
              ? "bg-gradient-to-br from-game-boss to-purple-800" 
              : "bg-gradient-to-br from-secondary to-secondary/80"
          )}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white font-bold">{user?.full_name?.charAt(0) || role.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="font-medium text-sidebar-foreground truncate">{user?.full_name || role}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
          </div>
        </div>
      </div>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link 
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive 
                            ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
        >
          <LogOut size={20} />
          <span className="ml-3">Sign Out</span>
        </Button>
      </div>
    </>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
  role: 'admin' | 'mentor';
}

export function AdminLayout({ children, role }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-admin-gradient">
        <Sidebar className="border-r border-sidebar-border bg-sidebar">
          <AdminSidebarContent role={role} />
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-40 h-14 border-b border-sidebar-border bg-sidebar/95 backdrop-blur flex items-center px-4 gap-4">
            <SidebarTrigger className="text-sidebar-foreground" />
            <div className="flex-1" />
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
