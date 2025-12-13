import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, LogOut, Mail } from 'lucide-react';

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-game-sky flex items-center justify-center p-6">
      {/* Decorative Clouds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-16 bg-game-cloud rounded-full opacity-80 float" />
        <div className="absolute top-32 right-20 w-40 h-20 bg-game-cloud rounded-full opacity-70 float" style={{ animationDelay: '1s' }} />
      </div>

      <Card variant="elevated" className="max-w-md w-full shadow-pixel-lg relative z-10">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-game-gold to-game-star flex items-center justify-center shadow-pixel animate-pulse">
            <Clock className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Waiting for Approval</CardTitle>
          <CardDescription>
            Your account is pending admin approval
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Signed in as:</span>
            </div>
            <p className="font-medium">{user?.email}</p>
            <p className="text-sm text-muted-foreground">{user?.full_name}</p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Thank you for registering! An administrator will review your account and assign you a role shortly.
            </p>
            <p className="text-xs text-muted-foreground">
              You will be redirected automatically once approved.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={logout} className="w-full">
              <LogOut size={18} />
              Sign Out
            </Button>
            <Link to="/" className="w-full">
              <Button variant="ghost" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
