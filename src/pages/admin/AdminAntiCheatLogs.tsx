import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Shield,
  Search,
  AlertTriangle,
  Eye,
  Monitor,
  Copy,
  MousePointer,
  RefreshCw,
  ArrowLeft,
  Code,
  Wifi,
  Loader2,
} from 'lucide-react';

interface AntiCheatLog {
  id: string;
  attempt_id: string;
  user_id: string;
  violation_type: string;
  violation_details: Record<string, unknown> | null;
  created_at: string;
  profiles?: { full_name: string; email: string };
  student_test_attempts?: { 
    tests: { title: string } | null;
  };
}

interface FlaggedAttempt {
  id: string;
  user_id: string;
  test_id: string;
  is_flagged: boolean;
  flag_reason: string | null;
  tab_switches: number;
  fullscreen_exits: number;
  copy_attempts: number;
  right_click_attempts: number;
  created_at: string;
  profiles?: { full_name: string };
  tests?: { title: string };
}

const violationIcons: Record<string, React.ReactNode> = {
  tab_switch: <Eye className="w-4 h-4" />,
  fullscreen_exit: <Monitor className="w-4 h-4" />,
  copy_attempt: <Copy className="w-4 h-4" />,
  paste_attempt: <Copy className="w-4 h-4" />,
  right_click: <MousePointer className="w-4 h-4" />,
  devtools_open: <Code className="w-4 h-4" />,
  page_reload: <RefreshCw className="w-4 h-4" />,
  back_button: <ArrowLeft className="w-4 h-4" />,
  network_disconnect: <Wifi className="w-4 h-4" />,
};

const violationColors: Record<string, string> = {
  tab_switch: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  fullscreen_exit: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  copy_attempt: 'bg-red-500/20 text-red-500 border-red-500/30',
  paste_attempt: 'bg-red-500/20 text-red-500 border-red-500/30',
  right_click: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  devtools_open: 'bg-red-600/20 text-red-600 border-red-600/30',
  page_reload: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  back_button: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  network_disconnect: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
};

export default function AdminAntiCheatLogs() {
  const location = useLocation();
  const role = location.pathname.startsWith('/mentor') ? 'mentor' : 'admin';
  
  const [logs, setLogs] = useState<AntiCheatLog[]>([]);
  const [flaggedAttempts, setFlaggedAttempts] = useState<FlaggedAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [violationFilter, setViolationFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch anti-cheat logs
      const { data: logsData } = await supabase
        .from('anti_cheat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsData) {
        // Fetch profiles and test info separately
        const userIds = [...new Set(logsData.map(l => l.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        const attemptIds = [...new Set(logsData.map(l => l.attempt_id))];
        const { data: attempts } = await supabase
          .from('student_test_attempts')
          .select('id, tests(title)')
          .in('id', attemptIds);

        const enrichedLogs = logsData.map(log => ({
          ...log,
          profiles: profiles?.find(p => p.user_id === log.user_id),
          student_test_attempts: attempts?.find(a => a.id === log.attempt_id),
        }));
        setLogs(enrichedLogs as AntiCheatLog[]);
      }

      // Fetch flagged attempts
      const { data: attemptsData } = await supabase
        .from('student_test_attempts')
        .select('id, user_id, test_id, is_flagged, flag_reason, tab_switches, fullscreen_exits, copy_attempts, right_click_attempts, created_at')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });

      if (attemptsData) {
        const userIds = [...new Set(attemptsData.map(a => a.user_id))];
        const testIds = [...new Set(attemptsData.map(a => a.test_id))];
        
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
        const { data: tests } = await supabase.from('tests').select('id, title').in('id', testIds);

        const enrichedAttempts = attemptsData.map(att => ({
          ...att,
          profiles: profiles?.find(p => p.user_id === att.user_id),
          tests: tests?.find(t => t.id === att.test_id),
        }));
        setFlaggedAttempts(enrichedAttempts as FlaggedAttempt[]);
      }

      if (attemptsData) {
        setFlaggedAttempts(attemptsData as FlaggedAttempt[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = violationFilter === 'all' || log.violation_type === violationFilter;
    return matchesSearch && matchesFilter;
  });

  const violationTypes = [...new Set(logs.map(l => l.violation_type))];
  
  // Stats
  const totalViolations = logs.length;
  const uniqueUsers = new Set(logs.map(l => l.user_id)).size;
  const mostCommonViolation = logs.reduce((acc, log) => {
    acc[log.violation_type] = (acc[log.violation_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topViolation = Object.entries(mostCommonViolation).sort((a, b) => b[1] - a[1])[0];

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
        <div>
          <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-destructive" />
            Anti-Cheat Logs
          </h1>
          <p className="text-sidebar-foreground/70 mt-1">Monitor and review test integrity violations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{totalViolations}</p>
                  <p className="text-xs text-sidebar-foreground/70">Total Violations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{flaggedAttempts.length}</p>
                  <p className="text-xs text-sidebar-foreground/70">Flagged Attempts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-8 h-8 text-secondary" />
                <div>
                  <p className="text-2xl font-bold text-sidebar-foreground">{uniqueUsers}</p>
                  <p className="text-xs text-sidebar-foreground/70">Unique Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="admin">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {topViolation ? violationIcons[topViolation[0]] : <AlertTriangle className="w-8 h-8" />}
                <div>
                  <p className="text-lg font-bold text-sidebar-foreground capitalize">
                    {topViolation ? topViolation[0].replace('_', ' ') : 'N/A'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/70">Most Common</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={violationFilter} onValueChange={setViolationFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All violations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Violations</SelectItem>
              {violationTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Flagged Attempts */}
        {flaggedAttempts.length > 0 && (
          <Card variant="admin">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Flagged Test Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {flaggedAttempts.slice(0, 5).map(attempt => (
                  <div key={attempt.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div>
                      <p className="font-medium text-sidebar-foreground">{attempt.profiles?.full_name}</p>
                      <p className="text-sm text-sidebar-foreground/70">{attempt.tests?.title}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-2 mb-1">
                        {attempt.tab_switches > 0 && (
                          <Badge variant="outline" className="text-xs">Tab: {attempt.tab_switches}</Badge>
                        )}
                        {attempt.fullscreen_exits > 0 && (
                          <Badge variant="outline" className="text-xs">FS: {attempt.fullscreen_exits}</Badge>
                        )}
                        {attempt.copy_attempts > 0 && (
                          <Badge variant="outline" className="text-xs">Copy: {attempt.copy_attempts}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-sidebar-foreground/50">
                        {format(new Date(attempt.created_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs Table */}
        <Card variant="admin">
          <CardHeader>
            <CardTitle className="text-lg text-sidebar-foreground">Recent Violations</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-sidebar-foreground/50">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No violations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sidebar-foreground/70">Student</TableHead>
                      <TableHead className="text-sidebar-foreground/70">Test</TableHead>
                      <TableHead className="text-sidebar-foreground/70">Violation</TableHead>
                      <TableHead className="text-sidebar-foreground/70">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sidebar-foreground">{log.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-sidebar-foreground/50">{log.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sidebar-foreground/70">
                          {log.student_test_attempts?.tests?.title || 'Unknown Test'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={violationColors[log.violation_type] || 'bg-muted'}
                          >
                            {violationIcons[log.violation_type]}
                            <span className="ml-1 capitalize">{log.violation_type.replace('_', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sidebar-foreground/70">
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
