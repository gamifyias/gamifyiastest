import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Layers, Plus, Pencil, Trash2, Save, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Topic {
  id: string;
  name: string;
  description: string | null;
  subject_id: string;
  difficulty_level: string;
  xp_reward: number;
  is_active: boolean;
  subject?: { name: string; color: string };
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

export default function AdminTopics() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject_id: '',
    difficulty_level: 'medium',
    xp_reward: 100,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [topicsRes, subjectsRes] = await Promise.all([
        supabase.from('topics').select('*, subjects(name, color)').order('sort_order'),
        supabase.from('subjects').select('id, name, color').eq('is_active', true),
      ]);
      setTopics((topicsRes.data || []) as Topic[]);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTopic) {
        const { error } = await supabase.from('topics').update(formData).eq('id', editingTopic.id);
        if (error) throw error;
        toast.success('Topic updated');
      } else {
        const { error } = await supabase.from('topics').insert({ ...formData, created_by: user?.id, sort_order: topics.length });
        if (error) throw error;
        toast.success('Topic created');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save topic');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this topic?')) return;
    try {
      const { error } = await supabase.from('topics').delete().eq('id', id);
      if (error) throw error;
      toast.success('Topic deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({ name: topic.name, description: topic.description || '', subject_id: topic.subject_id, difficulty_level: topic.difficulty_level, xp_reward: topic.xp_reward });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTopic(null);
    setFormData({ name: '', description: '', subject_id: '', difficulty_level: 'medium', xp_reward: 100 });
  };

  return (
    <AdminLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-sidebar-foreground">Topics</h1>
            <p className="text-sidebar-foreground/60 mt-1">Manage course topics</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="admin"><Plus size={18} />Add Topic</Button>
            </DialogTrigger>
            <DialogContent className="bg-admin-card border-admin-border">
              <DialogHeader>
                <DialogTitle className="text-sidebar-foreground">{editingTopic ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sidebar-foreground">Subject</Label>
                  <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                    <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sidebar-foreground">Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sidebar-foreground">Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">Difficulty</Label>
                    <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({ ...formData, difficulty_level: v })}>
                      <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">XP Reward</Label>
                    <Input type="number" value={formData.xp_reward} onChange={(e) => setFormData({ ...formData, xp_reward: parseInt(e.target.value) })} className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="admin"><Save size={16} />{editingTopic ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-sidebar-foreground/60">Loading...</div>
        ) : topics.length === 0 ? (
          <Card variant="admin"><CardContent className="py-12 text-center"><Layers className="w-12 h-12 mx-auto mb-4 text-sidebar-foreground/30" /><p className="text-sidebar-foreground/60">No topics yet</p></CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Card key={topic.id} variant="admin" className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${topic.subject?.color || '#6366f1'}20` }}>
                        <Layers className="w-5 h-5" style={{ color: topic.subject?.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-sidebar-foreground text-base">{topic.name}</CardTitle>
                        <p className="text-xs text-sidebar-foreground/60">{topic.subject?.name}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-sidebar-foreground/70 line-clamp-2 mb-3">{topic.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded text-xs ${topic.difficulty_level === 'easy' ? 'bg-green-500/20 text-green-400' : topic.difficulty_level === 'hard' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{topic.difficulty_level}</span>
                    <span className="text-xs text-game-gold">+{topic.xp_reward} XP</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(topic)} className="text-sidebar-foreground hover:bg-sidebar-accent"><Pencil size={14} />Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(topic.id)} className="text-destructive hover:bg-destructive/10"><Trash2 size={14} />Delete</Button>
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
