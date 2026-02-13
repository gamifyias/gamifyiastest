import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle, Loader2, Lock, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('reset-link');

  // Reset Link State
  const [isLoadingRx, setIsLoadingRx] = useState(false);
  const [isSubmittedRx, setIsSubmittedRx] = useState(false);

  // Change Password State
  const [cpEmail, setCpEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingCp, setIsLoadingCp] = useState(false);

  const navigate = useNavigate();

  const handleResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingRx(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setIsSubmittedRx(true);
        toast.success('Reset link sent! Check your email.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
      console.error(error);
    } finally {
      setIsLoadingRx(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match");
    }

    if (newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    setIsLoadingCp(true);

    try {
      // 1. Sign in with the old password to verify identity
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cpEmail,
        password: oldPassword,
      });

      if (signInError) throw signInError;

      if (!signInData.user) throw new Error("Authentication failed");

      // 2. Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // 3. Sign out (optional, but good practice to force re-login with new creds, 
      //    or we can just redirect to login saying 'success')
      await supabase.auth.signOut();

      toast.success("Password changed successfully! Please sign in with your new password.");
      navigate('/auth/login');

    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
      console.error(error);
    } finally {
      setIsLoadingCp(false);
    }
  };

  if (isSubmittedRx) {
    return (
      <div className="min-h-screen bg-game-sky flex items-center justify-center p-6">
        <div className="w-full max-w-md relative z-10">
          <Card variant="elevated" className="shadow-pixel-lg text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-game-pipe flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold font-game mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <Link to="/auth/login">
                <Button variant="game" size="lg" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-game-sky flex items-center justify-center p-6">
      <div className="w-full max-w-md relative z-10">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Sign In
        </Link>

        <Card variant="elevated" className="shadow-pixel-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Password Recovery</CardTitle>
            <CardDescription>
              Choose how you want to recover your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="reset-link" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="reset-link">Reset via Email</TabsTrigger>
                <TabsTrigger value="manual-change">Change Password</TabsTrigger>
              </TabsList>

              <TabsContent value="reset-link">
                <form onSubmit={handleResetLink} className="space-y-5">
                  <div className="p-4 bg-muted/30 border rounded-lg text-sm text-muted-foreground mb-4">
                    Don't know your password? We can send a reset link to your email address.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="game" size="lg" className="w-full" disabled={isLoadingRx}>
                    {isLoadingRx ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="manual-change">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="p-4 bg-muted/30 border rounded-lg text-sm text-muted-foreground mb-4">
                    Know your current password? You can change it directly here.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cp-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="cp-email"
                        type="email"
                        placeholder="your@email.com"
                        value={cpEmail}
                        onChange={(e) => setCpEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="old-pass">Current Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="old-pass"
                        type="password"
                        placeholder="Current password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-pass">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="new-pass"
                        type="password"
                        placeholder="New password (min 6 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-pass">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirm-pass"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="game" className="w-full" disabled={isLoadingCp}>
                    {isLoadingCp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
