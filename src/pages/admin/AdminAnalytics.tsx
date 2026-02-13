import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
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
} from 'recharts';
import {
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Award,
  BookOpen,
  Search,
  User,
  Calendar
} from 'lucide-react';

// --- Interfaces ---

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

interface StudentProfile {
  id: string; // profile id
  user_id: string;
  full_name: string;
  email: string;
}

interface StudentSpecificStats {
  totalTests: number;
  avgScore: number;
  passRate: number;
  bestScore: number;
  recentAttempts: any[];
  progressHistory: any[];
}

export default function AdminAnalytics() {
  const location = useLocation();
  const role = location.pathname.startsWith('/mentor') ? 'mentor' : 'admin';
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Overview State
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

  // Individual Student State
  const [studentList, setStudentList] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentStats, setStudentStats] = useState<StudentSpecificStats | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  useEffect(() => {
    fetchGlobalAnalytics();
    fetchStudentList();
  }, []);

  // --- 1. Global Analytics (Bulk View) ---
  const fetchGlobalAnalytics = async () => {
    try {
      // Fetch students count
      const { count: studentCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // Fetch tests count
      const { count: testCount } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true });

      // Fetch all attempts - REMOVED the profiles join to prevent query failure
      const { data: attempts, error: attemptsError } = await supabase
        .from('student_test_attempts')
        .select(`
          user_id,
          percentage,
          is_passed,
          is_flagged,
          submitted_at,
          created_at,
          status,
          tests (
            title
          )
        `)
        .in('status', ['submitted', 'auto_submitted']);

      if (attemptsError) {
        console.error('Error fetching attempts:', attemptsError);
        return;
      }

      const attemptCount = attempts?.length || 0;
      const passedCount = attempts?.filter(a => a.is_passed).length || 0;
      const flaggedCount = attempts?.filter(a => a.is_flagged).length || 0;
      const avgScore = attemptCount > 0 
        ? attempts!.reduce((sum, a) => sum + (a.percentage || 0), 0) / attemptCount 
        : 0;

      setStats({
        totalStudents: studentCount || 0,
        totalTests: testCount || 0,
        totalAttempts: attemptCount,
        avgScore: Math.round(avgScore),
        passRate: attemptCount > 0 ? Math.round((passedCount / attemptCount) * 100) : 0,
        flaggedAttempts: flaggedCount,
      });

      // Test performance data
      const testPerfMap: Record<string, { attempts: number; scores: number[]; passed: number }> = {};
      attempts?.forEach(a => {
        // @ts-ignore - Supabase types join
        const title = a.tests?.title || 'Unknown Test';
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

      // Top students Logic - Aggregated manually then fetched names
      const studentMap: Record<string, { scores: number[]; tests: number }> = {};
      attempts?.forEach(a => {
        if (!studentMap[a.user_id]) {
          studentMap[a.user_id] = { scores: [], tests: 0 };
        }
        studentMap[a.user_id].scores.push(a.percentage || 0);
        studentMap[a.user_id].tests++;
      });

      // Sort to find top 5 User IDs
      const topUserIds = Object.entries(studentMap)
        .map(([userId, data]) => ({
          userId,
          avg: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5)
        .map(u => u.userId);

      // Fetch only the names needed
      let topStudentsList: { name: string; score: number; tests: number }[] = [];
      
      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', topUserIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]));

        topStudentsList = topUserIds.map(userId => {
          const stats = studentMap[userId];
          const name = profileMap.get(userId) || 'Unknown Student';
          return {
            name,
            score: Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length),
            tests: stats.tests
          };
        });
      }
      
      setTopStudents(topStudentsList);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Individual Student Logic ---

  const fetchStudentList = async () => {
    try {
      // Get all users who have the role 'student'
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');
      
      if (!roleData || roleData.length === 0) return;

      const userIds = roleData.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email')
        .in('user_id', userIds)
        .order('full_name');

      if (profiles) setStudentList(profiles as StudentProfile[]);
    } catch (error) {
      console.error("Error fetching student list", error);
    }
  };

  const handleStudentSelect = async (userId: string) => {
    setSelectedStudentId(userId);
    setLoadingStudent(true);
    try {
      const { data: attempts } = await supabase
        .from('student_test_attempts')
        .select('*, tests(title)')
        .eq('user_id', userId)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false });

      if (attempts) {
        const total = attempts.length;
        const passed = attempts.filter(a => a.is_passed).length;
        const avg = total > 0 ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / total : 0;
        const best = total > 0 ? Math.max(...attempts.map(a => a.percentage || 0)) : 0;

        // Data for chart (Progress over time)
        const progressHistory = attempts
          .slice(0, 10)
          .reverse()
          .map(a => ({
            date: format(new Date(a.submitted_at), 'MMM d'),
            score: Math.round(a.percentage || 0),
            title: a.tests?.title
          }));

        setStudentStats({
          totalTests: total,
          avgScore: Math.round(avg),
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
          bestScore: Math.round(best),
          recentAttempts: attempts.slice(0, 5),
          progressHistory
        });
      }
    } catch (error) {
      console.error("Error fetching student details", error);
    } finally {
      setLoadingStudent(false);
    }
  };

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
        
        {/* Top Header */}
        <div>
          <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-sidebar-foreground/70 mt-1">Overview of platform performance and student analytics</p>
        </div>

        {/* --- TABS SECTION --- */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="overview">Platform Overview</TabsTrigger>
            <TabsTrigger value="student">Student Details</TabsTrigger>
          </TabsList>

          {/* ==================== TAB 1: BULK OVERVIEW ==================== */}
          <TabsContent value="overview" className="space-y-6">
            
            {/* KPI Cards */}
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
          </TabsContent>

          {/* ==================== TAB 2: INDIVIDUAL STUDENT ==================== */}
          <TabsContent value="student" className="space-y-6">
            
            {/* Student Selector */}
            <div className="flex items-center gap-4 bg-sidebar-accent p-4 rounded-lg border border-sidebar-border">
              <div className="flex-1 max-w-sm">
                <p className="text-sm font-medium mb-2 text-sidebar-foreground">Select a Student</p>
                <Select value={selectedStudentId || ''} onValueChange={handleStudentSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Search for a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {studentList.map(s => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.full_name} ({s.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden md:block text-sidebar-foreground/60 text-sm mt-6">
                Select a student to view their detailed performance history and stats.
              </div>
            </div>

            {loadingStudent ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : selectedStudentId && studentStats ? (
              <>
                {/* Student Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card variant="admin">
                    <CardContent className="p-4">
                      <p className="text-sm text-sidebar-foreground/70">Tests Taken</p>
                      <p className="text-2xl font-bold text-sidebar-foreground">{studentStats.totalTests}</p>
                    </CardContent>
                  </Card>
                  <Card variant="admin">
                    <CardContent className="p-4">
                      <p className="text-sm text-sidebar-foreground/70">Average Score</p>
                      <p className="text-2xl font-bold text-game-gold">{studentStats.avgScore}%</p>
                    </CardContent>
                  </Card>
                  <Card variant="admin">
                    <CardContent className="p-4">
                      <p className="text-sm text-sidebar-foreground/70">Pass Rate</p>
                      <p className="text-2xl font-bold text-accent">{studentStats.passRate}%</p>
                    </CardContent>
                  </Card>
                  <Card variant="admin">
                    <CardContent className="p-4">
                      <p className="text-sm text-sidebar-foreground/70">Best Score</p>
                      <p className="text-2xl font-bold text-primary">{studentStats.bestScore}%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts & Lists */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Progress Chart */}
                  <Card variant="admin">
                    <CardHeader>
                      <CardTitle className="text-lg text-sidebar-foreground">Performance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {studentStats.progressHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={studentStats.progressHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 25%)" />
                            <XAxis dataKey="date" stroke="hsl(220, 15%, 60%)" fontSize={12} />
                            <YAxis domain={[0, 100]} stroke="hsl(220, 15%, 60%)" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                background: 'hsl(225, 25%, 16%)',
                                border: '1px solid hsl(225, 20%, 25%)',
                                borderRadius: '8px',
                              }}
                            />
                            <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{r: 4}} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-sidebar-foreground/50">
                          No test history available.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity List */}
                  <Card variant="admin">
                    <CardHeader>
                      <CardTitle className="text-lg text-sidebar-foreground">Recent Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {studentStats.recentAttempts.map((attempt) => (
                          <div key={attempt.id} className="flex items-center justify-between p-3 border border-sidebar-border rounded bg-sidebar-accent/50">
                            <div>
                              <p className="font-medium text-sm text-sidebar-foreground">
                                {attempt.tests?.title || 'Unknown Test'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(attempt.submitted_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={attempt.is_passed ? "default" : "destructive"}>
                                {attempt.percentage}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {studentStats.recentAttempts.length === 0 && (
                          <div className="text-center text-sm text-sidebar-foreground/50 py-10">
                            No recent attempts found.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-sidebar-accent/30 rounded-lg border border-dashed border-sidebar-border">
                <User className="w-12 h-12 text-sidebar-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-sidebar-foreground">No Student Selected</h3>
                <p className="text-sidebar-foreground/60 max-w-md text-center mt-2">
                  Use the dropdown above to search and select a student to view their individual analytics.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}