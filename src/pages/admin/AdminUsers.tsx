import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  Shield, 
  GraduationCap,
  BookOpen,
  Clock,
  Check,
  X,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from '@/types';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const combined = roles?.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          id: role.id,
          user_id: role.user_id,
          email: profile?.email || 'Unknown',
          full_name: profile?.full_name || 'Unknown',
          role: role.role as UserRole,
          created_at: role.created_at,
        };
      }) || [];

      setUsers(combined);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole } : u
      ));

      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter;
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return Shield;
      case 'mentor': return BookOpen;
      case 'student': return GraduationCap;
      case 'pending': return Clock;
      default: return Users;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-game-boss text-white';
      case 'mentor': return 'bg-secondary text-white';
      case 'student': return 'bg-game-pipe text-white';
      case 'pending': return 'bg-orange-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <AdminLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-sidebar-foreground">User Management</h1>
            <p className="text-sidebar-foreground/60 mt-1">Manage user accounts and assign roles</p>
          </div>
        </div>

        {/* Filters */}
        <Card variant="admin">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
                />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | UserRole)}>
                <SelectTrigger className="w-[180px] bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', count: users.length, color: 'from-blue-500 to-blue-600' },
            { label: 'Pending', count: users.filter(u => u.role === 'pending').length, color: 'from-orange-500 to-orange-600' },
            { label: 'Students', count: users.filter(u => u.role === 'student').length, color: 'from-green-500 to-green-600' },
            { label: 'Mentors', count: users.filter(u => u.role === 'mentor').length, color: 'from-purple-500 to-purple-600' },
          ].map(stat => (
            <Card key={stat.label} variant="admin">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-sidebar-foreground">{stat.count}</div>
                <div className="text-xs text-sidebar-foreground/60">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card variant="admin">
          <CardHeader>
            <CardTitle className="text-sidebar-foreground">Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-sidebar-foreground/60">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-sidebar-foreground/60">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sidebar-border">
                      <th className="text-left py-3 px-4 text-sidebar-foreground/60 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-sidebar-foreground/60 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-sidebar-foreground/60 font-medium">Current Role</th>
                      <th className="text-left py-3 px-4 text-sidebar-foreground/60 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const RoleIcon = getRoleIcon(user.role);
                      return (
                        <tr key={user.id} className="border-b border-sidebar-border/50 hover:bg-sidebar-accent/50">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${getRoleColor(user.role)} flex items-center justify-center`}>
                                <span className="font-bold">{user.full_name.charAt(0).toUpperCase()}</span>
                              </div>
                              <span className="text-sidebar-foreground font-medium">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sidebar-foreground/80">{user.email}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                              <RoleIcon size={12} />
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Select 
                                value={user.role} 
                                onValueChange={(v) => updateUserRole(user.user_id, v as UserRole)}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="mentor">Mentor</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
