import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  BookOpen, 
  AlertCircle,
  Filter,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

// --- Interfaces ---

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_text: string;
  explanation: string | null;
  difficulty: string;
  marks: number;
  question_options: QuestionOption[];
}

interface StudentAnswer {
  question_id: string;
  selected_options: string[];
  is_correct: boolean;
  marks_obtained: number;
}

interface MergedQuestionData {
  question: Question;
  answer: StudentAnswer | null;
  status: 'correct' | 'incorrect' | 'skipped' | 'unvisited';
}

interface TestHeader {
  title: string;
  subject: string;
}

export default function StudentTestExplanations() {
  const { id: attemptId } = useParams<{ id: string }>();
  const [mergedData, setMergedData] = useState<MergedQuestionData[]>([]);
  const [testInfo, setTestInfo] = useState<TestHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [showUnattempted, setShowUnattempted] = useState(true);

  useEffect(() => {
    if (attemptId) fetchFullTestDetails();
  }, [attemptId]);

  const fetchFullTestDetails = async () => {
    try {
      setIsLoading(true);

      // 1. Get Attempt Info
      const { data: attempt, error: attemptError } = await supabase
        .from('student_test_attempts')
        .select(`
          test_id, 
          tests (
            title, 
            subjects (name)
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      setTestInfo({
        title: attempt.tests?.title || 'Test Results',
        subject: attempt.tests?.subjects?.name || 'General'
      });

      const testId = attempt.test_id;

      // 2. Fetch User's Answers (Source of Truth for what was seen)
      // We join questions and options here directly
      const { data: answersData, error: answersError } = await supabase
        .from('student_answers')
        .select(`
          question_id,
          selected_options,
          is_correct,
          marks_obtained,
          questions (
            id,
            question_text,
            explanation,
            difficulty,
            marks,
            question_options (
              id,
              option_text,
              is_correct
            )
          )
        `)
        .eq('attempt_id', attemptId);

      if (answersError) throw answersError;

      // 3. Try to fetch ALL questions from test_questions (for Unvisited ones)
      // This might return empty if it's a dynamic test
      const { data: testQuestionsLink } = await supabase
        .from('test_questions')
        .select(`
          questions (
            id,
            question_text,
            explanation,
            difficulty,
            marks,
            question_options (
              id,
              option_text,
              is_correct
            )
          )
        `)
        .eq('test_id', testId);

      // 4. MERGE STRATEGY
      // Create a Map of all known questions
      const questionMap = new Map<string, Question>();

      // A. Add questions found in test_questions (if any)
      if (testQuestionsLink) {
        testQuestionsLink.forEach((item: any) => {
          if (item.questions) {
            questionMap.set(item.questions.id, item.questions);
          }
        });
      }

      // B. Add/Overwrite with questions found in student_answers 
      // (This ensures we have the questions even if test_questions was empty)
      answersData?.forEach((item: any) => {
        if (item.questions) {
          questionMap.set(item.questions.id, item.questions);
        }
      });

      const allUniqueQuestions = Array.from(questionMap.values());

      // 5. Build Final Data Structure
      const merged: MergedQuestionData[] = allUniqueQuestions.map((q) => {
        // Find the user's answer for this question
        const userAnsRaw = answersData?.find(a => a.question_id === q.id);
        
        let answerObj: StudentAnswer | null = null;
        let status: MergedQuestionData['status'] = 'unvisited';

        if (userAnsRaw) {
          answerObj = {
            question_id: userAnsRaw.question_id,
            selected_options: userAnsRaw.selected_options || [],
            is_correct: userAnsRaw.is_correct,
            marks_obtained: userAnsRaw.marks_obtained
          };

          if (userAnsRaw.selected_options && userAnsRaw.selected_options.length > 0) {
            status = userAnsRaw.is_correct ? 'correct' : 'incorrect';
          } else {
            status = 'skipped'; // Row exists but no option selected
          }
        }

        return {
          question: q,
          answer: answerObj,
          status
        };
      });

      // Sort by status for better visibility? Or keep ID order.
      // Let's sort by: Correct/Incorrect first, then Skipped/Unvisited
      // Or just keep database order. Let's keep it simple.
      setMergedData(merged);

    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error("Failed to load explanations");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Logic
  const filteredList = useMemo(() => {
    return mergedData.filter(item => {
      // 1. Check Unattempted Visibility
      if (!showUnattempted) {
        if (item.status === 'skipped' || item.status === 'unvisited') return false;
      }

      // 2. Check Tab Filter
      if (filterType === 'all') return true;
      if (filterType === 'correct') return item.status === 'correct';
      if (filterType === 'incorrect') return item.status === 'incorrect';
      
      return true;
    });
  }, [mergedData, filterType, showUnattempted]);

  const scrollToQuestion = (questionId: string) => {
    const element = document.getElementById(`q-${questionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur py-4 border-b space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to={`/student/results/${attemptId}`} className="hover:text-foreground flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back to Results
                </Link>
                <span>/</span>
                <span>{testInfo?.subject}</span>
              </div>
              <h1 className="text-2xl font-bold">{testInfo?.title}</h1>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium px-2">
                {showUnattempted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <span className="hidden md:inline">View Mode:</span>
              </div>
              <div className="flex gap-1 bg-muted p-1 rounded-md">
                <Button 
                  size="sm" 
                  variant={showUnattempted ? "default" : "ghost"}
                  onClick={() => setShowUnattempted(true)}
                  className="text-xs h-8"
                >
                  All Questions
                </Button>
                <Button 
                  size="sm" 
                  variant={!showUnattempted ? "default" : "ghost"}
                  onClick={() => setShowUnattempted(false)}
                  className="text-xs h-8"
                >
                  Attempted Only
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="all" value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
              <TabsTrigger value="all">
                All
              </TabsTrigger>
              <TabsTrigger value="correct" className="text-green-600">Correct</TabsTrigger>
              <TabsTrigger value="incorrect" className="text-red-600">Incorrect</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* QUESTIONS LIST */}
          <div className="lg:col-span-8 space-y-8">
            {filteredList.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No questions found matching your selection.</p>
                {!showUnattempted && (
                  <Button variant="link" onClick={() => setShowUnattempted(true)} className="mt-2">
                    Show Unattempted Questions
                  </Button>
                )}
              </Card>
            ) : (
              filteredList.map((item, index) => {
                const { question, answer, status } = item;
                const isCorrect = status === 'correct';
                const isSkipped = status === 'skipped' || status === 'unvisited';
                const selectedIds = answer?.selected_options || [];

                return (
                  <Card key={question.id} id={`q-${question.id}`} 
                    className="scroll-mt-48 overflow-hidden border-l-4 shadow-sm transition-all"
                    style={{ 
                      borderLeftColor: isCorrect ? '#22c55e' : isSkipped ? '#94a3b8' : '#ef4444' 
                    }}
                  >
                    <CardHeader className="bg-muted/30 pb-4 py-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-background border text-sm font-bold shadow-sm">
                            {mergedData.findIndex(d => d.question.id === question.id) + 1}
                          </span>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {status === 'correct' && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                                <CheckCircle className="w-3 h-3"/> Correct
                              </Badge>
                            )}
                            {status === 'incorrect' && (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3"/> Incorrect
                              </Badge>
                            )}
                            {(status === 'skipped' || status === 'unvisited') && (
                              <Badge variant="secondary" className="gap-1 text-muted-foreground">
                                <HelpCircle className="w-3 h-3"/> {status === 'unvisited' ? 'Not Seen' : 'Skipped'}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium text-muted-foreground whitespace-nowrap">
                          {answer?.marks_obtained || 0} / {question.marks} Marks
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-6 space-y-6">
                      <div className="text-lg font-medium leading-relaxed">
                        {question.question_text}
                      </div>

                      <div className="grid gap-3">
                        {question.question_options?.map((option) => {
                          const isSelected = selectedIds.includes(option.id);
                          const isCorrectOption = option.is_correct;
                          
                          let optionClass = "p-4 rounded-lg border flex items-start gap-3 transition-colors ";
                          
                          if (isCorrectOption) {
                            optionClass += "bg-green-50/50 border-green-200 text-green-900";
                          } else if (isSelected && !isCorrectOption) {
                            optionClass += "bg-red-50/50 border-red-200 text-red-900";
                          } else {
                            optionClass += "bg-card hover:bg-muted/50 border-muted";
                          }

                          return (
                            <div key={option.id} className={optionClass}>
                              <div className="mt-0.5">
                                {isCorrectOption ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : isSelected ? (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span className={isCorrectOption || isSelected ? "font-medium" : ""}>
                                  {option.option_text}
                                </span>
                                {isCorrectOption && (
                                  <span className="block text-xs font-bold text-green-600 mt-1 uppercase tracking-wider">
                                    Correct Answer
                                  </span>
                                )}
                                {isSelected && !isCorrectOption && (
                                  <span className="block text-xs font-bold text-red-500 mt-1 uppercase tracking-wider">
                                    Your Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-400 font-semibold">
                            <BookOpen className="w-5 h-5" />
                            <span>Explanation</span>
                          </div>
                          {question.explanation ? (
                            <div className="text-muted-foreground leading-relaxed text-sm md:text-base">
                              {question.explanation}
                            </div>
                          ) : (
                            <div className="text-muted-foreground italic text-sm flex items-center gap-2 opacity-60">
                              <AlertCircle className="w-4 h-4" /> No detailed explanation available.
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* NAVIGATOR SIDEBAR */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-40 space-y-4">
              <Card>
                <CardHeader className="pb-3 bg-muted/20">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Navigator
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ScrollArea className="h-[calc(100vh-350px)] pr-2">
                    <div className="grid grid-cols-5 gap-2">
                      {mergedData.map((item, idx) => {
                        const { status, question } = item;
                        const isHiddenByToggle = !showUnattempted && (status === 'skipped' || status === 'unvisited');
                        
                        let btnColor = "bg-muted text-muted-foreground border-transparent hover:bg-muted-foreground/20"; 
                        if (status === 'correct') btnColor = "bg-green-100 text-green-700 border-green-200 hover:bg-green-200";
                        else if (status === 'incorrect') btnColor = "bg-red-100 text-red-700 border-red-200 hover:bg-red-200";
                        else if (status === 'unvisited') btnColor = "bg-slate-100 text-slate-400 border-slate-200";

                        return (
                          <button
                            key={question.id}
                            onClick={() => !isHiddenByToggle && scrollToQuestion(question.id)}
                            disabled={isHiddenByToggle}
                            className={`
                              h-9 w-full rounded-md text-xs font-bold transition-all border
                              ${btnColor}
                              ${isHiddenByToggle ? 'opacity-10 cursor-not-allowed' : ''}
                            `}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  <div className="mt-6 space-y-2 text-xs text-muted-foreground border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded" /> Correct</span>
                      <span className="font-mono">{mergedData.filter(d => d.status === 'correct').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded" /> Incorrect</span>
                      <span className="font-mono">{mergedData.filter(d => d.status === 'incorrect').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><div className="w-3 h-3 bg-muted border border-muted-foreground/30 rounded" /> Skipped/Unseen</span>
                      <span className="font-mono">{mergedData.filter(d => d.status === 'skipped' || d.status === 'unvisited').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" className="w-full" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <ArrowUp className="w-4 h-4 mr-2" /> Back to Top
              </Button>
            </div>
          </div>

        </div>
      </div>
    </StudentLayout>
  );
}