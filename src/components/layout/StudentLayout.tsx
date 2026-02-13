import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Gamepad2, 
  ClipboardList, 
  Trophy, 
  BarChart3, 
  User,
  Target,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { XPBadge, CoinBadge, StreakBadge } from '@/components/game/GameBadges';
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
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/student/dashboard' },
  // { icon: Gamepad2, label: 'Game World', href: '/student/game' },
  { icon: ClipboardList, label: 'My Tests', href: '/student/tests' },
  { icon: Target, label: 'Weak Areas', href: '/student/weak-tests' },
  // { icon: Trophy, label: 'Leaderboard', href: '/student/leaderboard' },
  { icon: BarChart3, label: 'Analytics', href: '/student/analytics' },
  { icon: User, label: 'Profile', href: '/student/profile' },
];

function StudentSidebarContent() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/student/dashboard" className="flex items-center gap-3">
          <img 
            src="/favicon.ico" 
            alt="Logo" 
            className="w-10 h-10 rounded-xl shrink-0 object-contain" 
          />
          <span className="font-game font-bold text-lg text-sidebar-foreground">Gamify IAS</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-game-pipe to-game-pipe-dark flex items-center justify-center shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white font-bold text-lg">{user?.full_name?.charAt(0) || 'S'}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="font-medium text-sidebar-foreground truncate">{user?.full_name || 'Student'}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Navigation</SidebarGroupLabel>
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

function StudentSidebar() {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <StudentSidebarContent />
    </Sidebar>
  );
}

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {/* <XPBadge xp={0} level={1} size="sm" /> */}
                {/* <CoinBadge coins={0} size="sm" />
                <StreakBadge days={0} size="sm" /> */}
            </div>
          </header>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
