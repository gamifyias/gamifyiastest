import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  TrendingUp,
  UserCheck,
  UserX,
  GraduationCap,
  Shield
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  pendingUsers: number;
  students: number;
  mentors: number;
  subjects: number;
  tests: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingUsers: 0,
    students: 0,
    mentors: 0,
    subjects: 0,
    tests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user role counts
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role');

      const roleCounts = roles?.reduce((acc, { role }) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Fetch subjects count
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true });

      // Fetch tests count
      const { count: testsCount } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: roles?.length || 0,
        pendingUsers: roleCounts['pending'] || 0,
        students: roleCounts['student'] || 0,
        mentors: roleCounts['mentor'] || 0,
        subjects: subjectsCount || 0,
        tests: testsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'from-blue-500 to-blue-600' },
    { icon: UserX, label: 'Pending Approval', value: stats.pendingUsers, color: 'from-orange-500 to-orange-600' },
    { icon: GraduationCap, label: 'Students', value: stats.students, color: 'from-green-500 to-green-600' },
    { icon: Shield, label: 'Mentors', value: stats.mentors, color: 'from-purple-500 to-purple-600' },
    { icon: BookOpen, label: 'Subjects', value: stats.subjects, color: 'from-cyan-500 to-cyan-600' },
    { icon: ClipboardList, label: 'Tests', value: stats.tests, color: 'from-pink-500 to-pink-600' },
  ];

  return (
    <AdminLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-sidebar-foreground">Admin Dashboard</h1>
          <p className="text-sidebar-foreground/60 mt-1">Manage your test system</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} variant="admin" className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-sidebar-foreground">
                  {isLoading ? '...' : stat.value}
                </div>
                <div className="text-xs text-sidebar-foreground/60">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card variant="admin">
            <CardHeader>
              <CardTitle className="text-sidebar-foreground flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.pendingUsers > 0 ? (
                <p className="text-sidebar-foreground/80">
                  You have <span className="text-game-gold font-bold">{stats.pendingUsers}</span> users waiting for role assignment.
                </p>
              ) : (
                <p className="text-sidebar-foreground/60">No pending approvals</p>
              )}
            </CardContent>
          </Card>

          <Card variant="admin">
            <CardHeader>
              <CardTitle className="text-sidebar-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sidebar-foreground/80">
                All systems operational. Database connected.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
