import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, 
  Plus,
  Pencil,
  Trash2,
  Layers,
  Save,
  X
} from 'lucide-react';
import { Subject } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    image_url: '',
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Fetch topic counts for each subject
      const subjectsWithCounts = await Promise.all(
        (data || []).map(async (subject) => {
          const { count } = await supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', subject.id);
          
          return { ...subject, topic_count: count || 0 };
        })
      );

      setSubjects(subjectsWithCounts as Subject[]);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({
            name: formData.name,
            description: formData.description,
            color: formData.color,
            image_url: formData.image_url || null,
          })
          .eq('id', editingSubject.id);

        if (error) throw error;
        toast.success('Subject updated');
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({
            name: formData.name,
            description: formData.description,
            color: formData.color,
            image_url: formData.image_url || null,
            created_by: user?.id,
            sort_order: subjects.length,
          });

        if (error) throw error;
        toast.success('Subject created');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error('Failed to save subject');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Subject deleted');
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      color: subject.color || '#6366f1',
      image_url: subject.image_url || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      description: '',
      color: '#6366f1',
      image_url: '',
    });
  };

  return (
    <AdminLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-sidebar-foreground">Subjects</h1>
            <p className="text-sidebar-foreground/60 mt-1">Manage course subjects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="admin">
                <Plus size={18} />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-admin-card border-admin-border">
              <DialogHeader>
                <DialogTitle className="text-sidebar-foreground">
                  {editingSubject ? 'Edit Subject' : 'Create Subject'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sidebar-foreground">Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sidebar-foreground">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sidebar-foreground">Image URL (optional)</Label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                      className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="admin">
                    <Save size={16} />
                    {editingSubject ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subjects Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-sidebar-foreground/60">Loading subjects...</div>
        ) : subjects.length === 0 ? (
          <Card variant="admin">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-sidebar-foreground/30" />
              <p className="text-sidebar-foreground/60">No subjects yet. Create your first subject!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <Card key={subject.id} variant="admin" className="overflow-hidden hover:shadow-lg transition-shadow">
                <div 
                  className="h-2" 
                  style={{ backgroundColor: subject.color || '#6366f1' }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${subject.color}20` }}
                      >
                        <BookOpen className="w-6 h-6" style={{ color: subject.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-sidebar-foreground text-lg">{subject.name}</CardTitle>
                        <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                          <Layers size={12} />
                          {subject.topic_count || 0} topics
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-sidebar-foreground/70 line-clamp-2 mb-4">
                    {subject.description || 'No description'}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(subject)}
                      className="text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(subject.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
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
