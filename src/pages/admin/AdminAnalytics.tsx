import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Award,
  BookOpen,
} from 'lucide-react';

interface OverviewStats {
  totalStudents: number;
  totalTests: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  flaggedAttempts: number;
}

interface TestPerformance {
  title: string;
  attempts: number;
  avgScore: number;
  passRate: number;
}

interface DailyAttempts {
  date: string;
  attempts: number;
  passed: number;
}

export default function AdminAnalytics() {
  const location = useLocation();
  const role = location.pathname.startsWith('/mentor') ? 'mentor' : 'admin';
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({
    totalStudents: 0,
    totalTests: 0,
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
    flaggedAttempts: 0,
  });
  const [testPerformance, setTestPerformance] = useState<TestPerformance[]>([]);
  const [dailyAttempts, setDailyAttempts] = useState<DailyAttempts[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; score: number; tests: number }[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch students count
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');
      
      const studentCount = roles?.length || 0;

      // Fetch tests
      const { data: tests } = await supabase.from('tests').select('id, title');
      const testCount = tests?.length || 0;

      // Fetch all attempts
      const { data: attempts } = await supabase
        .from('student_test_attempts')
        .select('*, tests(title), profiles!inner(full_name)')
        .in('status', ['submitted', 'auto_submitted']);

      const attemptCount = attempts?.length || 0;
      const passedCount = attempts?.filter(a => a.is_passed).length || 0;
      const flaggedCount = attempts?.filter(a => a.is_flagged).length || 0;
      const avgScore = attemptCount > 0 
        ? attempts!.reduce((sum, a) => sum + (a.percentage || 0), 0) / attemptCount 
        : 0;

      setStats({
        totalStudents: studentCount,
        totalTests: testCount,
        totalAttempts: attemptCount,
        avgScore: Math.round(avgScore),
        passRate: attemptCount > 0 ? Math.round((passedCount / attemptCount) * 100) : 0,
        flaggedAttempts: flaggedCount,
      });

      // Test performance data
      const testPerfMap: Record<string, { attempts: number; scores: number[]; passed: number }> = {};
      attempts?.forEach(a => {
        const title = a.tests?.title || 'Unknown';
        if (!testPerfMap[title]) {
          testPerfMap[title] = { attempts: 0, scores: [], passed: 0 };
        }
        testPerfMap[title].attempts++;
        testPerfMap[title].scores.push(a.percentage || 0);
        if (a.is_passed) testPerfMap[title].passed++;
      });

      const testPerf = Object.entries(testPerfMap).map(([title, data]) => ({
        title: title.length > 20 ? title.slice(0, 20) + '...' : title,
        attempts: data.attempts,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        passRate: Math.round((data.passed / data.attempts) * 100),
      })).slice(0, 10);
      setTestPerformance(testPerf);

      // Daily attempts (last 7 days)
      const dailyMap: Record<string, { attempts: number; passed: number }> = {};
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });
      
      last7Days.forEach(date => {
        dailyMap[date] = { attempts: 0, passed: 0 };
      });

      attempts?.forEach(a => {
        const date = (a.submitted_at || a.created_at).split('T')[0];
        if (dailyMap[date]) {
          dailyMap[date].attempts++;
          if (a.is_passed) dailyMap[date].passed++;
        }
      });

      setDailyAttempts(
        Object.entries(dailyMap).map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          ...data,
        }))
      );

      // Top students
      const studentMap: Record<string, { name: string; scores: number[]; tests: number }> = {};
      attempts?.forEach(a => {
        const name = (a as any).profiles?.full_name || 'Unknown';
        if (!studentMap[a.user_id]) {
          studentMap[a.user_id] = { name, scores: [], tests: 0 };
        }
        studentMap[a.user_id].scores.push(a.percentage || 0);
        studentMap[a.user_id].tests++;
      });

      const topStudentsList = Object.values(studentMap)
        .map(s => ({
          name: s.name,
          score: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
          tests: s.tests,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setTopStudents(topStudentsList);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['hsl(142, 70%, 45%)', 'hsl(45, 100%, 51%)', 'hsl(200, 85%, 60%)', 'hsl(0, 75%, 55%)'];

  if (isLoading) {
    return (
      <AdminLayout role={role}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout role={role}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-sidebar-foreground/70 mt-1">Overview of platform performance and student analytics</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-secondary" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{stats.totalStudents}</p>
                  <p className="text-xs text-sidebar-foreground/70">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{stats.totalTests}</p>
                  <p className="text-xs text-sidebar-foreground/70">Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{stats.totalAttempts}</p>
                  <p className="text-xs text-sidebar-foreground/70">Attempts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-game-gold" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{stats.avgScore}%</p>
                  <p className="text-xs text-sidebar-foreground/70">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{stats.passRate}%</p>
                  <p className="text-xs text-sidebar-foreground/70">Pass Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{stats.flaggedAttempts}</p>
                  <p className="text-xs text-sidebar-foreground/70">Flagged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Attempts */}
          <Card variant="admin">
            <CardHeader>
              <CardTitle className="text-lg text-sidebar-foreground">Daily Activity (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyAttempts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 25%)" />
                  <XAxis dataKey="date" stroke="hsl(220, 15%, 60%)" fontSize={12} />
                  <YAxis stroke="hsl(220, 15%, 60%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(225, 25%, 16%)',
                      border: '1px solid hsl(225, 20%, 25%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="attempts" fill="hsl(200, 85%, 60%)" name="Attempts" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="passed" fill="hsl(142, 70%, 45%)" name="Passed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Test Performance */}
          <Card variant="admin">
            <CardHeader>
              <CardTitle className="text-lg text-sidebar-foreground">Test Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {testPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={testPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 25%)" />
                    <XAxis type="number" stroke="hsl(220, 15%, 60%)" fontSize={12} domain={[0, 100]} />
                    <YAxis dataKey="title" type="category" stroke="hsl(220, 15%, 60%)" fontSize={10} width={100} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(225, 25%, 16%)',
                        border: '1px solid hsl(225, 20%, 25%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="avgScore" fill="hsl(45, 100%, 51%)" name="Avg Score %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sidebar-foreground/50">
                  No test data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Students */}
        <Card variant="admin">
          <CardHeader>
            <CardTitle className="text-lg text-sidebar-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-game-gold" />
              Top Performing Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStudents.length > 0 ? (
              <div className="space-y-3">
                {topStudents.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-sidebar-accent rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-game-gold text-foreground' :
                        index === 1 ? 'bg-muted-foreground/30 text-sidebar-foreground' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-sidebar-accent text-sidebar-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sidebar-foreground">{student.name}</p>
                        <p className="text-xs text-sidebar-foreground/70">{student.tests} tests taken</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{student.score}%</p>
                      <p className="text-xs text-sidebar-foreground/70">avg score</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sidebar-foreground/50">
                No student data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
