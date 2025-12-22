import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { TestPreview } from '@/components/admin/TestPreview';
import {
  Plus,
  ClipboardList,
  Settings,
  Users,
  Calendar,
  Clock,
  Target,
  Shield,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  UserCircle,
  ShieldCheck,
} from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description: string | null;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  total_questions: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  subject_id: string | null;
  subjects?: { name: string } | null;
}

interface Question {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  subject_id: string;
  topic_id: string;
  subjects?: { name: string } | null;
  topics?: { name: string } | null;
}

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

export default function AdminTests() {
  const location = useLocation();
  const role = location.pathname.startsWith('/mentor') ? 'mentor' : 'admin';
  const { user } = useAuth();
  
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Filter State
  const [testSourceFilter, setTestSourceFilter] = useState<string>('all');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTestId, setPreviewTestId] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [questionFilterTopic, setQuestionFilterTopic] = useState<string>('all');
  const [filteredTopicsForQuestions, setFilteredTopicsForQuestions] = useState<Topic[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    test_type: 'mixed',
    duration_minutes: 60,
    total_marks: 100,
    pass_marks: 40,
    subject_id: '',
    max_attempts: 1,
    shuffle_questions: true,
    shuffle_options: true,
    show_results: true,
    show_answers: false,
    allow_navigation: true,
    allow_review: true,
    question_by_question: false,
    auto_submit: true,
    anti_cheat_enabled: true,
    fullscreen_required: true,
    tab_switch_limit: 3,
    watermark_enabled: true,
    easy_percentage: 30,
    medium_percentage: 50,
    hard_percentage: 20,
    is_public: false,
    is_anytime: true,
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.subject_id) {
      setFilteredTopicsForQuestions(topics.filter(t => t.subject_id === formData.subject_id));
    } else {
      setFilteredTopicsForQuestions([]);
    }
    setQuestionFilterTopic('all');
  }, [formData.subject_id, topics]);

  const fetchData = async () => {
    try {
      const [testsRes, questionsRes, subjectsRes, topicsRes, studentsRes] = await Promise.all([
        supabase.from('tests').select('*, subjects(name)').order('created_at', { ascending: false }),
        supabase.from('questions').select('*, subjects(name), topics(name)').eq('is_active', true),
        supabase.from('subjects').select('*').eq('is_active', true),
        supabase.from('topics').select('*').eq('is_active', true),
        supabase.from('profiles').select('*'),
      ]);

      if (testsRes.data) setTests(testsRes.data);
      if (questionsRes.data) setQuestions(questionsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      
      if (studentsRes.data) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'student');
        
        const studentUserIds = roles?.map(r => r.user_id) || [];
        const studentProfiles = studentsRes.data.filter(p => studentUserIds.includes(p.user_id));
        setStudents(studentProfiles.map(p => ({ id: p.id, user_id: p.user_id, full_name: p.full_name, email: p.email })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!formData.title || selectedQuestions.length === 0) {
      toast.error('Please fill in the title and select at least one question');
      return;
    }

    try {
      const totalMarks = selectedQuestions.reduce((sum, qId) => {
        const q = questions.find(q => q.id === qId);
        return sum + (q?.marks || 0);
      }, 0);

      const { data: newTest, error: testError } = await supabase
        .from('tests')
        .insert({
          ...formData,
          total_questions: selectedQuestions.length,
          total_marks: totalMarks,
          created_by: user?.id,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
        })
        .select()
        .single();

      if (testError) throw testError;

      const testQuestions = selectedQuestions.map((qId, index) => ({
        test_id: newTest.id,
        question_id: qId,
        sort_order: index,
      }));

      const { error: questionsError } = await supabase
        .from('test_questions')
        .insert(testQuestions);

      if (questionsError) throw questionsError;

      toast.success('Test created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating test:', error);
      toast.error(error.message || 'Failed to create test');
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTest || selectedStudents.length === 0) {
      toast.error('Please select students to assign');
      return;
    }

    try {
      for (const studentUserId of selectedStudents) {
        await supabase
          .from('test_assignments')
          .delete()
          .eq('test_id', selectedTest.id)
          .eq('user_id', studentUserId);

        await supabase
          .from('test_assignments')
          .insert({
            test_id: selectedTest.id,
            user_id: studentUserId,
            assigned_by: user?.id,
            is_completed: false,
          });
      }

      toast.success(`Test assigned to ${selectedStudents.length} student(s)`);
      setIsAssignDialogOpen(false);
      setSelectedStudents([]);
      setSelectedTest(null);
    } catch (error: any) {
      console.error('Error assigning test:', error);
      toast.error(error.message || 'Failed to assign test');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (error) throw error;
      toast.success('Test deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting test:', error);
      toast.error(error.message || 'Failed to delete test');
    }
  };

  const handleToggleActive = async (test: Test) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_active: !test.is_active })
        .eq('id', test.id);
      
      if (error) throw error;
      toast.success(`Test ${test.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update test');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      test_type: 'mixed',
      duration_minutes: 60,
      total_marks: 100,
      pass_marks: 40,
      subject_id: '',
      max_attempts: 1,
      shuffle_questions: true,
      shuffle_options: true,
      show_results: true,
      show_answers: false,
      allow_navigation: true,
      allow_review: true,
      question_by_question: false,
      auto_submit: true,
      anti_cheat_enabled: true,
      fullscreen_required: true,
      tab_switch_limit: 3,
      watermark_enabled: true,
      easy_percentage: 30,
      medium_percentage: 50,
      hard_percentage: 20,
      is_public: false,
      is_anytime: true,
      start_time: '',
      end_time: '',
    });
    setSelectedQuestions([]);
  };

  // UPDATED FILTERING LOGIC
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if generated by student (Weak Area Test)
    const isStudentGenerated = test.test_type === 'weak_areas' || test.title.includes('Weak Areas Test');
    
    let matchesSource = true;
    if (testSourceFilter === 'student') {
      matchesSource = isStudentGenerated;
    } else if (testSourceFilter === 'admin') {
      matchesSource = !isStudentGenerated;
    }

    return matchesSearch && matchesSource;
  });

  const filteredQuestions = questions.filter(q => {
    const matchesSubject = !formData.subject_id || q.subject_id === formData.subject_id;
    const matchesTopic = questionFilterTopic === 'all' || q.topic_id === questionFilterTopic;
    return matchesSubject && matchesTopic;
  });

  const handlePreviewTest = (testId: string) => {
    setPreviewTestId(testId);
    setIsPreviewOpen(true);
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              Test Management
            </h1>
            <p className="text-sidebar-foreground/70 mt-1">Create, manage, and assign tests</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="admin" onClick={() => resetForm()}>
                <Plus size={18} />
                Create Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="questions">Questions</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="anticheat">Anti-Cheat</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid gap-4">
                      <div>
                        <Label>Test Title *</Label>
                        <Input
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Enter test title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Enter test description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Subject (Optional)</Label>
                          <Select
                            value={formData.subject_id || "all"}
                            onValueChange={v => setFormData({ ...formData, subject_id: v === "all" ? "" : v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All subjects" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Subjects</SelectItem>
                              {subjects.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Test Type</Label>
                          <Select
                            value={formData.test_type}
                            onValueChange={v => setFormData({ ...formData, test_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="subject">Subject Test</SelectItem>
                              <SelectItem value="topic">Topic Test</SelectItem>
                              <SelectItem value="mixed">Mixed Test</SelectItem>
                              <SelectItem value="weak_areas">Weak Areas Test</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={formData.duration_minutes}
                            onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                          />
                        </div>
                        <div>
                          <Label>Pass Marks (%)</Label>
                          <Input
                            type="number"
                            value={formData.pass_marks}
                            onChange={e => setFormData({ ...formData, pass_marks: parseInt(e.target.value) || 40 })}
                          />
                        </div>
                        <div>
                          <Label>Max Attempts</Label>
                          <Input
                            type="number"
                            value={formData.max_attempts}
                            onChange={e => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={formData.is_anytime}
                            onCheckedChange={c => setFormData({ ...formData, is_anytime: c })}
                          />
                          <Label>Available Anytime</Label>
                        </div>
                      </div>
                      {!formData.is_anytime && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="datetime-local"
                              value={formData.start_time}
                              onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="datetime-local"
                              value={formData.end_time}
                              onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="questions" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedQuestions.length} questions | Available: {filteredQuestions.length}
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline">Easy: {formData.easy_percentage}%</Badge>
                        <Badge variant="outline">Medium: {formData.medium_percentage}%</Badge>
                        <Badge variant="outline">Hard: {formData.hard_percentage}%</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={questionFilterTopic}
                        onValueChange={setQuestionFilterTopic}
                        disabled={!formData.subject_id}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Topics</SelectItem>
                          {filteredTopicsForQuestions.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = filteredQuestions.map(q => q.id);
                          setSelectedQuestions([...new Set([...selectedQuestions, ...allIds])]);
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedQuestions([])}
                      >
                        Clear
                      </Button>
                    </div>

                    <ScrollArea className="h-[280px] border rounded-lg p-4">
                      {filteredQuestions.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          No questions found. {!formData.subject_id && 'Select a subject first.'}
                        </div>
                      ) : (
                        filteredQuestions.map(q => (
                          <div
                            key={q.id}
                            className="flex items-start gap-3 p-3 border-b last:border-0 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={selectedQuestions.includes(q.id)}
                              onCheckedChange={checked => {
                                if (checked) {
                                  setSelectedQuestions([...selectedQuestions, q.id]);
                                } else {
                                  setSelectedQuestions(selectedQuestions.filter(id => id !== q.id));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{q.question_text}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {q.subjects?.name}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {q.topics?.name}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {q.difficulty}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {q.marks} marks
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Shuffle Questions</Label>
                        <Switch
                          checked={formData.shuffle_questions}
                          onCheckedChange={c => setFormData({ ...formData, shuffle_questions: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Shuffle Options</Label>
                        <Switch
                          checked={formData.shuffle_options}
                          onCheckedChange={c => setFormData({ ...formData, shuffle_options: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Show Results</Label>
                        <Switch
                          checked={formData.show_results}
                          onCheckedChange={c => setFormData({ ...formData, show_results: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Show Answers</Label>
                        <Switch
                          checked={formData.show_answers}
                          onCheckedChange={c => setFormData({ ...formData, show_answers: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Allow Navigation</Label>
                        <Switch
                          checked={formData.allow_navigation}
                          onCheckedChange={c => setFormData({ ...formData, allow_navigation: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Allow Review</Label>
                        <Switch
                          checked={formData.allow_review}
                          onCheckedChange={c => setFormData({ ...formData, allow_review: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Question by Question</Label>
                        <Switch
                          checked={formData.question_by_question}
                          onCheckedChange={c => setFormData({ ...formData, question_by_question: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label>Auto Submit</Label>
                        <Switch
                          checked={formData.auto_submit}
                          onCheckedChange={c => setFormData({ ...formData, auto_submit: c })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="anticheat" className="space-y-4 mt-4">
                    <Card variant="admin">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Shield className="w-5 h-5 text-destructive" />
                          Anti-Cheat Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Enable Anti-Cheat</Label>
                            <Switch
                              checked={formData.anti_cheat_enabled}
                              onCheckedChange={c => setFormData({ ...formData, anti_cheat_enabled: c })}
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Fullscreen Required</Label>
                            <Switch
                              checked={formData.fullscreen_required}
                              onCheckedChange={c => setFormData({ ...formData, fullscreen_required: c })}
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Enable Watermark</Label>
                            <Switch
                              checked={formData.watermark_enabled}
                              onCheckedChange={c => setFormData({ ...formData, watermark_enabled: c })}
                            />
                          </div>
                          <div className="p-3 border rounded-lg">
                            <Label>Tab Switch Limit</Label>
                            <Input
                              type="number"
                              value={formData.tab_switch_limit}
                              onChange={e => setFormData({ ...formData, tab_switch_limit: parseInt(e.target.value) || 3 })}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                          <p className="font-medium">When enabled, the following will be monitored:</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Tab switching detection</li>
                            <li>Fullscreen exit detection</li>
                            <li>Copy/paste prevention</li>
                            <li>Right-click prevention</li>
                            <li>DevTools detection</li>
                            <li>Page reload/back button detection</li>
                            <li>Network disconnect detection</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="admin" onClick={handleCreateTest}>
                    Create Test
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and NEW SOURCE FILTER */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="w-full md:w-[250px]">
            <Select value={testSourceFilter} onValueChange={setTestSourceFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="All Tests" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tests</SelectItem>
                <SelectItem value="admin">Admin Generated Tests</SelectItem>
                <SelectItem value="student">Generated By Students</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tests Grid */}
        <div className="grid gap-4">
          {filteredTests.length === 0 ? (
            <Card variant="admin">
              <CardContent className="p-12 text-center">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2 text-sidebar-foreground">No tests found</h3>
                <p className="text-sidebar-foreground/70">Check your filters or create a new test</p>
              </CardContent>
            </Card>
          ) : (
            filteredTests.map(test => {
              const isStudentGen = test.test_type === 'weak_areas' || test.title.includes('Weak Areas Test');
              
              return (
                <Card key={test.id} variant="admin">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-sidebar-foreground">{test.title}</h3>
                          <Badge variant={test.is_active ? 'default' : 'secondary'}>
                            {test.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          
                          {/* Visual indicator for Source */}
                          {isStudentGen ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 gap-1">
                              <UserCircle size={12} /> Student Generated
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 gap-1">
                              <ShieldCheck size={12} /> Admin
                            </Badge>
                          )}

                          {test.is_public && (
                            <Badge variant="outline">Public</Badge>
                          )}
                        </div>
                        <p className="text-sm text-sidebar-foreground/70 mb-3">
                          {test.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-sidebar-foreground/70">
                          <span className="flex items-center gap-1">
                            <Target size={14} />
                            {test.total_questions} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {test.duration_minutes} mins
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {format(new Date(test.created_at), 'MMM d, yyyy')}
                          </span>
                          {test.subjects && (
                            <Badge variant="outline" className='text-[white]'>{test.subjects.name}</Badge>  
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          className="text-[black]"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewTest(test.id)}
                        >
                          <Eye size={16} />
                          Preview
                        </Button>
                        <Button className="text-[black]"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTest(test);
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          <Users size={16} />
                          Assign
                        </Button>
                        <Button className="text-[black]"
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(test)}
                        >
                          {test.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                        </Button>
                        {role === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTest(test.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Assign Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Test to Students</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assigning: <strong>{selectedTest?.title}</strong>
            </p>

            {/* Select All Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg border">
              <Checkbox
                id="select-all"
                checked={selectedStudents.length === students.length && students.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedStudents(students.map((s) => s.user_id));
                  } else {
                    setSelectedStudents([]);
                  }
                }}
              />
              <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer">
                Select All Students ({students.length})
              </label>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 border-b last:border-0"
                >
                  <Checkbox
                    checked={selectedStudents.includes(student.user_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStudents([...selectedStudents, student.user_id]);
                      } else {
                        setSelectedStudents(selectedStudents.filter((id) => id !== student.user_id));
                      }
                    }}
                  />
                  <div>
                    <p className="font-medium">{student.full_name}</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="admin" onClick={handleAssignTest} disabled={selectedStudents.length === 0}>
                Assign ({selectedStudents.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        {/* Test Preview */}
        <TestPreview 
          testId={previewTestId} 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
        />
      </div>
    </AdminLayout>
  );
} 