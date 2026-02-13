import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  UserPlus,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Loader2,
  Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// --- Types ---

type ActivityType = 'user_join' | 'test_create' | 'test_submit' | 'violation';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  meta?: any;
  user_name?: string;
  user_avatar?: string;
}

export default function AdminActivityLog() {
  const location = useLocation();
  const role = location.pathname.startsWith('/mentor') ? 'mentor' : 'admin';
  const [loading, setLoading] = useState(true);
  
  // State for the two different views
  const [globalFeed, setGlobalFeed] = useState<ActivityItem[]>([]);
  const [studentFeed, setStudentFeed] = useState<ActivityItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllActivity();
  }, []);

  const fetchAllActivity = async () => {
    setLoading(true);
    try {
      // 1. Fetch recent profile creations (New Users)
      const { data: newUsers } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, avatar_url')
        .order('created_at', { ascending: false })
        .limit(10);

      // 2. Fetch recent tests created
      const { data: newTests } = await supabase
        .from('tests')
        .select('id, title, created_at, test_type')
        .order('created_at', { ascending: false })
        .limit(10);

      // 3. Fetch recent attempts (Submissions)
      const { data: attempts } = await supabase
        .from('student_test_attempts')
        .select(`
          id, 
          created_at, 
          submitted_at, 
          percentage, 
          is_passed, 
          status,
          user_id,
          tests (title)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch user names for the attempts manually to avoid join errors
      const userIds = attempts?.map(a => a.user_id) || [];
      const { data: attemptProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(attemptProfiles?.map(p => [p.user_id, p]));

      // --- PROCESS GLOBAL FEED (Merge all) ---
      const feedItems: ActivityItem[] = [];

      // Add Users
      newUsers?.forEach(u => {
        feedItems.push({
          id: `user-${u.id}`,
          type: 'user_join',
          title: 'New Student Joined',
          description: `${u.full_name} joined the platform`,
          timestamp: u.created_at,
          user_name: u.full_name,
          user_avatar: u.avatar_url || undefined
        });
      });

      // Add Tests
      newTests?.forEach(t => {
        feedItems.push({
          id: `test-${t.id}`,
          type: 'test_create',
          title: 'New Test Published',
          description: `"${t.title}" (${t.test_type}) was created`,
          timestamp: t.created_at,
          meta: { type: 'system' }
        });
      });

      // Add Attempts
      attempts?.forEach(a => {
        const profile = profileMap.get(a.user_id);
        const testTitle = a.tests?.title || 'Unknown Test';
        
        // Only show submitted or in-progress status
        const statusText = a.status === 'in_progress' ? 'started' : 'completed';
        const scoreText = a.status === 'submitted' || a.status === 'auto_submitted' 
          ? ` with ${a.percentage}%` 
          : '';

        feedItems.push({
          id: `attempt-${a.id}`,
          type: 'test_submit',
          title: `Test ${statusText}`,
          description: `${profile?.full_name || 'Unknown'} ${statusText} "${testTitle}"${scoreText}`,
          timestamp: a.submitted_at || a.created_at,
          user_name: profile?.full_name,
          user_avatar: profile?.avatar_url || undefined,
          meta: { 
            passed: a.is_passed,
            score: a.percentage,
            status: a.status
          }
        });
      });

      // Sort Global Feed by latest
      feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setGlobalFeed(feedItems);

      // --- PROCESS STUDENT FEED (Only Attempts) ---
      // This is essentially the attempts list but formatted for the student view
      const studentItems = attempts?.map(a => {
        const profile = profileMap.get(a.user_id);
        const testTitle = a.tests?.title || 'Unknown Test';
        return {
          id: `st-attempt-${a.id}`,
          type: 'test_submit' as ActivityType,
          title: testTitle,
          description: a.status === 'in_progress' ? 'Currently taking test' : `Scored ${a.percentage}%`,
          timestamp: a.submitted_at || a.created_at,
          user_name: profile?.full_name,
          user_avatar: profile?.avatar_url || undefined,
          meta: { 
            passed: a.is_passed,
            score: a.percentage,
            status: a.status
          }
        };
      }) || [];

      setStudentFeed(studentItems);

    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: ActivityType, meta?: any) => {
    switch (type) {
      case 'user_join': return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'test_create': return <FileText className="w-5 h-5 text-purple-500" />;
      case 'test_submit':
        if (meta?.status === 'in_progress') return <Clock className="w-5 h-5 text-yellow-500" />;
        return meta?.passed 
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <XCircle className="w-5 h-5 text-red-500" />;
      case 'violation': return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const filterFeed = (feed: ActivityItem[]) => {
    if (!searchTerm) return feed;
    return feed.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.user_name && item.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  return (
    <AdminLayout role={role}>
      <div className="p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Activity Logs
            </h1>
            <p className="text-sidebar-foreground/70 mt-1">
              Real-time monitoring of platform events and student actions.
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sidebar-foreground/50" />
            <Input
              type="search"
              placeholder="Search logs..."
              className="pl-9 bg-sidebar-accent border-sidebar-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
           <div className="flex items-center justify-center min-h-[400px]">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
           </div>
        ) : (
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
              <TabsTrigger value="global" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Whole Site
              </TabsTrigger>
              <TabsTrigger value="student" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Student Activity
              </TabsTrigger>
            </TabsList>

            {/* --- TAB 1: WHOLE SITE ACTIVITY --- */}
            <TabsContent value="global">
              <Card variant="admin" className="border-sidebar-border">
                <CardHeader className="pb-3 border-b border-sidebar-border/50">
                  <CardTitle className="text-lg font-medium text-sidebar-foreground">Recent Platform Events</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px] p-4">
                    <div className="space-y-6">
                      {filterFeed(globalFeed).map((item, index) => (
                        <div key={item.id} className="relative pl-6 md:pl-8 group">
                          {/* Timeline Line */}
                          {index !== globalFeed.length - 1 && (
                            <div className="absolute left-[11px] md:left-[15px] top-8 bottom-[-24px] w-px bg-sidebar-border group-last:hidden" />
                          )}
                          
                          <div className="flex gap-4 items-start">
                            {/* Icon Bubble */}
                            <div className="absolute left-0 top-1 bg-sidebar-card border border-sidebar-border p-1.5 rounded-full z-10 shadow-sm">
                              {getIcon(item.type, item.meta)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-sidebar-accent/30 rounded-lg p-3 border border-sidebar-border/50 hover:bg-sidebar-accent/50 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  {item.user_avatar !== undefined && (
                                     <Avatar className="w-5 h-5">
                                       <AvatarImage src={item.user_avatar} />
                                       <AvatarFallback className="text-[10px]">{item.user_name?.slice(0,2).toUpperCase()}</AvatarFallback>
                                     </Avatar>
                                  )}
                                  <span className="font-semibold text-sm text-sidebar-foreground">
                                    {item.title}
                                  </span>
                                </div>
                                <span className="text-xs text-sidebar-foreground/50 whitespace-nowrap">
                                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-sidebar-foreground/80">
                                {item.description}
                              </p>
                              {item.type === 'test_submit' && item.meta?.score !== undefined && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant={item.meta.passed ? 'default' : 'destructive'} className="text-[10px] h-5">
                                    {item.meta.passed ? 'Passed' : 'Failed'}
                                  </Badge>
                                  <span className="text-xs font-mono text-sidebar-foreground/60">
                                    Score: {item.meta.score}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {filterFeed(globalFeed).length === 0 && (
                        <div className="text-center py-12 text-sidebar-foreground/50">
                          No activity found matching your search.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- TAB 2: STUDENT ACTIVITY --- */}
            <TabsContent value="student">
              <div className="grid gap-4">
                {filterFeed(studentFeed).map((item) => (
                  <Card key={item.id} variant="admin" className="hover:border-primary/50 transition-colors cursor-default">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-10 w-10 border border-sidebar-border">
                        <AvatarImage src={item.user_avatar} />
                        <AvatarFallback>{item.user_name?.slice(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-sidebar-foreground truncate">
                            {item.user_name}
                          </h4>
                          <span className="text-xs text-sidebar-foreground/50">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-sidebar-foreground/70 truncate">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`text-xs flex items-center gap-1 ${
                             item.meta?.status === 'in_progress' ? 'text-yellow-500' :
                             item.meta?.passed ? 'text-green-500' : 'text-red-500'
                           }`}>
                             {item.meta?.status === 'in_progress' ? (
                               <>In Progress...</>
                             ) : (
                               <>{item.meta?.passed ? 'Passed' : 'Failed'} • {item.meta?.score}%</>
                             )}
                           </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                 {filterFeed(studentFeed).length === 0 && (
                    <div className="text-center py-12 text-sidebar-foreground/50 bg-sidebar-accent/20 rounded-lg border border-dashed border-sidebar-border">
                      No recent student activity found.
                    </div>
                  )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}