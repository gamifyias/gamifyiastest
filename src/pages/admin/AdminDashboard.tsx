import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  TrendingUp,
  UserCheck,
  UserX,
  GraduationCap,
  Shield,
  Terminal,
  Activity,
  Cpu,
  Lock
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  pendingUsers: number;
  students: number;
  mentors: number;
  subjects: number;
  tests: number;
}

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', stiffness: 100 } 
  }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, pendingUsers: 0, students: 0, mentors: 0, subjects: 0, tests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [bootSequence, setBootSequence] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    runBootSequence();
    fetchStats();
  }, []);

  const runBootSequence = async () => {
    const sequence = [
      "> INITIALIZING GAMIFY_IAS_CORE_V2.0...",
      "> ESTABLISHING SECURE CONNECTION TO SUPABASE...",
      "> BYPASSING REGIONAL FIREWALLS...",
      "> LOADING STUDENT DATABASE...",
      "> SCANNING MENTOR CREDENTIALS...",
      "> SYSTEM STATUS: OPTIMAL. ACCESS GRANTED."
    ];

    for (let i = 0; i < sequence.length; i++) {
      await new Promise(res => setTimeout(res, 400));
      setLogs(prev => [...prev, sequence[i]]);
    }
    setTimeout(() => setBootSequence(false), 800);
  };

  const fetchStats = async () => {
    try {
      const { data: roles } = await supabase.from('user_roles').select('role');
      const roleCounts = roles?.reduce((acc, { role }) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const { count: subjectsCount } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
      const { count: testsCount } = await supabase.from('tests').select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: roles?.length || 0,
        pendingUsers: roleCounts['pending'] || 0,
        students: roleCounts['student'] || 0,
        mentors: roleCounts['mentor'] || 0,
        subjects: subjectsCount || 0,
        tests: testsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { icon: Users, label: 'Total Nodes', value: stats.totalUsers, color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/50' },
    { icon: UserX, label: 'Pending Access', value: stats.pendingUsers, color: 'from-orange-500/20 to-orange-600/20', border: 'border-orange-500/50' },
    { icon: GraduationCap, label: 'Active Students', value: stats.students, color: 'from-green-500/20 to-green-600/20', border: 'border-green-500/50' },
    { icon: Shield, label: 'Admin Mentors', value: stats.mentors, color: 'from-purple-500/20 to-purple-600/20', border: 'border-purple-500/50' },
    { icon: BookOpen, label: 'Knowledge Base', value: stats.subjects, color: 'from-cyan-500/20 to-cyan-600/20', border: 'border-cyan-500/50' },
    { icon: ClipboardList, label: 'Test Modules', value: stats.tests, color: 'from-pink-500/20 to-pink-600/20', border: 'border-pink-500/50' },
  ];

  return (
    <AdminLayout role="admin">
      <AnimatePresence mode="wait">
        {bootSequence ? (
          // HACKER BOOT SCREEN
          <motion.div 
            key="boot"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono p-10"
          >
            <div className="max-w-2xl w-full">
              <motion.div 
                animate={{ opacity: [1, 0.5, 1] }} 
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="text-green-500 mb-8 flex items-center gap-2 text-xl"
              >
                <Terminal size={24} /> GAMIFY IAS // TERMINAL ACCESS
              </motion.div>
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <motion.p 
                    initial={{ x: -10, opacity: 0 }} 
                    animate={{ x: 0, opacity: 1 }} 
                    key={i} 
                    className="text-green-400 text-sm md:text-base"
                  >
                    {log}
                  </motion.p>
                ))}
                <motion.div 
                  animate={{ opacity: [0, 1] }} 
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-2 h-5 bg-green-500 inline-block"
                />
              </div>
            </div>
          </motion.div>
        ) : (
          // MAIN DASHBOARD
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 relative"
          >
            {/* Background Digital Rain Effect (Subtle) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden -z-10">
               <p className="text-xs break-all font-mono">
                  {Array(2000).fill("01").join("")}
               </p>
            </div>

            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary font-mono text-sm mb-1">
                  <Cpu className="w-4 h-4 animate-pulse" /> SYSTEM_ADMIN_V2
                </div>
                <h1 className="text-4xl font-black text-sidebar-foreground tracking-tighter uppercase italic">
                  Command Center
                </h1>
                <p className="text-sidebar-foreground/60 font-mono text-xs">OPERATIONAL_STATUS: ALL_SYSTEMS_GO</p>
              </div>
              <div className="bg-sidebar-accent px-4 py-2 rounded-md border border-white/5 flex items-center gap-4">
                 <div className="flex items-center gap-2 text-green-500 font-mono text-xs">
                    <Activity size={14} className="animate-bounce" /> ENCRYPTION: ACTIVE
                 </div>
                 <div className="w-px h-4 bg-white/10" />
                 <div className="text-xs font-mono text-sidebar-foreground/40">TIME: {new Date().toLocaleTimeString()}</div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statCards.map((stat) => (
                <motion.div key={stat.label} variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }}>
                  <Card variant="admin" className={`relative overflow-hidden group border-t-2 ${stat.border} bg-black/40 backdrop-blur-xl`}>
                    <CardContent className="p-5">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-3xl font-black text-sidebar-foreground font-mono tracking-tighter">
                        {isLoading ? '---' : stat.value}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-bold mt-1">
                        {stat.label}
                      </div>
                      
                      {/* Scanning Line Animation */}
                      <motion.div 
                        animate={{ top: ["0%", "100%", "0%"] }} 
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[1px] bg-white/10 z-0"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants}>
                <Card variant="admin" className="border-l-4 border-orange-500 bg-black/40 backdrop-blur-xl group">
                  <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-sidebar-foreground flex items-center gap-2 font-mono text-sm">
                      <Lock className="w-4 h-4 text-orange-500" />
                      Security: Pending Approvals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {stats.pendingUsers > 0 ? (
                      <div className="flex items-center gap-4">
                        <div className="text-5xl font-black text-orange-500 animate-pulse">!</div>
                        <p className="text-sidebar-foreground/80 font-mono text-sm leading-relaxed">
                          ALERT: Detect <span className="text-orange-500 font-bold underline">{stats.pendingUsers}</span> unauthorized nodes. 
                          <br />Manual role assignment required.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sidebar-foreground/40 font-mono text-sm italic">Status: Secure. No pending threads.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card variant="admin" className="border-l-4 border-primary bg-black/40 backdrop-blur-xl">
                  <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-sidebar-foreground flex items-center gap-2 font-mono text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Live Network Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-sidebar-foreground/40 uppercase">Database Latency</span>
                        <span className="text-green-500">12ms</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: "85%" }} 
                          transition={{ duration: 2 }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <p className="text-sidebar-foreground/80 font-mono text-xs">
                        {">"} GLOBAL_UPLINK: ONLINE <br />
                        {">"} GAMIFY_IAS_CLOUD: OPERATIONAL
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}