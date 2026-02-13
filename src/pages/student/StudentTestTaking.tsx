import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { toast } from 'sonner';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Shield,
  Maximize,
  Loader2,
  ShieldCheck,
  IdCard,
} from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  question_image_url?: string;
  marks: number;
  negative_marks: number;
  options: {
    id: string;
    option_text: string;
    option_image_url?: string;
    is_correct: boolean;
    sort_order: number;
  }[];
}

interface TestData {
  id: string;
  title: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  pass_marks: number;
  allow_navigation: boolean;
  allow_review: boolean;
  show_results: boolean;
  show_answers: boolean;
  anti_cheat_enabled: boolean;
  fullscreen_required: boolean;
  tab_switch_limit: number;
  watermark_enabled: boolean;
}

interface Answer {
  questionId: string;
  selectedOptions: string[];
  textAnswer?: string;
  isMarkedForReview: boolean;
  timeSpent: number;
}

export default function StudentTestTaking() {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [test, setTest] = useState<TestData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const {
    violations,
    warningMessage,
    enterFullscreen,
    exitFullscreen,
  } = useAntiCheat({
    attemptId: attemptId || '',
    userId: user?.id || '',
    tabSwitchLimit: test?.tab_switch_limit || 3,
    fullscreenRequired: test?.fullscreen_required || false,
    onViolationLimitReached: () => {
      handleSubmitTest(true);
    },
  });

  useEffect(() => {
    if (testId && user?.id) {
      fetchTestData();
    }
  }, [testId, user?.id]);

  // Timer
  useEffect(() => {
    if (!testStarted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, timeRemaining]);

  const fetchTestData = async () => {
    try {
      // Fetch test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);
      setTimeRemaining(testData.duration_minutes * 60);

      // Fetch questions with options
      const { data: testQuestions, error: questionsError } = await supabase
        .from('test_questions')
        .select(`
          *,
          questions (
            id,
            question_text,
            question_type,
            question_image_url,
            marks,
            negative_marks
          )
        `)
        .eq('test_id', testId)
        .order('sort_order');

      if (questionsError) throw questionsError;

      // Fetch options for each question
      const questionIds = testQuestions?.map(tq => tq.questions?.id).filter(Boolean) || [];
      const { data: options } = await supabase
        .from('question_options')
        .select('*')
        .in('question_id', questionIds)
        .order('sort_order');

      // Combine questions with options
      const questionsWithOptions = testQuestions?.map(tq => ({
        ...tq.questions,
        options: options?.filter(o => o.question_id === tq.questions?.id) || [],
      })).filter(q => q.id) as Question[];

      setQuestions(questionsWithOptions || []);

      // Check for existing attempt
      const { data: existingAttempt } = await supabase
        .from('student_test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user!.id)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (existingAttempt) {
        setAttemptId(existingAttempt.id);
        setTimeRemaining(
          (testData.duration_minutes * 60) - 
          Math.floor((Date.now() - new Date(existingAttempt.started_at).getTime()) / 1000)
        );
        
        // Fetch existing answers
        const { data: existingAnswers } = await supabase
          .from('student_answers')
          .select('*')
          .eq('attempt_id', existingAttempt.id);

        if (existingAnswers) {
          const answersMap: Record<string, Answer> = {};
          existingAnswers.forEach(a => {
            answersMap[a.question_id] = {
              questionId: a.question_id,
              selectedOptions: a.selected_options || [],
              textAnswer: a.text_answer || undefined,
              isMarkedForReview: a.is_marked_for_review || false,
              timeSpent: a.time_spent_seconds || 0,
            };
          });
          setAnswers(answersMap);
        }
        
        setShowStartDialog(false);
        setTestStarted(true);
      }
    } catch (error) {
      console.error('Error fetching test:', error);
      toast.error('Failed to load test');
      navigate('/student/tests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTest = async () => {
    try {
      // Create new attempt
      const { data: attempt, error } = await supabase
        .from('student_test_attempts')
        .insert({
          test_id: testId,
          user_id: user!.id,
          total_marks: test!.total_marks,
          total_questions: test!.total_questions,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;

      setAttemptId(attempt.id);
      setShowStartDialog(false);
      setTestStarted(true);
      setQuestionStartTime(Date.now());

      if (test?.fullscreen_required) {
        await enterFullscreen();
      }
    } catch (error: any) {
      console.error('Error starting test:', error);
      toast.error(error.message || 'Failed to start test');
    }
  };

  const saveAnswer = useCallback(async (questionId: string, answer: Answer) => {
    if (!attemptId) return;

    try {
      const { error } = await supabase
        .from('student_answers')
        .upsert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_options: answer.selectedOptions,
          text_answer: answer.textAnswer,
          is_marked_for_review: answer.isMarkedForReview,
          time_spent_seconds: answer.timeSpent,
        }, {
          onConflict: 'attempt_id,question_id',
        });

      if (error) console.error('Error saving answer:', error);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  }, [attemptId]);

  const handleAnswerChange = (questionId: string, selectedOptions: string[], textAnswer?: string) => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const existingAnswer = answers[questionId] || { questionId, selectedOptions: [], isMarkedForReview: false, timeSpent: 0 };
    
    const newAnswer: Answer = {
      ...existingAnswer,
      selectedOptions,
      textAnswer,
      timeSpent: existingAnswer.timeSpent + timeSpent,
    };

    setAnswers(prev => ({ ...prev, [questionId]: newAnswer }));
    saveAnswer(questionId, newAnswer);
    setQuestionStartTime(Date.now());
  };

  const handleMarkForReview = () => {
    const currentQuestion = questions[currentIndex];
    const existingAnswer = answers[currentQuestion.id] || { 
      questionId: currentQuestion.id, 
      selectedOptions: [], 
      isMarkedForReview: false, 
      timeSpent: 0 
    };
    
    const newAnswer: Answer = {
      ...existingAnswer,
      isMarkedForReview: !existingAnswer.isMarkedForReview,
    };

    setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswer }));
    saveAnswer(currentQuestion.id, newAnswer);
    toast.success(newAnswer.isMarkedForReview ? 'Marked for review' : 'Unmarked');
  };

  const handleSubmitTest = async (autoSubmit = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Calculate scores
      let obtainedMarks = 0;
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let attemptedQuestions = 0;

      for (const question of questions) {
        const answer = answers[question.id];
        if (!answer || answer.selectedOptions.length === 0) continue;

        attemptedQuestions++;
        const correctOptions = question.options.filter(o => o.is_correct).map(o => o.id);
        
        const isCorrect = 
          correctOptions.length === answer.selectedOptions.length &&
          correctOptions.every(o => answer.selectedOptions.includes(o));

        // Update answer with correctness
        await supabase
          .from('student_answers')
          .update({
            is_correct: isCorrect,
            marks_obtained: isCorrect ? question.marks : -question.negative_marks,
          })
          .eq('attempt_id', attemptId)
          .eq('question_id', question.id);

        if (isCorrect) {
          correctAnswers++;
          obtainedMarks += question.marks;
        } else {
          wrongAnswers++;
          obtainedMarks -= question.negative_marks;
        }
      }

      const percentage = (obtainedMarks / test!.total_marks) * 100;
      const isPassed = percentage >= test!.pass_marks;
      const timeTaken = (test!.duration_minutes * 60) - timeRemaining;

      // Update attempt
      await supabase
        .from('student_test_attempts')
        .update({
          status: autoSubmit ? 'auto_submitted' : 'submitted',
          submitted_at: new Date().toISOString(),
          obtained_marks: Math.max(0, obtainedMarks),
          percentage,
          attempted_questions: attemptedQuestions,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          skipped_questions: questions.length - attemptedQuestions,
          is_passed: isPassed,
          time_taken_seconds: timeTaken,
          is_flagged: violations.tabSwitches > 0 || violations.fullscreenExits > 0,
          flag_reason: violations.tabSwitches > 0 ? `Tab switches: ${violations.tabSwitches}` : null,
        })
        .eq('id', attemptId);

      // Update leaderboard - fetch current values and increment
      const { data: currentLeaderboard } = await supabase
        .from('leaderboard')
        .select('tests_completed, tests_passed, total_xp')
        .eq('user_id', user!.id)
        .single();

      if (currentLeaderboard) {
        await supabase
          .from('leaderboard')
          .update({
            tests_completed: (currentLeaderboard.tests_completed || 0) + 1,
            tests_passed: isPassed ? (currentLeaderboard.tests_passed || 0) + 1 : currentLeaderboard.tests_passed,
            total_xp: (currentLeaderboard.total_xp || 0) + Math.floor(obtainedMarks),
          })
          .eq('user_id', user!.id);
      }

      if (test?.fullscreen_required) {
        await exitFullscreen();
      }

      toast.success(autoSubmit ? 'Test auto-submitted' : 'Test submitted successfully');
      navigate(`/student/results/${attemptId}`);
    } catch (error) {
      console.error('Error submitting test:', error);
      toast.error('Failed to submit test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const answeredCount = Object.values(answers).filter(a => a.selectedOptions.length > 0).length;
  const reviewCount = Object.values(answers).filter(a => a.isMarkedForReview).length;

  return (
    <div className="min-h-screen bg-background select-none">
      {/* Warning Banner */}
      {warningMessage && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground p-4 text-center">
          <AlertTriangle className="inline-block w-5 h-5 mr-2" />
          {warningMessage}
        </div>
      )}

      {/* Watermark */}
      {test?.watermark_enabled && (
        <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center opacity-5">
          <div className="text-6xl font-bold transform -rotate-45">
            {user?.full_name} | {user?.email}
          </div>
        </div>
      )}

      {/* Start Dialog */}
      <Dialog open={showStartDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{test?.title}</DialogTitle>
            <DialogDescription>
              Please read the instructions carefully before starting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Questions</p>
                <p className="text-lg font-bold">{test?.total_questions}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">{test?.duration_minutes} mins</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Total Marks</p>
                <p className="text-lg font-bold">{test?.total_marks}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Pass Marks</p>
                <p className="text-lg font-bold">{test?.pass_marks}%</p>
              </div>
            </div>

            {test?.anti_cheat_enabled && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <Shield className="w-4 h-4" />
                  Anti-Cheat Enabled
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {test.fullscreen_required && <li>• Fullscreen mode required</li>}
                  <li>• Tab switching limited to {test.tab_switch_limit} times</li>
                  <li>• Copy/paste disabled</li>
                  <li>• Right-click disabled</li>
                </ul>
              </div>
            )}

            <Button variant="game" className="w-full" onClick={handleStartTest}>
              <Maximize className="w-4 h-4 mr-2" />
              Start Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit? You won't be able to change your answers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-accent/10 rounded-lg">
              <p className="text-2xl font-bold text-accent">{answeredCount}</p>
              <p className="text-sm text-muted-foreground">Answered</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-2xl font-bold text-destructive">{questions.length - answeredCount}</p>
              <p className="text-sm text-muted-foreground">Unanswered</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary">{reviewCount}</p>
              <p className="text-sm text-muted-foreground">For Review</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="game" 
              className="flex-1" 
              onClick={() => handleSubmitTest()}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Test Interface */}
      {testStarted && currentQuestion && (
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="bg-card border-b p-4 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">{test?.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>
              <Button variant="game" onClick={() => setShowSubmitDialog(true)}>
                <Send className="w-4 h-4" />
                Submit
              </Button>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            {/* Question Panel */}
            <main className="flex-1 overflow-auto p-6">
              <Card variant="default" className="max-w-3xl mx-auto">
                <CardContent className="p-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{currentQuestion.question_type.replace('_', ' ')}</Badge>
                      <Badge variant="secondary">{currentQuestion.marks} marks</Badge>
                      {currentQuestion.negative_marks > 0 && (
                        <Badge variant="destructive">-{currentQuestion.negative_marks}</Badge>
                      )}
                    </div>
                    <Button
                      variant={currentAnswer?.isMarkedForReview ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleMarkForReview}
                    >
                      <Flag className="w-4 h-4" />
                      {currentAnswer?.isMarkedForReview ? 'Marked' : 'Mark for Review'}
                    </Button>
                  </div>

                  {/* Question Text - FIX: Added whitespace-pre-wrap and leading-relaxed */}
                  <div className="mb-6">
                    <div className="text-lg whitespace-pre-wrap leading-relaxed">
                      {currentQuestion.question_text}
                    </div>
                    {currentQuestion.question_image_url && (
                      <img 
                        src={currentQuestion.question_image_url} 
                        alt="Question" 
                        className="mt-4 max-w-full rounded-lg"
                      />
                    )}
                  </div>

                  {/* Options */}
                  {currentQuestion.question_type === 'mcq_single' || currentQuestion.question_type === 'true_false' ? (
                    <RadioGroup
                      value={currentAnswer?.selectedOptions[0] || ''}
                      onValueChange={value => handleAnswerChange(currentQuestion.id, [value])}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option, idx) => (
                        <div
                          key={option.id}
                          className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                            currentAnswer?.selectedOptions.includes(option.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer leading-relaxed">
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            {/* FIX: Added whitespace-pre-wrap for options too */}
                            <span className="whitespace-pre-wrap">
                              {option.option_text}
                            </span>
                            {option.option_image_url && (
                              <img src={option.option_image_url} alt="" className="mt-2 max-w-xs rounded" />
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : currentQuestion.question_type === 'mcq_multiple' ? (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => (
                        <div
                          key={option.id}
                          className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                            currentAnswer?.selectedOptions.includes(option.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            const current = currentAnswer?.selectedOptions || [];
                            const updated = current.includes(option.id)
                              ? current.filter(id => id !== option.id)
                              : [...current, option.id];
                            handleAnswerChange(currentQuestion.id, updated);
                          }}
                        >
                          <Checkbox
                            checked={currentAnswer?.selectedOptions.includes(option.id)}
                            onCheckedChange={() => {}}
                            className="mt-1"
                          />
                          <Label className="flex-1 cursor-pointer leading-relaxed">
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                             {/* FIX: Added whitespace-pre-wrap for options too */}
                            <span className="whitespace-pre-wrap">
                              {option.option_text}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <Label>Enter your answer:</Label>
                      <Input
                        type="number"
                        value={currentAnswer?.textAnswer || ''}
                        onChange={e => handleAnswerChange(currentQuestion.id, [], e.target.value)}
                        className="mt-2"
                        placeholder="Enter numeric answer"
                      />
                    </div>
                  )}
                  
                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0 || !test?.allow_navigation}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      {currentIndex + 1} / {questions.length}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                      disabled={currentIndex === questions.length - 1}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </main>

            {/* Question Navigator */}
            {test?.allow_navigation && (
              <aside className="w-64 bg-card border-l p-4 overflow-auto hidden lg:block">
                <h3 className="font-bold mb-4">Questions</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const answer = answers[q.id];
                    const isAnswered = answer && answer.selectedOptions.length > 0;
                    const isReview = answer?.isMarkedForReview;
                    const isCurrent = idx === currentIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isReview
                            ? 'bg-primary/20 text-primary border-2 border-primary'
                            : isAnswered
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-accent" />
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted" />
                    <span>Not Answered ({questions.length - answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary/20 border-2 border-primary" />
                    <span>For Review ({reviewCount})</span>
                  </div>
                </div>

                {/* Violations Warning */}
                {(violations.tabSwitches > 0 || violations.fullscreenExits > 0) && (
                  <div className="mt-6 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Violations
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {violations.tabSwitches > 0 && (
                        <li>Tab switches: {violations.tabSwitches}/{test.tab_switch_limit}</li>
                      )}
                      {violations.fullscreenExits > 0 && (
                        <li>Fullscreen exits: {violations.fullscreenExits}</li>
                      )}
                    </ul>
                  </div>
                )}
              </aside>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">Encrypted By <span className="font-bold">Hyde Security.</span></p>
        </div>
        
      )}
    </div>
  );
}