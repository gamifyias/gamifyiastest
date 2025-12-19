import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CertificateGenerator, CertificatePreview } from '@/components/CertificateGenerator';
import {
  Trophy,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Award,
  AlertTriangle,
  SkipForward,
  Loader2,
  Download,
} from 'lucide-react';

interface AttemptData {
  id: string;
  test_id: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  time_taken_seconds: number;
  is_passed: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  submitted_at: string;
  tab_switches: number;
  fullscreen_exits: number;
  tests: {
    title: string;
    pass_marks: number;
    show_answers: boolean;
    subjects: { name: string } | null;
  };
}

interface AnswerData {
  id: string;
  question_id: string;
  selected_options: string[];
  is_correct: boolean;
  marks_obtained: number;
  time_spent_seconds: number;
  questions: {
    question_text: string;
    question_type: string;
    difficulty: string;
    marks: number;
    negative_marks: number;
    explanation: string | null;
    question_options: {
      id: string;
      option_text: string;
      is_correct: boolean;
    }[];
  };
}

export default function StudentResults() {
  const { id: attemptId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [certificateNumber, setCertificateNumber] = useState('');

  useEffect(() => {
    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      // Fetch attempt with test details
      const { data: attemptData, error: attemptError } = await supabase
        .from('student_test_attempts')
        .select(`
          *,
          tests (
            title,
            pass_marks,
            show_answers,
            subjects (name)
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      setAttempt(attemptData as AttemptData);

      // Fetch answers with questions if show_answers is true
      if (attemptData.tests?.show_answers) {
        const { data: answersData } = await supabase
          .from('student_answers')
          .select(`
            *,
            questions (
              question_text,
              question_type,
              difficulty,
              marks,
              negative_marks,
              explanation,
              question_options (
                id,
                option_text,
                is_correct
              )
            )
          `)
          .eq('attempt_id', attemptId);

        if (answersData) {
          setAnswers(answersData as AnswerData[]);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
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

  if (!attempt) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Results not found</p>
          <Link to="/student/tests">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tests
            </Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Back Button */}
        <Link to="/student/tests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Tests
          </Button>
        </Link>

        {/* Result Header */}
        <Card variant={attempt.is_passed ? 'gameHighlight' : 'default'}>
          <CardContent className="p-8 text-center">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
              attempt.is_passed 
                ? 'bg-accent/20 text-accent' 
                : 'bg-destructive/20 text-destructive'
            }`}>
              {attempt.is_passed ? (
                <Trophy className="w-12 h-12" />
              ) : (
                <XCircle className="w-12 h-12" />
              )}
            </div>
            <h1 className="text-3xl font-bold font-game mb-2">
              {attempt.is_passed ? 'Congratulations!' : 'Keep Trying!'}
            </h1>
            <p className="text-muted-foreground mb-4">{attempt.tests.title}</p>
            <div className={`text-6xl font-bold ${
              attempt.is_passed ? 'text-accent' : 'text-destructive'
            }`}>
              {Math.round(attempt.percentage)}%
            </div>
            <p className="text-muted-foreground mt-2">
              {attempt.obtained_marks} / {attempt.total_marks} marks
            </p>
            <Badge 
              variant={attempt.is_passed ? 'default' : 'destructive'} 
              className="mt-4"
            >
              {attempt.is_passed ? 'PASSED' : 'FAILED'} (Pass: {attempt.tests.pass_marks}%)
            </Badge>

            {attempt.is_flagged && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-destructive text-sm flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Flagged: {attempt.flag_reason || 'Suspicious activity detected'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="default">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{attempt.correct_answers}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold">{attempt.wrong_answers}</p>
              <p className="text-sm text-muted-foreground">Wrong</p>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4 text-center">
              <SkipForward className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{attempt.skipped_questions}</p>
              <p className="text-sm text-muted-foreground">Skipped</p>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{formatTime(attempt.time_taken_seconds || 0)}</p>
              <p className="text-sm text-muted-foreground">Time Taken</p>
            </CardContent>
          </Card>
        </div>

        {/* Accuracy Bar */}
        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Accuracy</span>
              <span className="font-bold">{Math.round((attempt.correct_answers / attempt.attempted_questions) * 100 || 0)}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-accent"
                style={{ width: `${(attempt.correct_answers / attempt.total_questions) * 100}%` }}
              />
              <div 
                className="h-full bg-destructive"
                style={{ width: `${(attempt.wrong_answers / attempt.total_questions) * 100}%` }}
              />
              <div 
                className="h-full bg-muted-foreground/30"
                style={{ width: `${(attempt.skipped_questions / attempt.total_questions) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-accent" /> Correct
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" /> Wrong
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Skipped
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Answer Review */}
        {attempt.tests.show_answers && answers.length > 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Answer Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {answers.map((answer, index) => (
                <div key={answer.id} className="border-b last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-accent" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{answer.questions.difficulty}</Badge>
                      <Badge variant={answer.is_correct ? 'default' : 'destructive'}>
                        {answer.marks_obtained > 0 ? '+' : ''}{answer.marks_obtained}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="font-medium mb-3">{answer.questions.question_text}</p>
                  
                  <div className="space-y-2 ml-10">
                    {answer.questions.question_options.map((option) => {
                      const isSelected = answer.selected_options?.includes(option.id);
                      const isCorrect = option.is_correct;
                      
                      return (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border ${
                            isCorrect
                              ? 'bg-accent/10 border-accent'
                              : isSelected
                              ? 'bg-destructive/10 border-destructive'
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrect && <CheckCircle className="w-4 h-4 text-accent" />}
                            {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-destructive" />}
                            <span className={isSelected ? 'font-medium' : ''}>{option.option_text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {answer.questions.explanation && (
                    <div className="mt-3 ml-10 p-3 bg-secondary/10 rounded-lg">
                      <p className="text-sm font-medium mb-1">Explanation:</p>
                      <p className="text-sm text-muted-foreground">{answer.questions.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Test Info */}
        <Card variant="default">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Test</p>
                <p className="font-medium">{attempt.tests.title}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Subject</p>
                <p className="font-medium">{attempt.tests.subjects?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {format(new Date(attempt.submitted_at), 'PPp')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tab Switches</p>
                <p className="font-medium">{attempt.tab_switches || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificate for Passed Tests */}
        {attempt.is_passed && (
          <Card variant="gameHighlight">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-game-gold" />
                Your Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CertificatePreview
                studentName={user?.full_name || 'Student'}
                testTitle={attempt.tests.title}
                score={attempt.obtained_marks}
                totalMarks={attempt.total_marks}
                percentage={attempt.percentage}
                completedDate={attempt.submitted_at}
                certificateNumber={`CERT-${attemptId?.slice(0, 8).toUpperCase()}`}
              />
              <CertificateGenerator
                studentName={user?.full_name || 'Student'}
                testTitle={attempt.tests.title}
                score={attempt.obtained_marks}
                totalMarks={attempt.total_marks}
                percentage={attempt.percentage}
                completedDate={attempt.submitted_at}
                certificateNumber={`CERT-${attemptId?.slice(0, 8).toUpperCase()}`}
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Link to="/student/tests" className="flex-1">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4" />
              Back to Tests
            </Button>
          </Link>
          <Link to="/student/analytics" className="flex-1">
            <Button variant="game" className="w-full">
              <Award className="w-4 h-4" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>
    </StudentLayout>
  );
}
