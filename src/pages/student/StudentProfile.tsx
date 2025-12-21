import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Calendar,
  Trophy,
  Target,
  Star,
  Edit,
  Save,
  Loader2,
  Award,
  Flame,
} from 'lucide-react';

interface LeaderboardData {
  total_xp: number;
  total_coins: number;
  current_streak: number;
  longest_streak: number;
  tests_completed: number;
  tests_passed: number;
  rank_title: string;
  rank_position: number | null;
}

export default function StudentProfile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchLeaderboardData();
      setFullName(user.full_name);
    }
  }, [user?.id]);

  const fetchLeaderboardData = async () => {
    try {
      const { data } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (data) {
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ full_name: fullName });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-game flex items-center gap-2">
            <User className="w-8 h-8 text-secondary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your account information
          </p>
        </div>

        {/* Profile Card */}
        <Card variant="gameHighlight">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-primary">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {getInitials(user?.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="game" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsEditing(false);
                        setFullName(user?.full_name || '');
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <h2 className="text-2xl font-bold">{user?.full_name}</h2>
                      <Badge variant="secondary">{leaderboard?.rank_title || 'Beginner'}</Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1 mt-1">
                      <Mail className="w-4 h-4" />
                      {user?.email}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          {/* <Card variant="game">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl font-bold">{leaderboard?.total_xp || 0}</p>
              <p className="text-sm text-muted-foreground">Total XP</p>
            </CardContent>
          </Card> */}
          {/* <Card variant="game">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-game-gold/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-game-gold" />
              </div>
              <p className="text-2xl font-bold">{leaderboard?.total_coins || 0}</p>
              <p className="text-sm text-muted-foreground">Coins</p>
            </CardContent>
          </Card> */}
          <Card variant="game">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-accent/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <p className="text-2xl font-bold">{leaderboard?.tests_completed || 0}</p>
              <p className="text-sm text-muted-foreground">Tests Done</p>
            </CardContent>
          </Card>
          {/* <Card variant="game">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-destructive/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-2xl font-bold">{leaderboard?.current_streak || 0}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card> */}
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5" />
                Achievement Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tests Passed</span>
                <span className="font-bold text-accent">{leaderboard?.tests_passed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pass Rate</span>
                <span className="font-bold">
                  {leaderboard?.tests_completed 
                    ? Math.round((leaderboard.tests_passed / leaderboard.tests_completed) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Longest Streak</span>
                <span className="font-bold">{leaderboard?.longest_streak || 0} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Global Rank</span>
                <span className="font-bold">#{leaderboard?.rank_position || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary">Student</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-sm truncate max-w-[180px]">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                  {user?.id}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
}
