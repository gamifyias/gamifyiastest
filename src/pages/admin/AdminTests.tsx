import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { TestPreview } from '@/components/auth/admin/TestPreview';
import {
  Plus,
  ClipboardList,
  Users,
  Calendar,
  Clock,
  Target,
  Shield,
  Search,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Filter,
  UserCircle,
  ShieldCheck,
  Edit,
  Layers,
} from 'lucide-react';

// --- Interfaces ---
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
  max_attempts?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_results?: boolean;
  show_answers?: boolean;
  allow_navigation?: boolean;
  allow_review?: boolean;
  question_by_question?: boolean;
  auto_submit?: boolean;
  anti_cheat_enabled?: boolean;
  fullscreen_required?: boolean;
  tab_switch_limit?: number;
  watermark_enabled?: boolean;
  is_anytime?: boolean;
  start_time?: string;
  end_time?: string;
  easy_percentage?: number;
  medium_percentage?: number;
  hard_percentage?: number;
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
  
  // --- State ---
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]); // This now holds dynamically fetched questions
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false); // Loading state for questions tab
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [testSourceFilter, setTestSourceFilter] = useState<string>('all');
  const [questionFilterTopic, setQuestionFilterTopic] = useState<string>('all');
  const [filteredTopicsForQuestions, setFilteredTopicsForQuestions] = useState<Topic[]>([]);
  
  // Dialogs & Selection
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [previewTestId, setPreviewTestId] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  
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

  // --- Initial Data Fetch (Only Light Data) ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- Dynamic Question Fetching ---
  // Triggers when Subject, Topic, or Create Dialog Open changes
  useEffect(() => {
    if (isCreateDialogOpen) {
      fetchFilteredQuestions();
    }
  }, [formData.subject_id, questionFilterTopic, isCreateDialogOpen]);

  // Update filtered topics when subject changes
  useEffect(() => {
    if (formData.subject_id) {
      setFilteredTopicsForQuestions(topics.filter(t => t.subject_id === formData.subject_id));
    } else {
      setFilteredTopicsForQuestions([]);
    }
    // When subject changes, reset topic filter to 'all' so we fetch all topics for that subject
    if (formData.subject_id && questionFilterTopic !== 'all') {
      setQuestionFilterTopic('all');
    }
  }, [formData.subject_id, topics]);

  const fetchInitialData = async () => {
    try {
      const [testsRes, subjectsRes, topicsRes, studentsRes] = await Promise.all([
        supabase.from('tests').select('*, subjects(name)').order('created_at', { ascending: false }),
        // REMOVED: Initial massive questions fetch
        supabase.from('subjects').select('*').eq('is_active', true),
        supabase.from('topics').select('*').eq('is_active', true),
        supabase.from('profiles').select('*'),
      ]);

      if (testsRes.data) setTests(testsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      
      if (studentsRes.data) {
        const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
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

  // --- The New Dynamic Fetch Function ---
  const fetchFilteredQuestions = async () => {
    setIsQuestionsLoading(true);
    try {
      let query = supabase
        .from('questions')
        .select('*, subjects(name), topics(name)')
        .eq('is_active', true);

      // 1. Filter by Subject
      if (formData.subject_id) {
        query = query.eq('subject_id', formData.subject_id);
      }

      // 2. Filter by Topic (if selected)
      if (questionFilterTopic && questionFilterTopic !== 'all') {
        query = query.eq('topic_id', questionFilterTopic);
      }

      // Limit results to avoid crashing (e.g. 500 max per filtered view)
      query = query.limit(500);

      const { data, error } = await query;
      if (error) throw error;

      // 3. IMPORTANT: If editing, we MUST also fetch the questions that are already selected
      // even if they don't match the current subject/topic filter.
      let combinedQuestions = data || [];

      if (isEditMode && selectedQuestions.length > 0) {
        const missingIds = selectedQuestions.filter(id => !combinedQuestions.find(q => q.id === id));
        
        if (missingIds.length > 0) {
          const { data: missingQuestions } = await supabase
            .from('questions')
            .select('*, subjects(name), topics(name)')
            .in('id', missingIds);
          
          if (missingQuestions) {
            combinedQuestions = [...combinedQuestions, ...missingQuestions];
          }
        }
      }

      // Remove duplicates just in case
      const uniqueQuestions = Array.from(new Map(combinedQuestions.map(q => [q.id, q])).values());
      setQuestions(uniqueQuestions);

    } catch (error) {
      console.error('Error fetching filtered questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingTestId(null);
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
    setQuestionFilterTopic('all');
  };

  const handleEditTest = async (test: Test) => {
    setIsEditMode(true);
    setEditingTestId(test.id);

    const formatDateTime = (dateStr?: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 16); 
    };

    setFormData({
      title: test.title,
      description: test.description || '',
      test_type: test.test_type,
      duration_minutes: test.duration_minutes,
      total_marks: test.total_marks,
      pass_marks: test.pass_marks,
      subject_id: test.subject_id || '',
      max_attempts: test.max_attempts || 1,
      shuffle_questions: test.shuffle_questions ?? true,
      shuffle_options: test.shuffle_options ?? true,
      show_results: test.show_results ?? true,
      show_answers: test.show_answers ?? false,
      allow_navigation: test.allow_navigation ?? true,
      allow_review: test.allow_review ?? true,
      question_by_question: test.question_by_question ?? false,
      auto_submit: test.auto_submit ?? true,
      anti_cheat_enabled: test.anti_cheat_enabled ?? true,
      fullscreen_required: test.fullscreen_required ?? true,
      tab_switch_limit: test.tab_switch_limit ?? 3,
      watermark_enabled: test.watermark_enabled ?? true,
      easy_percentage: test.easy_percentage ?? 30,
      medium_percentage: test.medium_percentage ?? 50,
      hard_percentage: test.hard_percentage ?? 20,
      is_public: test.is_public,
      is_anytime: test.is_anytime ?? true,
      start_time: formatDateTime(test.start_time),
      end_time: formatDateTime(test.end_time),
    });

    // Fetch existing assigned questions
    const { data: existingQuestions } = await supabase
      .from('test_questions')
      .select('question_id')
      .eq('test_id', test.id);

    if (existingQuestions) {
      const ids = existingQuestions.map((q: any) => q.question_id);
      setSelectedQuestions(ids);
    }

    // Set filters to match the test so the user sees relevant questions immediately
    if (test.subject_id) {
        setQuestionFilterTopic('all'); 
        // Note: The useEffect will trigger fetchFilteredQuestions because formData.subject_id changes here
    }

    setIsCreateDialogOpen(true);
  };

  // ... Update Test, Create Test, Assign logic remains mostly the same ...
  // Only the logic that calculated totalMarks needs to ensure it can find the questions
  // But since we fetch selected questions in fetchFilteredQuestions, it should work.

  const handleUpdateTest = async () => {
    if (!editingTestId) return;
    if (!formData.title || selectedQuestions.length === 0) {
      toast.error('Please fill in the title and select at least one question');
      return;
    }

    try {
      // Calculate marks. We might need to fetch the specific questions if they aren't in the current 'questions' view
      // But for simplicity, we rely on the backend or current view. 
      // Robust way: fetch marks for selected IDs from DB
      const { data: marksData } = await supabase
        .from('questions')
        .select('marks')
        .in('id', selectedQuestions);
        
      const totalMarks = marksData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

      const { error: updateError } = await supabase
        .from('tests')
        .update({
          ...formData,
          subject_id: formData.subject_id === "" ? null : formData.subject_id, 
          total_questions: selectedQuestions.length,
          total_marks: totalMarks,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
        })
        .eq('id', editingTestId);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', editingTestId);
      
      if (deleteError) throw deleteError;

      const testQuestions = selectedQuestions.map((qId, index) => ({
        test_id: editingTestId,
        question_id: qId,
        sort_order: index,
      }));

      const { error: insertError } = await supabase
        .from('test_questions')
        .insert(testQuestions);

      if (insertError) throw insertError;

      toast.success('Test updated successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchInitialData(); // Refresh list
    } catch (error: any) {
      console.error('Error updating test:', error);
      toast.error(error.message || 'Failed to update test');
    }
  };

  const handleCreateTest = async () => {
    if (!formData.title || selectedQuestions.length === 0) {
      toast.error('Please fill in the title and select at least one question');
      return;
    }

    try {
      // Calculate marks robustly
      const { data: marksData } = await supabase
        .from('questions')
        .select('marks')
        .in('id', selectedQuestions);
        
      const totalMarks = marksData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

      const { data: newTest, error: testError } = await supabase
        .from('tests')
        .insert({
          ...formData,
          subject_id: formData.subject_id === "" ? null : formData.subject_id,
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
      fetchInitialData();
    } catch (error: any) {
      console.error('Error creating test:', error);
      toast.error(error.message || 'Failed to create test');
    }
  };

  // ... Assign logic same as before ...
  const handleAssignTest = async () => {
    if (!selectedTest || selectedStudents.length === 0) {
      toast.error('Please select students to assign');
      return;
    }
    try {
      const assignments = selectedStudents.map(studentUserId => ({
        test_id: selectedTest.id,
        user_id: studentUserId,
        assigned_by: user?.id,
        is_completed: false,
      }));
      const { error } = await supabase
        .from('test_assignments')
        .upsert(assignments, { onConflict: 'test_id,user_id' });

      if (error) throw error;
      toast.success(`Test assigned to ${selectedStudents.length} student(s)`);
      setIsAssignDialogOpen(false);
      setSelectedStudents([]);
      setSelectedTest(null);
    } catch (error: any) {
      console.error('Error assigning test:', error);
      toast.error(error.message || 'Failed to assign test');
    }
  };

  const handleBulkAssignTests = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student.');
      return;
    }
    const adminTests = tests.filter(test => {
      const isStudentGenerated = test.test_type === 'weak_areas' || test.title.includes('Weak Areas Test');
      return test.is_active && !isStudentGenerated;
    });

    if (adminTests.length === 0) {
      toast.error('No active admin tests found to assign.');
      return;
    }
    try {
      setIsLoading(true);
      const assignments = [];
      for (const studentId of selectedStudents) {
        for (const test of adminTests) {
          assignments.push({
            test_id: test.id,
            user_id: studentId,
            assigned_by: user?.id,
            is_completed: false,
          });
        }
      }
      const { error } = await supabase
        .from('test_assignments')
        .upsert(assignments, { onConflict: 'test_id,user_id' });

      if (error) throw error;
      toast.success(`Successfully assigned ${adminTests.length} tests to ${selectedStudents.length} student(s).`);
      setIsBulkAssignDialogOpen(false);
      setSelectedStudents([]);
    } catch (error: any) {
      console.error('Error bulk assigning tests:', error);
      toast.error(error.message || 'Failed to bulk assign tests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (error) throw error;
      toast.success('Test deleted successfully');
      fetchInitialData();
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
      fetchInitialData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update test');
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase());
    const isStudentGenerated = test.test_type === 'weak_areas' || test.title.includes('Weak Areas Test');
    
    let matchesSource = true;
    if (testSourceFilter === 'student') {
      matchesSource = isStudentGenerated;
    } else if (testSourceFilter === 'admin') {
      matchesSource = !isStudentGenerated;
    }

    return matchesSearch && matchesSource;
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
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedStudents([]);
                setIsBulkAssignDialogOpen(true);
              }}
            >
              <Layers size={18} className="mr-2"/>
              Bulk Assign Tests
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="admin" onClick={() => resetForm()}>
                  <Plus size={18} />
                  Create Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? 'Edit Test' : 'Create New Test'}</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to create or update a test.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="questions">Questions</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                      <TabsTrigger value="anticheat">Anti-Cheat</TabsTrigger>
                    </TabsList>

                    {/* 1. Basic Info Tab */}
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

                    {/* 2. Questions Tab */}
                    <TabsContent value="questions" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm text-muted-foreground">
                          Selected: {selectedQuestions.length} questions
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
                            const allIds = questions.map(q => q.id); // Select from currently visible
                            setSelectedQuestions([...new Set([...selectedQuestions, ...allIds])]);
                          }}
                        >
                          Select Page
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
                        {isQuestionsLoading ? (
                           <div className="flex items-center justify-center h-full">
                             <Loader2 className="w-6 h-6 animate-spin text-primary" />
                           </div>
                        ) : questions.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No questions found. {!formData.subject_id && 'Select a subject to load questions.'}
                          </div>
                        ) : (
                          questions.map(q => (
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

                    {/* 3. Settings Tab */}
                    <TabsContent value="settings" className="space-y-4 mt-4">
                      {/* ... settings content same as before ... */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Shuffle Questions</Label>
                          <Switch checked={formData.shuffle_questions} onCheckedChange={c => setFormData({...formData, shuffle_questions: c})} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Shuffle Options</Label>
                          <Switch checked={formData.shuffle_options} onCheckedChange={c => setFormData({...formData, shuffle_options: c})} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Show Results</Label>
                          <Switch checked={formData.show_results} onCheckedChange={c => setFormData({...formData, show_results: c})} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Show Answers</Label>
                          <Switch checked={formData.show_answers} onCheckedChange={c => setFormData({...formData, show_answers: c})} />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Allow Navigation</Label>
                          <Switch checked={formData.allow_navigation} onCheckedChange={c => setFormData({...formData, allow_navigation: c})} />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Allow Review</Label>
                          <Switch checked={formData.allow_review} onCheckedChange={c => setFormData({...formData, allow_review: c})} />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Question by Question</Label>
                          <Switch checked={formData.question_by_question} onCheckedChange={c => setFormData({...formData, question_by_question: c})} />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded-lg">
                          <Label>Auto Submit</Label>
                          <Switch checked={formData.auto_submit} onCheckedChange={c => setFormData({...formData, auto_submit: c})} />
                        </div>
                      </div>
                    </TabsContent>

                    {/* 4. Anti-Cheat Tab */}
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

                  {/* Footer Buttons */}
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="admin" onClick={isEditMode ? handleUpdateTest : handleCreateTest}>
                      {isEditMode ? 'Update Test' : 'Create Test'}
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ... Search, Filters, Grid, and Other Dialogs remain mostly identical ... */}
        {/* Only need to render the grid and other components which don't affect this logic */}
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
                        {role === 'admin' && (
                          <Button
                            className="text-[black]"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTest(test)}
                          >
                            <Edit size={16} />
                            Edit
                          </Button>
                        )}
                        
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
                            setSelectedStudents([]);
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

        {/* ... Remaining Dialogs (Assign, Bulk Assign, Preview) ... */}
        {/* Same as previous, no logic change needed there */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Test to Students</DialogTitle>
              <DialogDescription>
                Select students to assign <strong>{selectedTest?.title}</strong> to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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

         <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Assign Admin Tests</DialogTitle>
              <DialogDescription>
                This will assign all <strong>active, admin-generated tests</strong> to the selected students.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              
              <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="select-all-bulk"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedStudents(students.map((s) => s.user_id));
                    } else {
                      setSelectedStudents([]);
                    }
                  }}
                />
                <label htmlFor="select-all-bulk" className="text-sm font-semibold cursor-pointer">
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

              <DialogFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsBulkAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="admin" onClick={handleBulkAssignTests} disabled={selectedStudents.length === 0 || isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Assign to {selectedStudents.length} Students
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <TestPreview 
          testId={previewTestId} 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
        />
      </div>
    </AdminLayout>
  );
}