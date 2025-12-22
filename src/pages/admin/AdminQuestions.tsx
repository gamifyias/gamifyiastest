import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { FileQuestion, Plus, Trash2, Search, Edit, Eye, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BulkQuestionImport } from '@/components/admin/BulkQuestionImport';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
  negative_marks: number;
  explanation: string | null;
  is_active: boolean;
  subject_id: string;
  topic_id: string;
  subjects?: { name: string } | null;
  topics?: { name: string } | null;
}

interface Option {
  id?: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
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

export default function AdminQuestions() {
  const location = useLocation();
  const role = location.pathname.startsWith('/mentor') ? 'mentor' : 'admin';
  const { user } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'mcq_single',
    difficulty: 'medium',
    marks: 1,
    negative_marks: 0,
    explanation: '',
    subject_id: '',
    topic_id: '',
    is_active: true,
  });
  const [options, setOptions] = useState<Option[]>([
    { option_text: '', is_correct: true, sort_order: 0 },
    { option_text: '', is_correct: false, sort_order: 1 },
    { option_text: '', is_correct: false, sort_order: 2 },
    { option_text: '', is_correct: false, sort_order: 3 },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.subject_id) {
      setFilteredTopics(topics.filter(t => t.subject_id === formData.subject_id));
      if (!topics.find(t => t.id === formData.topic_id && t.subject_id === formData.subject_id)) {
        setFormData(prev => ({ ...prev, topic_id: '' }));
      }
    } else {
      setFilteredTopics([]);
    }
  }, [formData.subject_id, topics]);

  const fetchData = async () => {
    try {
      const [questionsRes, subjectsRes, topicsRes] = await Promise.all([
        supabase.from('questions').select('*, subjects(name), topics(name)').order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').eq('is_active', true).order('name'),
        supabase.from('topics').select('*').eq('is_active', true).order('name'),
      ]);

      if (questionsRes.data) setQuestions(questionsRes.data as Question[]);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.question_text || !formData.subject_id || !formData.topic_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.question_type === 'mcq_single' || formData.question_type === 'mcq_multiple') {
      const validOptions = options.filter(o => o.option_text.trim());
      if (validOptions.length < 2) {
        toast.error('Please add at least 2 options');
        return;
      }
      if (!validOptions.some(o => o.is_correct)) {
        toast.error('Please mark at least one option as correct');
        return;
      }
    }

    try {
      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('questions')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;

        // Delete old options and insert new ones
        await supabase.from('question_options').delete().eq('question_id', editingQuestion.id);
        
        if (formData.question_type === 'mcq_single' || formData.question_type === 'mcq_multiple') {
          const validOptions = options.filter(o => o.option_text.trim());
          await supabase.from('question_options').insert(
            validOptions.map((o, idx) => ({
              question_id: editingQuestion.id,
              option_text: o.option_text,
              is_correct: o.is_correct,
              sort_order: idx,
            }))
          );
        }

        toast.success('Question updated successfully');
      } else {
        // Create new question
        const { data: newQuestion, error } = await supabase
          .from('questions')
          .insert({
            ...formData,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert options
        if (formData.question_type === 'mcq_single' || formData.question_type === 'mcq_multiple') {
          const validOptions = options.filter(o => o.option_text.trim());
          await supabase.from('question_options').insert(
            validOptions.map((o, idx) => ({
              question_id: newQuestion.id,
              option_text: o.option_text,
              is_correct: o.is_correct,
              sort_order: idx,
            }))
          );
        }

        toast.success('Question created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to save question');
    }
  };

  const handleEdit = async (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      difficulty: question.difficulty,
      marks: question.marks,
      negative_marks: question.negative_marks || 0,
      explanation: question.explanation || '',
      subject_id: question.subject_id,
      topic_id: question.topic_id,
      is_active: question.is_active,
    });

    // Fetch options
    const { data: optionsData } = await supabase
      .from('question_options')
      .select('*')
      .eq('question_id', question.id)
      .order('sort_order');

    if (optionsData && optionsData.length > 0) {
      setOptions(optionsData.map(o => ({
        id: o.id,
        option_text: o.option_text,
        is_correct: o.is_correct || false,
        sort_order: o.sort_order || 0,
      })));
    } else {
      setOptions([
        { option_text: '', is_correct: true, sort_order: 0 },
        { option_text: '', is_correct: false, sort_order: 1 },
        { option_text: '', is_correct: false, sort_order: 2 },
        { option_text: '', is_correct: false, sort_order: 3 },
      ]);
    }

    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await supabase.from('question_options').delete().eq('question_id', id);
      await supabase.from('questions').delete().eq('id', id);
      toast.success('Question deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({
      question_text: '',
      question_type: 'mcq_single',
      difficulty: 'medium',
      marks: 1,
      negative_marks: 0,
      explanation: '',
      subject_id: '',
      topic_id: '',
      is_active: true,
    });
    setOptions([
      { option_text: '', is_correct: true, sort_order: 0 },
      { option_text: '', is_correct: false, sort_order: 1 },
      { option_text: '', is_correct: false, sort_order: 2 },
      { option_text: '', is_correct: false, sort_order: 3 },
    ]);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { option_text: '', is_correct: false, sort_order: options.length }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, field: 'option_text' | 'is_correct', value: string | boolean) => {
    const newOptions = [...options];
    if (field === 'is_correct' && formData.question_type === 'mcq_single') {
      // For MCQ single, only one can be correct
      newOptions.forEach((o, i) => {
        o.is_correct = i === index;
      });
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }
    setOptions(newOptions);
  };

  // Filter questions
  const filtered = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = filterSubject === 'all' || q.subject_id === filterSubject;
    const matchesTopic = filterTopic === 'all' || q.topic_id === filterTopic;
    return matchesSearch && matchesSubject && matchesTopic;
  });

  const getDifficultyColor = (d: string) => 
    d === 'easy' ? 'bg-green-500/20 text-green-400' : 
    d === 'hard' ? 'bg-red-500/20 text-red-400' : 
    'bg-yellow-500/20 text-yellow-400';

  const getTypeLabel = (t: string) => {
    switch(t) {
      case 'mcq_single': return 'MCQ (Single)';
      case 'mcq_multiple': return 'MCQ (Multiple)';
      case 'numeric': return 'Numeric';
      case 'true_false': return 'True/False';
      default: return t;
    }
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-sidebar-foreground flex items-center gap-2">
              <FileQuestion className="w-8 h-8 text-primary" />
              Question Bank
            </h1>
            <p className="text-sidebar-foreground/60 mt-1">
              Manage questions by subject and topic ({questions.length} total)
            </p>
          </div>
          <div className="flex gap-2">
            <BulkQuestionImport 
              subjects={subjects} 
              topics={topics} 
              onImportComplete={fetchData}
            />
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="admin">
                  <Plus size={18} />
                  Add Question
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                <div className="space-y-4 py-4">
                  {/* Subject & Topic Selection - HIGHEST PRIORITY */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subject *</Label>
                      <Select
                        value={formData.subject_id}
                        onValueChange={v => setFormData({ ...formData, subject_id: v, topic_id: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Topic *</Label>
                      <Select
                        value={formData.topic_id}
                        onValueChange={v => setFormData({ ...formData, topic_id: v })}
                        disabled={!formData.subject_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.subject_id ? "Select topic" : "Select subject first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTopics.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <Label>Question Text *</Label>
                    <Textarea
                      value={formData.question_text}
                      onChange={e => setFormData({ ...formData, question_text: e.target.value })}
                      placeholder="Enter your question"
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Question Type & Difficulty */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Question Type</Label>
                      <Select
                        value={formData.question_type}
                        onValueChange={v => setFormData({ ...formData, question_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq_single">MCQ (Single Answer)</SelectItem>
                          <SelectItem value="mcq_multiple">MCQ (Multiple Answers)</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="numeric">Numeric Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={v => setFormData({ ...formData, difficulty: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Marks */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Marks</Label>
                      <Input
                        type="number"
                        value={formData.marks}
                        onChange={e => setFormData({ ...formData, marks: parseFloat(e.target.value) || 1 })}
                        min={0.5}
                        step={0.5}
                      />
                    </div>
                    <div>
                      <Label>Negative Marks</Label>
                      <Input
                        type="number"
                        value={formData.negative_marks}
                        onChange={e => setFormData({ ...formData, negative_marks: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.25}
                      />
                    </div>
                  </div>

                  {/* Options for MCQ types */}
                  {(formData.question_type === 'mcq_single' || formData.question_type === 'mcq_multiple') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Options *</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={addOption}
                          disabled={options.length >= 6}
                        >
                          <Plus size={14} /> Add Option
                        </Button>
                      </div>
                      {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <input
                              type={formData.question_type === 'mcq' ? 'radio' : 'checkbox'}
                              name="correct_option"
                              checked={option.is_correct}
                              onChange={() => handleOptionChange(index, 'is_correct', !option.is_correct)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-muted-foreground">Correct</span>
                          </div>
                          <Input
                            value={option.option_text}
                            onChange={e => handleOptionChange(index, 'option_text', e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1"
                          />
                          {options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(index)}
                              className="text-destructive"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        {formData.question_type === 'mcq_single' 
                          ? 'Select one correct answer' 
                          : 'Select all correct answers'}
                      </p>
                    </div>
                  )}

                  {/* True/False Options */}
                  {formData.question_type === 'true_false' && (
                    <div className="space-y-3">
                      <Label>Correct Answer</Label>
                      <Select
                        value={options[0]?.option_text || 'true'}
                        onValueChange={v => setOptions([
                          { option_text: 'True', is_correct: v === 'true', sort_order: 0 },
                          { option_text: 'False', is_correct: v === 'false', sort_order: 1 },
                        ])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Explanation */}
                  <div>
                    <Label>Explanation (Optional)</Label>
                    <Textarea
                      value={formData.explanation}
                      onChange={e => setFormData({ ...formData, explanation: e.target.value })}
                      placeholder="Explain the correct answer"
                    />
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={c => setFormData({ ...formData, is_active: c })}
                    />
                    <Label>Active</Label>
                  </div>

                  {/* Submit Button */}
                  <Button variant="admin" className="w-full" onClick={handleSubmit}>
                    {editingQuestion ? 'Update Question' : 'Create Question'}
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
            />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[180px] bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTopic} onValueChange={setFilterTopic}>
            <SelectTrigger className="w-[180px] bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {(filterSubject !== 'all' 
                ? topics.filter(t => t.subject_id === filterSubject)
                : topics
              ).map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        {filtered.length === 0 ? (
          <Card variant="admin">
            <CardContent className="py-12 text-center">
              <FileQuestion className="w-12 h-12 mx-auto mb-4 text-sidebar-foreground/30" />
              <p className="text-sidebar-foreground/60">No questions found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((q) => (
              <Card key={q.id} variant="admin">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sidebar-foreground font-medium line-clamp-2">{q.question_text}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs bg-primary/10 text-[white]">
                          {q.subjects?.name || 'No subject'}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-secondary/10 text-[white]">
                          {q.topics?.name || 'No topic'}
                        </Badge>
                        <Badge className={`text-xs ${getDifficultyColor(q.difficulty)}`}>
                          {q.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-[white]">
                          {getTypeLabel(q.question_type)}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-[white]">
                          {q.marks} marks
                        </Badge>
                        {!q.is_active && (
                          <Badge variant="destructive" className="text-xs text-[white]" >Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(q)}
                        className="text-primary"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(q.id)} 
                        className="text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}