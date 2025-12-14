import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { XPBadge, CoinBadge } from '@/components/game/GameBadges';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Star, 
  Lock, 
  CheckCircle, 
  Zap,
  Trophy,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'locked';
  stars: number;
  xp: number;
  isBoss?: boolean;
}

interface World {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  progress: number;
  topics: Topic[];
}

interface LevelNodeProps {
  level: Topic;
  index: number;
  worldColor: string;
}

const worldColors = [
  { color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500/10', icon: '🔢' },
  { color: 'from-green-500 to-green-600', bgColor: 'bg-green-500/10', icon: '🔬' },
  { color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-500/10', icon: '📚' },
  { color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-500/10', icon: '🏰' },
  { color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-500/10', icon: '🎨' },
  { color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-500/10', icon: '💻' },
];

function LevelNode({ level, index, worldColor }: LevelNodeProps) {
  const isCompleted = level.status === 'completed';
  const isCurrent = level.status === 'current';
  const isLocked = level.status === 'locked';
  const isBoss = level.isBoss;

  return (
    <Link 
      to={isLocked ? '#' : `/student/test/${level.id}`}
      className={cn(
        "relative group",
        isLocked && "cursor-not-allowed"
      )}
    >
      <div 
        className={cn(
          "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg",
          isCompleted && `bg-gradient-to-br ${worldColor} text-white`,
          isCurrent && "bg-gradient-to-br from-game-gold to-game-star text-primary-foreground animate-pulse-glow",
          isLocked && "bg-muted/50 text-muted-foreground",
          isBoss && isCompleted && "bg-gradient-to-br from-game-boss to-purple-800",
          isBoss && !isCompleted && !isLocked && "bg-gradient-to-br from-game-boss/80 to-purple-800/80 animate-wiggle",
          !isLocked && "hover:scale-110 hover:shadow-xl cursor-pointer"
        )}
      >
        {isLocked ? (
          <Lock className="w-6 h-6" />
        ) : isBoss ? (
          <span className="text-2xl">👑</span>
        ) : isCompleted ? (
          <CheckCircle className="w-8 h-8" />
        ) : (
          <span className="font-bold text-lg">{index + 1}</span>
        )}
      </div>

      {/* Stars */}
      {isCompleted && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[1, 2, 3].map((star) => (
            <Star 
              key={star}
              className={cn(
                "w-4 h-4",
                star <= level.stars 
                  ? "text-game-gold fill-game-gold" 
                  : "text-gray-300"
              )}
            />
          ))}
        </div>
      )}

      {/* XP Reward */}
      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-game-gold text-primary-foreground text-xs font-bold rounded-full shadow">
        +{level.xp}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {level.name}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
      </div>
    </Link>
  );
}

export default function StudentGameWorld() {
  const { user } = useAuth();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);
  const [userStats, setUserStats] = useState({ xp: 0, level: 1, coins: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGameWorldData();
  }, [user?.id]);

  const fetchGameWorldData = async () => {
    try {
      // Fetch subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // Fetch topics for each subject
      const { data: topics } = await supabase
        .from('topics')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // Fetch user's completed topics (based on test attempts)
      const { data: completedAttempts } = await supabase
        .from('student_test_attempts')
        .select('test_id, is_passed, tests(test_topics(topic_id))')
        .eq('user_id', user?.id || '')
        .in('status', ['submitted', 'auto_submitted']);

      // Fetch user stats
      const { data: leaderboardData } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      // Get completed topic IDs
      const completedTopicIds = new Set<string>();
      completedAttempts?.forEach((attempt: any) => {
        if (attempt.is_passed && attempt.tests?.test_topics) {
          attempt.tests.test_topics.forEach((tt: any) => {
            completedTopicIds.add(tt.topic_id);
          });
        }
      });

      // Build worlds from subjects
      const formattedWorlds: World[] = (subjects || []).map((subject, subjectIndex) => {
        const subjectTopics = (topics || []).filter(t => t.subject_id === subject.id);
        const colorSet = worldColors[subjectIndex % worldColors.length];
        
        let foundCurrent = false;
        const formattedTopics: Topic[] = subjectTopics.map((topic, index) => {
          const isCompleted = completedTopicIds.has(topic.id);
          let status: 'completed' | 'current' | 'locked' = 'locked';
          
          if (isCompleted) {
            status = 'completed';
          } else if (!foundCurrent) {
            status = 'current';
            foundCurrent = true;
          }

          // Last topic in each subject is a boss level
          const isBoss = index === subjectTopics.length - 1;

          return {
            id: topic.id,
            name: topic.name,
            status,
            stars: isCompleted ? Math.floor(Math.random() * 2) + 2 : 0, // Random 2-3 stars for completed
            xp: topic.xp_reward || 100,
            isBoss,
          };
        });

        // Calculate progress
        const completedCount = formattedTopics.filter(t => t.status === 'completed').length;
        const progress = formattedTopics.length > 0 
          ? Math.round((completedCount / formattedTopics.length) * 100)
          : 0;

        return {
          id: subject.id,
          name: subject.name,
          description: subject.description || 'Explore and master this subject',
          color: colorSet.color,
          bgColor: colorSet.bgColor,
          icon: colorSet.icon,
          progress,
          topics: formattedTopics,
        };
      });

      setWorlds(formattedWorlds);
      if (formattedWorlds.length > 0) {
        setSelectedWorld(formattedWorlds[0]);
      }

      // Set user stats
      const xp = leaderboardData?.total_xp || 0;
      setUserStats({
        xp,
        level: Math.floor(xp / 1000) + 1,
        coins: leaderboardData?.total_coins || 0,
      });

    } catch (error) {
      console.error('Error fetching game world data:', error);
    } finally {
      setIsLoading(false);
    }
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

  if (worlds.length === 0) {
    return (
      <StudentLayout>
        <div className="min-h-screen bg-game-sky">
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center py-20">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-game-gold" />
              <h2 className="text-2xl font-bold font-game mb-2">No Worlds Available Yet</h2>
              <p className="text-muted-foreground">Check back soon for new learning adventures!</p>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="min-h-screen bg-game-sky">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-game flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-game-gold" />
                Game World
              </h1>
              <p className="text-muted-foreground mt-1">
                Navigate through worlds, complete levels, defeat bosses!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <XPBadge xp={userStats.xp} level={userStats.level} />
              <CoinBadge coins={userStats.coins} />
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* World Selection */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="font-bold text-lg mb-4">Select World</h2>
              {worlds.map((world) => (
                <Card 
                  key={world.id}
                  variant={selectedWorld?.id === world.id ? "gameHighlight" : "interactive"}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedWorld?.id === world.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedWorld(world)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                        world.bgColor
                      )}>
                        {world.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{world.name}</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full bg-gradient-to-r", world.color)}
                              style={{ width: `${world.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{world.progress}%</span>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "w-5 h-5 transition-colors",
                        selectedWorld?.id === world.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Level Map */}
            {selectedWorld && (
              <Card variant="glass" className="lg:col-span-3 overflow-hidden">
                <div className={cn(
                  "p-6 bg-gradient-to-br",
                  selectedWorld.color,
                  "bg-opacity-10"
                )}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl backdrop-blur">
                      {selectedWorld.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-game text-white drop-shadow-lg">{selectedWorld.name}</h2>
                      <p className="text-white/80">{selectedWorld.description}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-8">
                    <div className="flex justify-between text-sm text-white/80 mb-2">
                      <span>World Progress</span>
                      <span>{selectedWorld.progress}%</span>
                    </div>
                    <div className="h-4 bg-white/20 rounded-full overflow-hidden backdrop-blur">
                      <div 
                        className="h-full bg-gradient-to-r from-game-gold to-game-star rounded-full transition-all duration-500"
                        style={{ width: `${selectedWorld.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Level Path */}
                  {selectedWorld.topics.length > 0 ? (
                    <div className="relative">
                      {/* Path Line */}
                      <div className="absolute top-1/2 left-0 right-0 h-2 bg-white/20 rounded-full -translate-y-1/2 z-0" />
                      
                      {/* Level Nodes */}
                      <div className="relative z-10 flex justify-between items-center py-8 overflow-x-auto">
                        {selectedWorld.topics.map((topic, index) => (
                          <LevelNode 
                            key={topic.id} 
                            level={topic} 
                            index={index}
                            worldColor={selectedWorld.color}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-white/60">
                      <Lock className="w-12 h-12 mx-auto mb-4" />
                      <p>No topics available in this world yet</p>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-game-gold"></div>
                      <span>Current Level</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Locked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👑</span>
                      <span>Boss Level</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Current Quest */}
          {selectedWorld && selectedWorld.topics.length > 0 && (
            <Card variant="gameHighlight" className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-game-gold to-game-star flex items-center justify-center shadow-glow">
                    <Zap className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-game">Current Quest</h3>
                    <p className="text-muted-foreground">
                      Complete <strong>{selectedWorld.topics.find(t => t.status === 'current')?.name || 'all levels'}</strong> to unlock the next level!
                    </p>
                  </div>
                </div>
                <Link to={`/student/test/${selectedWorld.topics.find(t => t.status === 'current')?.id || ''}`}>
                  <Button variant="game" size="lg" disabled={!selectedWorld.topics.find(t => t.status === 'current')}>
                    <Trophy className="w-5 h-5" />
                    Continue Quest
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
