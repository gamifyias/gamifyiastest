import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Calendar,
  Timer,
  Target,
  Star,
  Play,
  Loader2,
  BookOpen
} from 'lucide-react';

interface AvailableTest {
  id: string;
  title: string;
  subject_name: string;
  total_questions: number;
  duration_minutes: number;
  due_date: string | null;
  attempts_used: number;
  max_attempts: number;
}

interface CompletedTest {
  id: string;
  title: string;
  subject_name: string;
  score: number;
  total_marks: number;
  date: string;
  passed: boolean;
  attempt_id: string;
}

interface InProgressTest {
  id: string;
  title: string;
  subject_name: string;
  progress: number;
  attempt_id: string;
}

export default function StudentTests() {
  const { user } = useAuth();
  const [availableTests, setAvailableTests] = useState<AvailableTest[]>([]);
  const [completedTests, setCompletedTests] = useState<CompletedTest[]>([]);
  const [inProgressTests, setInProgressTests] = useState<InProgressTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTests();
    }
  }, [user?.id]);

  const fetchTests = async () => {
    try {
      // Fetch test assignments for the user
      const { data: assignments } = await supabase
        .from('test_assignments')
        .select(`
          *,
          tests (
            id, 
            title, 
            total_questions, 
            duration_minutes, 
            max_attempts,
            pass_marks,
            total_marks,
            subject_id,
            subjects (name)
          )
        `)
        .eq('user_id', user!.id);

      // Fetch user's test attempts
      const { data: attempts } = await supabase
        .from('student_test_attempts')
        .select('*, tests(title, subjects(name))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Process available tests (assigned but not completed)
      const available: AvailableTest[] = [];
      const inProgress: InProgressTest[] = [];
      const completed: CompletedTest[] = [];

      for (const assignment of assignments || []) {
        const test = assignment.tests as any;
        if (!test) continue;

        const testAttempts = attempts?.filter(a => a.test_id === test.id) || [];
        const completedAttempts = testAttempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted');
        const activeAttempt = testAttempts.find(a => a.status === 'in_progress');

        if (activeAttempt) {
          // Test is in progress
          inProgress.push({
            id: test.id,
            title: test.title,
            subject_name: test.subjects?.name || 'Unknown',
            progress: Math.round((activeAttempt.attempted_questions || 0) / (test.total_questions || 1) * 100),
            attempt_id: activeAttempt.id,
          });
        } else if (completedAttempts.length < (test.max_attempts || 1)) {
          // Test is available
          available.push({
            id: test.id,
            title: test.title,
            subject_name: test.subjects?.name || 'Unknown',
            total_questions: test.total_questions || 0,
            duration_minutes: test.duration_minutes || 60,
            due_date: assignment.due_date,
            attempts_used: completedAttempts.length,
            max_attempts: test.max_attempts || 1,
          });
        }

        // Add completed attempts
        for (const attempt of completedAttempts) {
          completed.push({
            id: test.id,
            title: test.title,
            subject_name: test.subjects?.name || 'Unknown',
            score: attempt.percentage || 0,
            total_marks: attempt.total_marks || 100,
            date: attempt.submitted_at || attempt.created_at,
            passed: attempt.is_passed || false,
            attempt_id: attempt.id,
          });
        }
      }

      setAvailableTests(available);
      setInProgressTests(inProgress);
      setCompletedTests(completed);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to group tests by subject
  const groupTestsBySubject = <T extends { subject_name: string }>(tests: T[]) => {
    return tests.reduce((groups, test) => {
      const subject = test.subject_name;
      if (!groups[subject]) {
        groups[subject] = [];
      }
      groups[subject].push(test);
      return groups;
    }, {} as Record<string, T[]>);
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

  // Group data
  const groupedAvailable = groupTestsBySubject(availableTests);
  const groupedInProgress = groupTestsBySubject(inProgressTests);
  const groupedCompleted = groupTestsBySubject(completedTests);

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-game flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-secondary" />
            My Tests
          </h1>
          <p className="text-muted-foreground mt-1">
            View, take, and track all your assigned tests
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="default">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{availableTests.length}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-game-gold/20 flex items-center justify-center">
                <Timer className="w-5 h-5 text-game-gold" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inProgressTests.length}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-game-pipe/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-game-pipe" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedTests.filter(t => t.passed).length}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedTests.filter(t => !t.passed).length}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="available" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="available" className="gap-2">
              <ClipboardList size={16} />
              Available
            </TabsTrigger>
            <TabsTrigger value="inProgress" className="gap-2">
              <Timer size={16} />
              In Progress
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle size={16} />
              Completed
            </TabsTrigger>
          </TabsList>

          {/* Available Tests - Grouped by Subject */}
          <TabsContent value="available" className="space-y-4">
            {availableTests.length === 0 ? (
              <Card variant="default">
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No tests available</h3>
                  <p className="text-muted-foreground">Check back later for new assignments</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" defaultValue={Object.keys(groupedAvailable)} className="space-y-4">
                {Object.entries(groupedAvailable).map(([subject, tests]) => (
                  <AccordionItem key={subject} value={subject} className="border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-lg font-semibold">{subject}</span>
                        <Badge variant="secondary" className="ml-2">{tests.length} Tests</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="space-y-4">
                        {tests.map((test) => (
                          <Card key={test.id} variant="interactive" className="border-l-4 border-l-primary">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold">{test.title}</h3>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Target size={14} />
                                      {test.total_questions} questions
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} />
                                      {test.duration_minutes} mins
                                    </span>
                                    {test.due_date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        Due: {format(new Date(test.due_date), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Star size={14} />
                                      Attempts: {test.attempts_used}/{test.max_attempts}
                                    </span>
                                  </div>
                                </div>
                                <Link to={`/student/test/${test.id}`}>
                                  <Button variant="game" size="lg">
                                    <Play size={18} />
                                    Start Test
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          {/* In Progress Tests - Grouped by Subject */}
          <TabsContent value="inProgress" className="space-y-4">
            {inProgressTests.length === 0 ? (
              <Card variant="default">
                <CardContent className="p-12 text-center">
                  <Timer className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No tests in progress</h3>
                  <p className="text-muted-foreground">Start a test from the Available tab</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" defaultValue={Object.keys(groupedInProgress)} className="space-y-4">
                {Object.entries(groupedInProgress).map(([subject, tests]) => (
                   <AccordionItem key={subject} value={subject} className="border rounded-lg bg-card px-4">
                   <AccordionTrigger className="hover:no-underline py-4">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-game-gold/10 flex items-center justify-center">
                         <Timer className="w-4 h-4 text-game-gold" />
                       </div>
                       <span className="text-lg font-semibold">{subject}</span>
                       <Badge variant="outline" className="ml-2 border-game-gold text-game-gold">{tests.length} Active</Badge>
                     </div>
                   </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="space-y-4">
                        {tests.map((test) => (
                          <Card key={test.id} variant="gameHighlight">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold mb-2">{test.title}</h3>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span>Progress</span>
                                      <span className="font-medium">{test.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-game-gold to-game-star rounded-full"
                                        style={{ width: `${test.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <Link to={`/student/test/${test.id}`}>
                                  <Button variant="game" size="lg">
                                    <ArrowRight size={18} />
                                    Continue
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          {/* Completed Tests - Grouped by Subject */}
          <TabsContent value="completed" className="space-y-4">
            {completedTests.length === 0 ? (
              <Card variant="default">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No completed tests yet</h3>
                  <p className="text-muted-foreground">Complete a test to see your results here</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" defaultValue={Object.keys(groupedCompleted)} className="space-y-4">
                {Object.entries(groupedCompleted).map(([subject, tests]) => (
                   <AccordionItem key={subject} value={subject} className="border rounded-lg bg-card px-4">
                   <AccordionTrigger className="hover:no-underline py-4">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-game-pipe/10 flex items-center justify-center">
                         <CheckCircle className="w-4 h-4 text-game-pipe" />
                       </div>
                       <span className="text-lg font-semibold">{subject}</span>
                       <Badge variant="outline" className="ml-2">{tests.length} Completed</Badge>
                     </div>
                   </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="space-y-4">
                        {tests.map((test, index) => (
                          <Card key={`${test.attempt_id}-${index}`} variant="default">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold">{test.title}</h3>
                                    <Badge 
                                      variant="outline" 
                                      className={test.passed 
                                        ? 'bg-game-pipe/20 text-game-pipe border-game-pipe/30' 
                                        : 'bg-destructive/20 text-destructive border-destructive/30'
                                      }
                                    >
                                      {test.passed ? 'Passed' : 'Failed'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar size={14} />
                                    Completed: {format(new Date(test.date), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <div className={`text-3xl font-bold ${test.passed ? 'text-game-pipe' : 'text-destructive'}`}>
                                      {Math.round(test.score)}%
                                    </div>
                                  </div>
                                  <Link to={`/student/results/${test.attempt_id}`}>
                                    <Button variant="outline">
                                      View Details
                                      <ArrowRight size={16} />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}