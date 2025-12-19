import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Brain,
  Target,
  Play,
  Loader2,
  RefreshCw,
  Zap,
  TrendingUp,
  BookOpen,
} from 'lucide-react';

interface WeakTopic {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  total_attempts: number;
  correct_count: number;
  accuracy: number;
  question_ids: string[];
}

interface WeakQuestion {
  id: string;
  question_text: string;
  topic_name: string;
  wrong_count: number;
  correct_count: number;
  is_mastered: boolean;
}

export default function StudentWeakTests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [weakQuestions, setWeakQuestions] = useState<WeakQuestion[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchWeakAreas();
    }
  }, [user?.id]);

  const fetchWeakAreas = async () => {
    try {
      // Fetch weak questions from tracking table
      const { data: weakQuestionsData } = await supabase
        .from('student_weak_questions')
        .select(`
          *,
          questions (
            id,
            question_text
          ),
          topics (
            id,
            name,
            subject_id,
            subjects (name)
          )
        `)
        .eq('user_id', user!.id)
        .eq('is_mastered', false)
        .order('wrong_count', { ascending: false });

      if (weakQuestionsData) {
        // Group by topic
        const topicMap: Record<string, WeakTopic> = {};
        const questions: WeakQuestion[] = [];

        weakQuestionsData.forEach((wq: any) => {
          const topic = wq.topics;
          if (!topic) return;

          if (!topicMap[topic.id]) {
            topicMap[topic.id] = {
              topic_id: topic.id,
              topic_name: topic.name,
              subject_name: topic.subjects?.name || 'Unknown',
              total_attempts: 0,
              correct_count: 0,
              accuracy: 0,
              question_ids: [],
            };
          }

          topicMap[topic.id].total_attempts += (wq.wrong_count || 0) + (wq.correct_count || 0);
          topicMap[topic.id].correct_count += wq.correct_count || 0;
          topicMap[topic.id].question_ids.push(wq.question_id);

          questions.push({
            id: wq.question_id,
            question_text: wq.questions?.question_text || '',
            topic_name: topic.name,
            wrong_count: wq.wrong_count || 0,
            correct_count: wq.correct_count || 0,
            is_mastered: wq.is_mastered || false,
          });
        });

        // Calculate accuracy for each topic
        Object.values(topicMap).forEach(topic => {
          topic.accuracy = topic.total_attempts > 0 
            ? Math.round((topic.correct_count / topic.total_attempts) * 100)
            : 0;
        });

        setWeakTopics(Object.values(topicMap).sort((a, b) => a.accuracy - b.accuracy));
        setWeakQuestions(questions);
      }

      // If no weak questions in tracking, analyze from attempts
      if (!weakQuestionsData || weakQuestionsData.length === 0) {
        await analyzeFromAttempts();
      }
    } catch (error) {
      console.error('Error fetching weak areas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeFromAttempts = async () => {
    try {
      // Get all answered questions for this user
      const { data: attempts } = await supabase
        .from('student_test_attempts')
        .select('id')
        .eq('user_id', user!.id)
        .in('status', ['submitted', 'auto_submitted']);

      if (!attempts || attempts.length === 0) return;

      const attemptIds = attempts.map(a => a.id);

      const { data: answers } = await supabase
        .from('student_answers')
        .select(`
          *,
          questions (
            id,
            question_text,
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

      if (!answers) return;

      // Group by question and track performance
      const questionMap: Record<string, { 
        correct: number; 
        wrong: number; 
        question: any;
      }> = {};

      answers.forEach((answer: any) => {
        const qId = answer.question_id;
        if (!questionMap[qId]) {
          questionMap[qId] = { correct: 0, wrong: 0, question: answer.questions };
        }
        if (answer.is_correct) {
          questionMap[qId].correct++;
        } else {
          questionMap[qId].wrong++;
        }
      });

      // Find weak questions (more wrong than correct)
      const weakQs = Object.entries(questionMap)
        .filter(([_, data]) => data.wrong > data.correct)
        .map(([id, data]) => ({
          id,
          question_text: data.question?.question_text || '',
          topic_name: data.question?.topics?.name || 'Unknown',
          wrong_count: data.wrong,
          correct_count: data.correct,
          is_mastered: false,
        }));

      setWeakQuestions(weakQs);

      // Group by topic
      const topicMap: Record<string, WeakTopic> = {};
      Object.entries(questionMap).forEach(([qId, data]) => {
        const topic = data.question?.topics;
        if (!topic || data.wrong <= data.correct) return;

        if (!topicMap[topic.id]) {
          topicMap[topic.id] = {
            topic_id: topic.id,
            topic_name: topic.name,
            subject_name: topic.subjects?.name || 'Unknown',
            total_attempts: 0,
            correct_count: 0,
            accuracy: 0,
            question_ids: [],
          };
        }

        topicMap[topic.id].total_attempts += data.wrong + data.correct;
        topicMap[topic.id].correct_count += data.correct;
        topicMap[topic.id].question_ids.push(qId);
      });

      Object.values(topicMap).forEach(topic => {
        topic.accuracy = topic.total_attempts > 0 
          ? Math.round((topic.correct_count / topic.total_attempts) * 100)
          : 0;
      });

      setWeakTopics(Object.values(topicMap).sort((a, b) => a.accuracy - b.accuracy));
    } catch (error) {
      console.error('Error analyzing attempts:', error);
    }
  };

  const generateWeakAreaTest = async (topicId?: string) => {
    setIsGenerating(true);
    try {
      // Get question IDs for weak areas
      let questionIds: string[] = [];
      
      if (topicId) {
        const topic = weakTopics.find(t => t.topic_id === topicId);
        questionIds = topic?.question_ids || [];
      } else {
        questionIds = weakQuestions.slice(0, 20).map(q => q.id);
      }

      if (questionIds.length === 0) {
        toast.error('No weak questions found to generate test');
        return;
      }

      // Create a weak area test
      const { data: test, error: testError } = await supabase
        .from('tests')
        .insert({
          title: topicId 
            ? `Weak Area Test - ${weakTopics.find(t => t.topic_id === topicId)?.topic_name}`
            : 'Weak Area Practice Test',
          description: 'Auto-generated test based on your weak areas',
          test_type: 'weak_areas',
          duration_minutes: Math.max(30, questionIds.length * 2),
          total_questions: questionIds.length,
          total_marks: questionIds.length,
          pass_marks: 60,
          is_active: true,
          is_public: false,
          max_attempts: 3,
          shuffle_questions: true,
          shuffle_options: true,
          show_results: true,
          show_answers: true,
          anti_cheat_enabled: false,
          fullscreen_required: false,
          created_by: user!.id,
        })
        .select()
        .single();

      if (testError) throw testError;

      // Add questions to test
      const testQuestions = questionIds.map((qId, index) => ({
        test_id: test.id,
        question_id: qId,
        sort_order: index,
      }));

      await supabase.from('test_questions').insert(testQuestions);

      // Assign test to user
      await supabase.from('test_assignments').insert({
        test_id: test.id,
        user_id: user!.id,
        assigned_by: user!.id,
      });

      toast.success('Weak area test generated! Redirecting...');
      navigate(`/student/test/${test.id}`);
    } catch (error: any) {
      console.error('Error generating test:', error);
      toast.error(error.message || 'Failed to generate test');
    } finally {
      setIsGenerating(false);
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-game flex items-center gap-2">
              <Brain className="w-8 h-8 text-destructive" />
              Weak Area Training
            </h1>
            <p className="text-muted-foreground mt-1">
              Practice questions you've struggled with to improve your performance
            </p>
          </div>
          <Button 
            variant="game" 
            onClick={() => generateWeakAreaTest()}
            disabled={isGenerating || weakQuestions.length === 0}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Generate Practice Test
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weak Topics</p>
                  <p className="text-2xl font-bold">{weakTopics.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Questions to Practice</p>
                  <p className="text-2xl font-bold">{weakQuestions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                  <p className="text-2xl font-bold">
                    {weakTopics.length > 0 
                      ? Math.round(weakTopics.reduce((sum, t) => sum + t.accuracy, 0) / weakTopics.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mastered</p>
                  <p className="text-2xl font-bold">
                    {weakQuestions.filter(q => q.is_mastered).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {weakTopics.length === 0 && weakQuestions.length === 0 ? (
          <Card variant="gameHighlight">
            <CardContent className="p-12 text-center">
              <Brain className="w-16 h-16 mx-auto mb-4 text-accent" />
              <h3 className="text-xl font-bold mb-2">No Weak Areas Found!</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Great job! You haven't struggled with any questions yet. 
                Complete some tests and we'll identify areas where you can improve.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Weak Topics */}
            <Card variant="default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Topics Needing Practice
                </CardTitle>
                <CardDescription>
                  Focus on these topics to improve your overall score
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {weakTopics.map((topic) => (
                  <div key={topic.topic_id} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{topic.topic_name}</h4>
                          <Badge variant="outline">{topic.subject_name}</Badge>
                          <Badge 
                            variant={topic.accuracy < 30 ? 'destructive' : topic.accuracy < 50 ? 'secondary' : 'default'}
                          >
                            {topic.accuracy}% accuracy
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{topic.question_ids.length} weak questions</span>
                            <span>{topic.correct_count}/{topic.total_attempts} correct</span>
                          </div>
                          <Progress 
                            value={topic.accuracy} 
                            className="h-2"
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => generateWeakAreaTest(topic.topic_id)}
                        disabled={isGenerating}
                      >
                        <Play className="w-4 h-4" />
                        Practice Topic
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weak Questions List */}
            <Card variant="default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Questions You Got Wrong
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {weakQuestions.slice(0, 15).map((q) => (
                    <div 
                      key={q.id} 
                      className="p-3 bg-muted/30 rounded-lg flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{q.question_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{q.topic_name}</Badge>
                          <span className="text-xs text-destructive">
                            Wrong {q.wrong_count}x
                          </span>
                          {q.correct_count > 0 && (
                            <span className="text-xs text-accent">
                              Correct {q.correct_count}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </StudentLayout>
  );
}