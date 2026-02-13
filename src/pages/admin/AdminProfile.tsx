import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { User, Mail, Calendar, Edit, Save, Loader2, ShieldCheck, IdCard } from 'lucide-react';

export default function AdminProfile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setIsLoading(false);
  }, [user?.id, user?.full_name]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ full_name: fullName });
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <AdminLayout role="admin">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout role="admin">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 text-foreground">
            <User className="w-8 h-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-lg">Manage your account settings and preferences.</p>
        </div>

        {/* Profile Card */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <Avatar className="w-28 h-28 border-4 border-background shadow-sm">
                <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                <AvatarFallback className="text-3xl font-semibold bg-primary/10 text-primary">
                  {getInitials(user?.full_name || 'U')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4 w-full text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4 max-w-md mx-auto md:mx-0">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                      <Input 
                        id="fullName"
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        className="bg-background"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                      <Button variant="ghost" onClick={() => { setIsEditing(false); setFullName(user?.full_name || ''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <h2 className="text-3xl font-bold text-foreground">{user?.full_name}</h2>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize px-3 py-1">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {user?.role || 'Admin'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col items-center md:items-start gap-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary/70" />
                        <span className="text-base">{user?.email}</span>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Info Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3 border-b mb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <IdCard className="w-4 h-4 text-primary" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex justify-between items-center group">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="font-medium text-sm flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Primary Email</span>
                <span className="font-medium text-sm truncate max-w-[200px]">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">System ID</span>
                <span className="font-mono text-[10px] bg-muted px-2 py-1 rounded-md text-muted-foreground truncate max-w-[150px]">
                  {user?.id}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Placeholder for Security or Activity Card */}
          <Card className="border-none shadow-sm bg-card bg-white border border-primary/5">
             <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
               <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
               </div>
               <p className="text-sm font-medium text-foreground">Your account is secure And Encrypted.</p>
               <p className="text-xs text-muted-foreground mt-1">Multi-factor authentication is active By Gamify IAS And Hyde.</p>
               <p className="text-xs text-muted-foreground mt-2">By Hyde Security.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}