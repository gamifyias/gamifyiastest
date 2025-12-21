import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { LevelProgress, XPBadge, CoinBadge, StreakBadge, RankBadge } from '@/components/game/GameBadges';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Gamepad2, 
  ClipboardList, 
  Target, 
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle,
  TrendingUp,
  Zap,
  Star,
  BookOpen,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  xp: number;
  level: number;
  coins: number;
  streak: number;
  rank: number;
  xpForNextLevel: number;
  testsCompleted: number;
  averageScore: number;
  weakTopics: number;
}

interface UpcomingTest {
  id: string;
  title: string;
  subject_name: string;
  due_date: string | null;
  difficulty: string;
}

interface RecentActivity {
  type: 'test' | 'achievement' | 'level';
  name: string;
  score?: number;
  xpEarned: number;
  timeAgo: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    xp: 0,
    level: 1,
    coins: 0,
    streak: 0,
    rank: 0,
    xpForNextLevel: 1000,
    testsCompleted: 0,
    averageScore: 0,
    weakTopics: 0,
  });
  const [upcomingTests, setUpcomingTests] = useState<UpcomingTest[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      // Fetch leaderboard stats for current user
      const { data: leaderboardData } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      // Fetch user's test attempts
      const { data: attempts } = await supabase
        .from('student_test_attempts')
        .select('*, tests(title, subject_id, subjects(name))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Fetch upcoming test assignments
      const { data: assignments } = await supabase
        .from('test_assignments')
        .select('*, tests(id, title, subject_id, subjects(name), duration_minutes)')
        .eq('user_id', user!.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(3);

      // Fetch weak questions count
      const { count: weakCount } = await supabase
        .from('student_weak_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_mastered', false);

      // Calculate stats
      const completedAttempts = attempts?.filter(a => a.status === 'submitted' || a.status === 'auto_submitted') || [];
      const avgScore = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts.length
        : 0;

      const currentXP = leaderboardData?.total_xp || 0;
      const level = Math.floor(currentXP / 1000) + 1;
      const xpForNextLevel = level * 1000;

      setStats({
        xp: currentXP,
        level,
        coins: leaderboardData?.total_coins || 0,
        streak: leaderboardData?.current_streak || 0,
        rank: leaderboardData?.rank_position || 0,
        xpForNextLevel,
        testsCompleted: leaderboardData?.tests_completed || 0,
        averageScore: Math.round(avgScore),
        weakTopics: weakCount || 0,
      });

      // Format upcoming tests
      const formattedTests: UpcomingTest[] = (assignments || []).map((a: any) => ({
        id: a.tests?.id || a.test_id,
        title: a.tests?.title || 'Unknown Test',
        subject_name: a.tests?.subjects?.name || 'Unknown Subject',
        due_date: a.due_date,
        difficulty: 'medium',
      }));
      setUpcomingTests(formattedTests);

      // Format recent activity
      const recentAttempts = completedAttempts.slice(0, 3).map((a: any) => ({
        type: 'test' as const,
        name: a.tests?.title || 'Test',
        score: Math.round(a.percentage || 0),
        xpEarned: Math.round((a.percentage || 0) * 2),
        timeAgo: formatDistanceToNow(new Date(a.submitted_at || a.created_at), { addSuffix: true }),
      }));
      setRecentActivity(recentAttempts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-game">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Adventurer'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Ready for your next learning quest?
            </p>
          </div>
          {/* <div className="flex items-center gap-2">
            {stats.rank > 0 && <RankBadge rank={stats.rank} />}
            <StreakBadge days={stats.streak} />
          </div> */}
        </div>

        {/* Level Progress */}
        {/* <Card variant="gameHighlight" className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <LevelProgress 
                currentXP={stats.xp} 
                xpForNextLevel={stats.xpForNextLevel} 
                level={stats.level} 
              />
            </div>
            <div className="flex items-center gap-3">
              <CoinBadge coins={stats.coins} size="lg" />
              <Link to="/student/game">
                <Button variant="game" size="lg">
                  <Gamepad2 size={20} />
                  Enter Game World
                </Button>
              </Link>
            </div>
          </div>
        </Card> */}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="interactive">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-game-pipe to-game-pipe-dark flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold font-game">{stats.testsCompleted}</div>
              <div className="text-sm text-muted-foreground">Tests Completed</div>
            </CardContent>
          </Card>

          <Card variant="interactive">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-game-gold to-game-star flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-2xl font-bold font-game">{stats.averageScore}%</div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </CardContent>
          </Card>

          <Card variant="interactive">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-game-mushroom to-destructive flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold font-game">{stats.weakTopics}</div>
              <div className="text-sm text-muted-foreground">Weak Areas</div>
            </CardContent>
          </Card>

          <a href="https://contactgamifyias.web.app/" target='_blank'><Card variant="interactive">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-game-boss to-purple-800 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold font-game">Any Issue??</div>
              <div className="text-sm text-muted-foreground">Contact Admin</div>
            </CardContent>
          </Card></a>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Tests */}
          <Card variant="default" className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Upcoming Tests
              </CardTitle>
              <Link to="/student/tests">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight size={16} />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No upcoming tests assigned</p>
                </div>
              ) : (
                upcomingTests.map((test) => (
                  <div 
                    key={test.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{test.title}</h4>
                        <p className="text-sm text-muted-foreground">{test.subject_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {test.due_date && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock size={14} />
                          {format(new Date(test.due_date), 'MMM d')}
                        </div>
                      )}
                      <Link to={`/student/test/${test.id}`}>
                        <Button variant="gameSecondary" size="sm">
                          Start
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-game-gold" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-game-pipe/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-game-pipe" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.name}</p>
                      {activity.score !== undefined && (
                        <p className="text-xs text-muted-foreground">Score: {activity.score}%</p>
                      )}
                      <p className="text-xs text-game-gold">+{activity.xpEarned} XP</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.timeAgo}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link to="/student/game" className="block">
            <Card variant="game" className="h-full hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="p-6 text-center">
                <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-primary" />
                <h3 className="font-bold">Game World</h3>
                <p className="text-sm text-muted-foreground">Explore & Learn</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/student/tests" className="block">
            <Card variant="game" className="h-full hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="p-6 text-center">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-secondary" />
                <h3 className="font-bold">My Tests</h3>
                <p className="text-sm text-muted-foreground">View All Tests</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/student/weak-tests" className="block">
            <Card variant="game" className="h-full hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="p-6 text-center">
                <Target className="w-10 h-10 mx-auto mb-3 text-destructive" />
                <h3 className="font-bold">Weak Areas</h3>
                <p className="text-sm text-muted-foreground">Practice More</p>
              </CardContent>
            </Card>
          </Link>

          {/* <Link to="/student/leaderboard" className="block">
            <Card variant="game" className="h-full hover:scale-105 transition-transform cursor-pointer">
              <CardContent className="p-6 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-game-gold" />
                <h3 className="font-bold">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">Check Rankings</p>
              </CardContent>
            </Card>
          </Link> */}
        </div>
      </div>
    </StudentLayout>
  );
}
