import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileQuestion, Plus, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
  subject?: { name: string };
  topic?: { name: string };
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    try {
      const { data } = await supabase.from('questions').select('*, subjects(name), topics(name)').order('created_at', { ascending: false }).limit(100);
      setQuestions((data || []) as Question[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await supabase.from('questions').delete().eq('id', id);
      toast.success('Question deleted');
      fetchQuestions();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = questions.filter(q => q.question_text.toLowerCase().includes(search.toLowerCase()));

  const getDifficultyColor = (d: string) => d === 'easy' ? 'bg-green-500/20 text-green-400' : d === 'hard' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400';

  return (
    <AdminLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-sidebar-foreground">Questions</h1>
            <p className="text-sidebar-foreground/60 mt-1">Manage question bank ({questions.length} questions)</p>
          </div>
          <Button variant="admin"><Plus size={18} />Add Question</Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
          <Input placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-sidebar-foreground/60">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card variant="admin"><CardContent className="py-12 text-center"><FileQuestion className="w-12 h-12 mx-auto mb-4 text-sidebar-foreground/30" /><p className="text-sidebar-foreground/60">No questions found</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((q) => (
              <Card key={q.id} variant="admin">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sidebar-foreground font-medium line-clamp-2">{q.question_text}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{q.subject?.name || 'No subject'}</Badge>
                        <Badge variant="outline" className="text-xs">{q.topic?.name || 'No topic'}</Badge>
                        <Badge className={`text-xs ${getDifficultyColor(q.difficulty)}`}>{q.difficulty}</Badge>
                        <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                        <Badge variant="outline" className="text-xs">{q.marks} marks</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} className="text-destructive"><Trash2 size={14} /></Button>
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
