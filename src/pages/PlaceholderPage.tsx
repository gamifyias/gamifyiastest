import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Construction, ArrowLeft } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  role: 'student' | 'mentor' | 'admin';
}

export default function PlaceholderPage({ title, role }: PlaceholderPageProps) {
  const content = (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card variant={role === 'student' ? 'game' : 'admin'} className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-game-gold to-game-star flex items-center justify-center">
            <Construction className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-game mb-2">{title}</h1>
          <p className={`mb-6 ${role === 'admin' || role === 'mentor' ? 'text-sidebar-foreground/70' : 'text-muted-foreground'}`}>
            This page is under construction. Connect Supabase to enable full functionality!
          </p>
          <Link to={`/${role}/dashboard`}>
            <Button variant={role === 'student' ? 'game' : 'admin'}>
              <ArrowLeft size={18} />
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  if (role === 'student') {
    return <StudentLayout>{content}</StudentLayout>;
  }

  return <AdminLayout role={role}>{content}</AdminLayout>;
}
