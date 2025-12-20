import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import {
  Eye,
  Clock,
  Target,
  Award,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Shield,
  Loader2,
} from 'lucide-react';

interface TestPreviewProps {
  testId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
  options: {
    id: string;
    option_text: string;
    is_correct: boolean;
  }[];
}

interface TestData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  pass_marks: number;
  anti_cheat_enabled: boolean;
  fullscreen_required: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_results: boolean;
  show_answers: boolean;
  subjects?: { name: string } | null;
}

export function TestPreview({ testId, isOpen, onClose }: TestPreviewProps) {
  const [test, setTest] = useState<TestData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (isOpen && testId) {
      fetchTestData();
    }
  }, [isOpen, testId]);

  const fetchTestData = async () => {
    setIsLoading(true);
    try {
      // Fetch test
      const { data: testData } = await supabase
        .from('tests')
        .select('*, subjects(name)')
        .eq('id', testId)
        .single();

      if (testData) setTest(testData as TestData);

      // Fetch questions
      const { data: testQuestions } = await supabase
        .from('test_questions')
        .select(`
          *,
          questions (
            id,
            question_text,
            question_type,
            difficulty,
            marks
          )
        `)
        .eq('test_id', testId)
        .order('sort_order');

      if (testQuestions) {
        const questionIds = testQuestions.map(tq => tq.questions?.id).filter(Boolean);
        
        const { data: options } = await supabase
          .from('question_options')
          .select('*')
          .in('question_id', questionIds)
          .order('sort_order');

        const questionsWithOptions = testQuestions.map(tq => ({
          ...tq.questions,
          options: options?.filter(o => o.question_id === tq.questions?.id) || [],
        })).filter(q => q.id) as Question[];

        setQuestions(questionsWithOptions);
      }
    } catch (error) {
      console.error('Error fetching test:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, optionId: string, questionType: string) => {
    if (questionType === 'mcq_single' || questionType === 'true_false') {
      setSelectedAnswers(prev => ({ ...prev, [questionId]: [optionId] }));
    } else {
      const current = selectedAnswers[questionId] || [];
      if (current.includes(optionId)) {
        setSelectedAnswers(prev => ({ ...prev, [questionId]: current.filter(id => id !== optionId) }));
      } else {
        setSelectedAnswers(prev => ({ ...prev, [questionId]: [...current, optionId] }));
      }
    }
  };

  const currentQuestion = questions[currentIndex];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Test Preview
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0 h-[70vh]">
            {/* Test Info Sidebar */}
            <div className="col-span-1 border-r bg-muted/30 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg">{test?.title}</h3>
                  {test?.description && (
                    <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
                  )}
                </div>

                {test?.subjects?.name && (
                  <Badge variant="secondary">{test.subjects.name}</Badge>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-background rounded-lg">
                    <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                    <p className="font-medium">{test?.duration_minutes} mins</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <Target className="w-4 h-4 text-muted-foreground mb-1" />
                    <p className="font-medium">{test?.total_questions}</p>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <Award className="w-4 h-4 text-muted-foreground mb-1" />
                    <p className="font-medium">{test?.total_marks}</p>
                    <p className="text-xs text-muted-foreground">Total Marks</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground mb-1" />
                    <p className="font-medium">{test?.pass_marks}%</p>
                    <p className="text-xs text-muted-foreground">Pass Marks</p>
                  </div>
                </div>

                {test?.anti_cheat_enabled && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                      <Shield className="w-4 h-4" />
                      Anti-Cheat Enabled
                    </div>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      {test.fullscreen_required && <li>• Fullscreen required</li>}
                      <li>• Tab switching monitored</li>
                      <li>• Copy/paste disabled</li>
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Settings</h4>
                  <div className="flex flex-wrap gap-1">
                    {test?.shuffle_questions && <Badge variant="outline" className="text-xs">Shuffle Q</Badge>}
                    {test?.shuffle_options && <Badge variant="outline" className="text-xs">Shuffle Opt</Badge>}
                    {test?.show_results && <Badge variant="outline" className="text-xs">Show Results</Badge>}
                    {test?.show_answers && <Badge variant="outline" className="text-xs">Show Answers</Badge>}
                  </div>
                </div>

                {/* Question Navigator */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Questions</h4>
                  <div className="grid grid-cols-5 gap-1">
                    {questions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                          idx === currentIndex
                            ? 'bg-primary text-primary-foreground'
                            : selectedAnswers[questions[idx]?.id]
                            ? 'bg-accent/20 text-accent'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Preview */}
            <div className="col-span-2 flex flex-col">
              <ScrollArea className="flex-1 p-6">
                {currentQuestion && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Question {currentIndex + 1} of {questions.length}</Badge>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{currentQuestion.difficulty}</Badge>
                        <Badge>{currentQuestion.marks} marks</Badge>
                      </div>
                    </div>

                    <Card>
                      <CardContent className="p-6">
                        <p className="text-lg font-medium mb-6">{currentQuestion.question_text}</p>

                        {(currentQuestion.question_type === 'mcq_single' || currentQuestion.question_type === 'true_false') ? (
                          <RadioGroup
                            value={selectedAnswers[currentQuestion.id]?.[0] || ''}
                            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value, currentQuestion.question_type)}
                          >
                            <div className="space-y-3">
                              {currentQuestion.options.map((option, idx) => (
                                <div
                                  key={option.id}
                                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                >
                                  <RadioGroupItem value={option.id} id={option.id} />
                                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                                    {option.option_text}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        ) : (
                          <div className="space-y-3">
                            {currentQuestion.options.map((option, idx) => (
                              <div
                                key={option.id}
                                className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                onClick={() => handleAnswerSelect(currentQuestion.id, option.id, currentQuestion.question_type)}
                              >
                                <Checkbox
                                  checked={selectedAnswers[currentQuestion.id]?.includes(option.id)}
                                  onCheckedChange={() => handleAnswerSelect(currentQuestion.id, option.id, currentQuestion.question_type)}
                                />
                                <Label className="flex-1 cursor-pointer">
                                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                                  {option.option_text}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </ScrollArea>

              {/* Navigation */}
              <div className="p-4 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {Object.keys(selectedAnswers).length} of {questions.length} answered
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
