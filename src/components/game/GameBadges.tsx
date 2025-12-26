import { Coins, Star, Trophy, Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPBadgeProps {
  xp: number;
  level: number;
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function XPBadge({ xp, level, showLevel = true, size = 'md', className }: XPBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-1',
    md: 'text-sm gap-1.5 px-3 py-1.5',
    lg: 'text-base gap-2 px-4 py-2',
  };

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className={cn(
      "inline-flex items-center bg-gradient-to-r from-game-gold to-game-gold/80 text-primary-foreground rounded-full font-bold shadow-md coin-glow",
      sizeClasses[size],
      className
    )}>
      <Zap size={iconSize[size]} className="fill-current" />
      <span>{xp.toLocaleString()} XP</span>
      {showLevel && (
        <>
          <span className="opacity-60">•</span>
          <span>Lv.{level}</span>
        </>
      )}
    </div>
  );
}

interface CoinBadgeProps {
  coins: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CoinBadge({ coins, size = 'md', className }: CoinBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-1',
    md: 'text-sm gap-1.5 px-3 py-1.5',
    lg: 'text-base gap-2 px-4 py-2',
  };

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className={cn(
      "inline-flex items-center bg-gradient-to-r from-game-star to-game-gold text-primary-foreground rounded-full font-bold shadow-md",
      sizeClasses[size],
      className
    )}>
      <Coins size={iconSize[size]} className="animate-coin-spin" />
      <span>{coins.toLocaleString()}</span>
    </div>
  );
}

interface StreakBadgeProps {
  days: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StreakBadge({ days, size = 'md', className }: StreakBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-1',
    md: 'text-sm gap-1.5 px-3 py-1.5',
    lg: 'text-base gap-2 px-4 py-2',
  };

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className={cn(
      "inline-flex items-center bg-gradient-to-r from-game-mushroom to-destructive text-white rounded-full font-bold shadow-md",
      sizeClasses[size],
      className
    )}>
      <Flame size={iconSize[size]} className="fill-current" />
      <span>{days} day streak</span>
    </div>
  );
}

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RankBadge({ rank, size = 'md', className }: RankBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-1',
    md: 'text-sm gap-1.5 px-3 py-1.5',
    lg: 'text-base gap-2 px-4 py-2',
  };

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-game-gold to-yellow-600';
    if (rank === 2) return 'from-gray-400 to-gray-500';
    if (rank === 3) return 'from-orange-600 to-orange-700';
    return 'from-game-pipe to-game-pipe-dark';
  };

  return (
    <div className={cn(
      "inline-flex items-center text-white rounded-full font-bold shadow-md",
      `bg-gradient-to-r ${getRankColor(rank)}`,
      sizeClasses[size],
      className
    )}>
      <Trophy size={iconSize[size]} className="fill-current" />
      <span>#{rank}</span>
    </div>
  );
}

interface LevelProgressProps {
  currentXP: number;
  xpForNextLevel: number;
  level: number;
  className?: string;
}

export function LevelProgress({ currentXP, xpForNextLevel, level, className }: LevelProgressProps) {
  const progress = (currentXP / xpForNextLevel) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-primary flex items-center gap-1">
          <Star size={16} className="fill-game-gold text-game-gold" />
          Level {level}
        </span>
        <span className="text-muted-foreground">
          {currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-game-gold to-game-star rounded-full transition-all duration-500 progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface AchievementBadgeProps {
  icon: React.ReactNode;
  name: string;
  unlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AchievementBadge({ icon, name, unlocked = false, size = 'md', className }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  return (
    <div 
      className={cn(
        "relative flex items-center justify-center rounded-xl border-2 transition-all duration-300",
        unlocked 
          ? "bg-gradient-to-br from-game-gold/20 to-game-star/20 border-game-gold text-game-gold shadow-glow" 
          : "bg-muted/50 border-muted-foreground/20 text-muted-foreground grayscale",
        sizeClasses[size],
        className
      )}
      title={name}
    >
      {icon}
      {unlocked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-game-pipe rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
