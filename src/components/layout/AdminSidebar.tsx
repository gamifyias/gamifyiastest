import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User,
  BookOpen, 
  FileQuestion, 
  ClipboardList, 
  Users, 
  BarChart3, 
  Shield, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  UserCog,
  Bell,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const adminItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: User, label: 'Profile', href: '/admin/profile' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: UserCog, label: 'Roles', href: '/admin/roles' },
  { icon: BookOpen, label: 'Subjects', href: '/admin/subjects' },
  { icon: Layers, label: 'Topics', href: '/admin/topics' },
  { icon: ClipboardList, label: 'Tests', href: '/admin/tests' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Shield, label: 'Anti-Cheat Logs', href: '/admin/anti-cheat-logs' },
  { icon: Settings, label: 'Profile', href: '/admin/profile' },
];

const mentorItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/mentor/dashboard' },
  { icon: BookOpen, label: 'Subjects', href: '/mentor/subjects' },
  { icon: Layers, label: 'Topics', href: '/mentor/topics' },
  { icon: FileQuestion, label: 'Questions', href: '/mentor/questions' },
  { icon: ClipboardList, label: 'Tests', href: '/mentor/tests' },
  { icon: Users, label: 'Assignments', href: '/mentor/assignments' },
  { icon: BarChart3, label: 'Analytics', href: '/mentor/analytics' },
  { icon: Shield, label: 'Anti-Cheat Logs', href: '/mentor/anti-cheat-logs' },
];

interface AdminSidebarProps {
  role: 'admin' | 'mentor';
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const items = role === 'admin' ? adminItems : mentorItems;

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to={`/${role}/dashboard`} className="flex items-center gap-2">
            <img 
              src="/favicon.ico" 
              alt="Logo" 
              className="w-10 h-10 rounded-xl shrink-0 object-contain" 
            />
            <span className="font-game font-bold text-sidebar-foreground">Gamify IAS</span>
          </Link>
        )}  
        <Button 
          variant="adminGhost" 
          size="iconSm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "mx-auto")}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {items.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={20} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sidebar-accent-foreground font-medium">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                  {user?.role || 'Role'}
                </p>
              </div>
              <Button variant="adminGhost" size="iconSm">
                <Bell size={16} />
              </Button>
            </div>
            <Button 
              variant="adminOutline" 
              size="sm" 
              className="w-full"
              onClick={() => logout()}
            >
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Button variant="adminGhost" size="iconSm">
              <Bell size={16} />
            </Button>
            <Button 
              variant="adminGhost" 
              size="iconSm"
              onClick={() => logout()}
            >
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
