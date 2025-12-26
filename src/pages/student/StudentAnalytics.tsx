import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Brain,
} from 'lucide-react';

interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
}

interface DifficultyPerformance {
  difficulty: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface TestHistory {
  date: string;
  score: number;
  test_title: string;
}

export default function StudentAnalytics() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [totalTests, setTotalTests] = useState(0);
  const [passedTests, setPassedTests] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([]);
  const [difficultyPerformance, setDifficultyPerformance] = useState<DifficultyPerformance[]>([]);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user?.id]);

  const fetchAnalytics = async () => {
    try {
      // Fetch test attempts
      const { data: attempts } = await supabase
        .from('student_test_attempts')
        .select(`
          *,
          tests (title)
        `)
        .eq('user_id', user!.id)
        .in('status', ['submitted', 'auto_submitted'])
        .order('submitted_at', { ascending: false });

      if (attempts && attempts.length > 0) {
        setTotalTests(attempts.length);
        setPassedTests(attempts.filter(a => a.is_passed).length);
        setAverageScore(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length);
        setTotalTime(attempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0));

        // Test history for chart
        const history = attempts.slice(0, 10).map(a => ({
          date: new Date(a.submitted_at || a.created_at).toLocaleDateString(),
          score: Math.round(a.percentage || 0),
          test_title: a.tests?.title || 'Unknown',
        })).reverse();
        setTestHistory(history);
      }

      // Fetch answers with question details for topic-wise analysis
      const attemptIds = attempts?.map(a => a.id) || [];
      const { data: answersData } = await supabase
        .from('student_answers')
        .select(`
          *,
          questions (
            id,
            difficulty,
            topic_id,
            topics (
              id,
              name,
              subject_id,
              subjects (name)
            )
          )
        `)
        .in('attempt_id', attemptIds);

      if (answersData && answersData.length > 0) {
        // Calculate topic performance
        const topicMap: Record<string, { correct: number; total: number; name: string; subject: string }> = {};
        const difficultyMap: Record<string, { correct: number; total: number }> = {
          easy: { correct: 0, total: 0 },
          medium: { correct: 0, total: 0 },
          hard: { correct: 0, total: 0 },
        };

        answersData.forEach(answer => {
          const question = answer.questions as any;
          if (!question) return;

          const topic = question.topics;
          if (topic) {
            if (!topicMap[topic.id]) {
              topicMap[topic.id] = {
                correct: 0,
                total: 0,
                name: topic.name,
                subject: topic.subjects?.name || 'Unknown',
              };
            }
            topicMap[topic.id].total++;
            if (answer.is_correct) topicMap[topic.id].correct++;
          }

          const difficulty = question.difficulty?.toLowerCase() || 'medium';
          if (difficultyMap[difficulty]) {
            difficultyMap[difficulty].total++;
            if (answer.is_correct) difficultyMap[difficulty].correct++;
          }
        });

        // Convert to arrays
        const topicPerf = Object.entries(topicMap).map(([id, data]) => ({
          topic_id: id,
          topic_name: data.name,
          subject_name: data.subject,
          total_questions: data.total,
          correct_answers: data.correct,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        })).sort((a, b) => a.accuracy - b.accuracy);

        setTopicPerformance(topicPerf);
        setWeakTopics(topicPerf.filter(t => t.accuracy < 50).map(t => t.topic_name).slice(0, 5));

        const diffPerf = Object.entries(difficultyMap).map(([difficulty, data]) => ({
          difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
          total: data.total,
          correct: data.correct,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        }));
        setDifficultyPerformance(diffPerf);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['hsl(142, 70%, 45%)', 'hsl(45, 100%, 51%)', 'hsl(0, 75%, 55%)'];

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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-game flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-secondary" />
            My Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your performance and identify areas for improvement
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tests Taken</p>
                  <p className="text-2xl font-bold">{totalTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tests Passed</p>
                  <p className="text-2xl font-bold">{passedTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{Math.round(averageScore)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-2xl font-bold">{Math.round(totalTime / 60)}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Score Trend */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={testHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No test data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Difficulty Distribution */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Performance by Difficulty
              </CardTitle>
            </CardHeader>
            <CardContent>
              {difficultyPerformance.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={difficultyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="difficulty" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="accuracy" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No difficulty data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Topic Performance */}
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Topic-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topicPerformance.length > 0 ? (
              <div className="space-y-4">
                {topicPerformance.map(topic => (
                  <div key={topic.topic_id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{topic.topic_name}</span>
                        <Badge variant="outline" className="text-xs">{topic.subject_name}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {topic.correct_answers}/{topic.total_questions}
                        </span>
                        <span className={`font-bold ${
                          topic.accuracy >= 70 ? 'text-accent' : 
                          topic.accuracy >= 50 ? 'text-primary' : 'text-destructive'
                        }`}>
                          {topic.accuracy}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={topic.accuracy} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Complete some tests to see topic-wise performance
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak Areas */}
        {weakTopics.length > 0 && (
          <Card variant="gameHighlight">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Areas Needing Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((topic, idx) => (
                  <Badge key={idx} variant="destructive" className="px-3 py-1">
                    {topic}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Focus on these topics to improve your overall performance. Consider taking weak area tests to strengthen your understanding.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
