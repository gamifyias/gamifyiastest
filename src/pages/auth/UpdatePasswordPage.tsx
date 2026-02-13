import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSessionValid, setIsSessionValid] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check initial session
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    // If no session, wait a brief moment for the hash to be processed (race condition safeguard)
                    // However, usually onAuthStateChange catches it better.
                    // We'll rely on onAuthStateChange below for dynamic updates, but check here initially.
                    console.log("No initial session found, waiting for auth state change...");
                } else {
                    setIsSessionValid(true);
                }
            } catch (error) {
                console.error("Error checking session:", error);
            } finally {
                setPageLoading(false);
            }
        };

        checkSession();

        // Listen for auth changes (e.g. when the recovery link is processed)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event:", event);
            if (event === 'PASSWORD_RECOVERY') {
                setIsSessionValid(true);
            } else if (event === 'SIGNED_IN') {
                setIsSessionValid(true);
            } else if (event === 'SIGNED_OUT') {
                setIsSessionValid(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isSessionValid) {
            toast.error("Invalid or expired session. Please request a new password reset link.");
            navigate('/auth/forgot-password');
            return;
        }

        if (password !== confirmPassword) {
            return toast.error("Passwords do not match");
        }

        if (password.length < 6) {
            return toast.error("Password must be at least 6 characters");
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success("Password updated successfully! Please sign in.");

            // Sign out so they can log in with the new password cleanly
            await supabase.auth.signOut();
            navigate('/auth/login');

        } catch (error: any) {
            toast.error(error.message || "Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-game-sky flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-game-sky flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <Card variant="elevated" className="shadow-pixel-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Set New Password</CardTitle>
                        <CardDescription>Enter your new password below</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        placeholder="Min 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="confirm"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10"
                                        placeholder="Re-enter password"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="game" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}