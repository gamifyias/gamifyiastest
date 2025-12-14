import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RankBadge, XPBadge } from '@/components/game/GameBadges';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Crown, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  accuracy: number;
  isCurrentUser: boolean;
}

export default function StudentLeaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user?.id]);

  const fetchLeaderboard = async () => {
    try {
      // Fetch leaderboard data with profiles
      const { data: leaderboardData } = await supabase
        .from('leaderboard')
        .select('*, profiles!inner(full_name, avatar_url)')
        .order('total_xp', { ascending: false })
        .limit(50);

      if (leaderboardData) {
        const formattedLeaderboard: LeaderboardUser[] = leaderboardData.map((entry: any, index: number) => {
          const xp = entry.total_xp || 0;
          const level = Math.floor(xp / 1000) + 1;
          return {
            rank: index + 1,
            name: entry.profiles?.full_name || 'Unknown',
            avatar: getAvatarEmoji(entry.profiles?.full_name || ''),
            xp,
            level,
            accuracy: Math.round(entry.average_score || 0),
            isCurrentUser: entry.user_id === user?.id,
          };
        });

        setLeaderboard(formattedLeaderboard);

        // Find current user
        const currentUser = formattedLeaderboard.find(u => u.isCurrentUser);
        setCurrentUserRank(currentUser || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarEmoji = (name: string): string => {
    const emojis = ['🦊', '🐼', '🦁', '🦋', '🎮', '🐰', '🐸', '🦄', '🐯', '🐨', '🦅', '🐙', '🦈', '🐢'];
    const index = name.length % emojis.length;
    return emojis[index];
  };

  function getRankIcon(rank: number) {
    if (rank === 1) return <Crown className="w-6 h-6 text-game-gold fill-game-gold" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-500 fill-orange-500" />;
    return null;
  }

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  const top3 = leaderboard.slice(0, 3);

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-game flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-game-gold" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Compete with fellow learners and climb the ranks!
          </p>
        </div>

        {/* Top 3 Podium */}
        {top3.length >= 3 && (
          <div className="flex justify-center items-end gap-4 py-8">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-3xl shadow-lg">
                {top3[1].avatar}
              </div>
              <div className="font-bold truncate max-w-[100px]">{top3[1].name}</div>
              <div className="text-sm text-muted-foreground">Level {top3[1].level}</div>
              <div className="mt-2 h-24 w-20 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg flex items-center justify-center">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className="relative">
                <Crown className="w-8 h-8 text-game-gold fill-game-gold absolute -top-4 left-1/2 -translate-x-1/2" />
                <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-game-gold to-game-star flex items-center justify-center text-4xl shadow-glow">
                  {top3[0].avatar}
                </div>
              </div>
              <div className="font-bold text-lg truncate max-w-[120px]">{top3[0].name}</div>
              <div className="text-sm text-muted-foreground">Level {top3[0].level}</div>
              <div className="mt-2 h-32 w-24 bg-gradient-to-t from-game-gold to-game-star rounded-t-lg flex items-center justify-center">
                <span className="text-4xl font-bold text-primary-foreground">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl shadow-lg">
                {top3[2].avatar}
              </div>
              <div className="font-bold truncate max-w-[100px]">{top3[2].name}</div>
              <div className="text-sm text-muted-foreground">Level {top3[2].level}</div>
              <div className="mt-2 h-20 w-20 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg flex items-center justify-center">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
            </div>
          </div>
        )}

        {/* Your Rank Highlight */}
        {currentUserRank && (
          <Card variant="gameHighlight" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <RankBadge rank={currentUserRank.rank} size="lg" />
                <div>
                  <div className="font-bold text-lg">Your Position</div>
                  <div className="text-sm text-muted-foreground">
                    {currentUserRank.rank <= 3 ? "You're in the top 3! Amazing!" : "Keep going to reach the top!"}
                  </div>
                </div>
              </div>
              <XPBadge xp={currentUserRank.xp} level={currentUserRank.level} size="lg" />
            </div>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No rankings yet. Be the first to earn XP!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {leaderboard.map((entry) => (
                  <div 
                    key={entry.rank}
                    className={cn(
                      "flex items-center justify-between p-4 transition-colors hover:bg-muted/50",
                      entry.isCurrentUser && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-10 text-center">
                        {getRankIcon(entry.rank) || (
                          <span className="text-lg font-bold text-muted-foreground">#{entry.rank}</span>
                        )}
                      </div>

                      {/* Avatar & Name */}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                          entry.rank === 1 && "bg-game-gold/20",
                          entry.rank === 2 && "bg-gray-200",
                          entry.rank === 3 && "bg-orange-100",
                          entry.rank > 3 && "bg-muted"
                        )}>
                          {entry.avatar}
                        </div>
                        <div>
                          <div className={cn(
                            "font-medium",
                            entry.isCurrentUser && "text-primary font-bold"
                          )}>
                            {entry.name}
                            {entry.isCurrentUser && <span className="ml-2 text-xs text-primary">(You)</span>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Level {entry.level} • {entry.accuracy}% accuracy
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* XP */}
                      <div className="text-right">
                        <div className="font-bold text-game-gold">{entry.xp.toLocaleString()} XP</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
