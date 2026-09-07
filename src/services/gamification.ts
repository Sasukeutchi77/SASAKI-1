/**
 * purge-info Gamification Engine
 * Developed by SASAKI COMPAGNIE
 * Handles XP rewards, levels, streaks, daily missions, and achievement badges.
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  category: 'reader' | 'social' | 'investigation' | 'streak';
}

export interface DailyQuest {
  id: string;
  title: string;
  rewardXP: number;
  current: number;
  target: number;
  completed: boolean;
  type: 'read_article' | 'like_article' | 'share_article' | 'comment_article';
}

export interface GamificationState {
  xp: number;
  level: number;
  rankTitle: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  streakDays: number;
  lastActiveDate: string;
  articlesReadToday: number;
  quests: DailyQuest[];
  badges: Badge[];
}

const STORAGE_KEY = 'purge_info_gamification_state';

const RANKS = [
  { level: 1, title: 'Initié Purge', minXP: 0, nextXP: 100 },
  { level: 2, title: 'Veilleur Citoyen', minXP: 100, nextXP: 250 },
  { level: 3, title: 'Éclaireur de Vérité', minXP: 250, nextXP: 500 },
  { level: 4, title: 'Chroniqueur d\'Élite', minXP: 500, nextXP: 1000 },
  { level: 5, title: 'Commandeur de l\'Info', minXP: 1000, nextXP: 2000 },
  { level: 6, title: 'Grand Maître purge-info', minXP: 2000, nextXP: 5000 },
];

const DEFAULT_BADGES: Badge[] = [
  {
    id: 'first_read',
    name: 'Première Dépêche',
    description: 'A lu son premier article sur purge-info.',
    icon: '📰',
    unlockedAt: null,
    category: 'reader',
  },
  {
    id: 'streak_3',
    name: 'Citoyen Assidu',
    description: '3 jours consécutifs de veille informative.',
    icon: '🔥',
    unlockedAt: null,
    category: 'streak',
  },
  {
    id: 'supporter',
    name: 'Soutien de la Presse',
    description: 'A liké 5 articles de journalistes vérifiés.',
    icon: '❤️',
    unlockedAt: null,
    category: 'social',
  },
  {
    id: 'debater',
    name: 'Voix Citoyenne',
    description: 'A posté 3 commentaires constructifs.',
    icon: '💬',
    unlockedAt: null,
    category: 'social',
  },
  {
    id: 'truth_spreader',
    name: 'Relais d\'Impact',
    description: 'A partagé 5 articles vérifiés sur les réseaux.',
    icon: '🚀',
    unlockedAt: null,
    category: 'investigation',
  },
  {
    id: 'sasaki_elite',
    name: 'Pionnier SASAKI',
    description: 'A atteint le Niveau 3 sur la plateforme.',
    icon: '👑',
    unlockedAt: null,
    category: 'investigation',
  },
];

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const INITIAL_QUESTS: DailyQuest[] = [
  {
    id: 'q_read_3',
    title: 'Consulter 3 dépêches d\'actualité',
    rewardXP: 30,
    current: 0,
    target: 3,
    completed: false,
    type: 'read_article',
  },
  {
    id: 'q_like_1',
    title: 'Soutenir une investigation (Like)',
    rewardXP: 15,
    current: 0,
    target: 1,
    completed: false,
    type: 'like_article',
  },
  {
    id: 'q_share_1',
    title: 'Partager une information vérifiée',
    rewardXP: 25,
    current: 0,
    target: 1,
    completed: false,
    type: 'share_article',
  },
];

export function calculateLevelData(totalXP: number) {
  let currentRank = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalXP >= RANKS[i].minXP) {
      currentRank = RANKS[i];
      break;
    }
  }

  const min = currentRank.minXP;
  const max = currentRank.nextXP;
  const levelXP = totalXP - min;
  const needed = max - min;
  const progressPercent = Math.min(100, Math.max(0, Math.round((levelXP / needed) * 100)));

  return {
    level: currentRank.level,
    rankTitle: currentRank.title,
    currentLevelXP: totalXP,
    nextLevelXP: max,
    progressPercent,
  };
}

class GamificationManager {
  private state: GamificationState;
  private listeners: Set<(state: GamificationState, xpGained?: { amount: number; reason: string }) => void> = new Set();

  constructor() {
    this.state = this.loadState();
    this.checkDailyReset();
  }

  private loadState(): GamificationState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const levelData = calculateLevelData(parsed.xp || 40);
        return {
          ...parsed,
          ...levelData,
          badges: parsed.badges || DEFAULT_BADGES,
          quests: parsed.quests || INITIAL_QUESTS,
        };
      }
    } catch {
      // Fallback
    }

    const initialXP = 50; // Starter XP
    const levelData = calculateLevelData(initialXP);
    return {
      xp: initialXP,
      streakDays: 1,
      lastActiveDate: getTodayDateString(),
      articlesReadToday: 0,
      quests: INITIAL_QUESTS,
      badges: DEFAULT_BADGES,
      ...levelData,
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage unavailable
    }
  }

  private checkDailyReset() {
    const today = getTodayDateString();
    if (this.state.lastActiveDate !== today) {
      const lastDate = new Date(this.state.lastActiveDate);
      const currentDate = new Date(today);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        // Consecutive day
        this.state.streakDays += 1;
      } else if (diffDays > 1) {
        // Streak broken, reset to 1
        this.state.streakDays = 1;
      }

      this.state.lastActiveDate = today;
      this.state.articlesReadToday = 0;
      // Reset quests
      this.state.quests = INITIAL_QUESTS.map((q) => ({ ...q, current: 0, completed: false }));
      this.saveState();
    }
  }

  public getState(): GamificationState {
    return { ...this.state };
  }

  public subscribe(callback: (state: GamificationState, xpGained?: { amount: number; reason: string }) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(xpGained?: { amount: number; reason: string }) {
    this.saveState();
    this.listeners.forEach((cb) => cb({ ...this.state }, xpGained));
  }

  public playRewardChime() {
    try {
      if (typeof window === 'undefined') return;
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio autoplay restrictions or not supported
    }
  }

  public addXP(amount: number, reason: string) {
    this.state.xp += amount;
    const levelData = calculateLevelData(this.state.xp);
    const oldLevel = this.state.level;
    this.state = {
      ...this.state,
      ...levelData,
    };

    if (levelData.level > oldLevel) {
      // Level Up!
      this.unlockBadge('sasaki_elite');
    }

    this.playRewardChime();
    this.notify({ amount, reason });
  }

  public recordArticleRead(articleId: string) {
    this.checkDailyReset();
    this.state.articlesReadToday += 1;
    this.addXP(10, 'Lecture d\'une dépêche');
    this.unlockBadge('first_read');

    // Update read quest
    this.progressQuest('read_article', 1);
  }

  public recordArticleLiked() {
    this.checkDailyReset();
    this.addXP(5, 'Soutien éditorial');
    this.unlockBadge('supporter');
    this.progressQuest('like_article', 1);
  }

  public recordArticleShared() {
    this.checkDailyReset();
    this.addXP(15, 'Partage de dépêche');
    this.unlockBadge('truth_spreader');
    this.progressQuest('share_article', 1);
  }

  public recordCommentSubmitted() {
    this.checkDailyReset();
    this.addXP(20, 'Commentaire citoyen');
    this.unlockBadge('debater');
  }

  private progressQuest(type: DailyQuest['type'], delta: number) {
    let completedQuestXP = 0;
    this.state.quests = this.state.quests.map((q) => {
      if (q.type === type && !q.completed) {
        const nextVal = q.current + delta;
        const isDone = nextVal >= q.target;
        if (isDone && !q.completed) {
          completedQuestXP += q.rewardXP;
        }
        return {
          ...q,
          current: Math.min(q.target, nextVal),
          completed: isDone,
        };
      }
      return q;
    });

    if (completedQuestXP > 0) {
      this.state.xp += completedQuestXP;
      const levelData = calculateLevelData(this.state.xp);
      this.state = { ...this.state, ...levelData };
      this.notify({ amount: completedQuestXP, reason: 'Quête quotidienne accomplie !' });
    } else {
      this.notify();
    }
  }

  public unlockBadge(badgeId: string) {
    const badge = this.state.badges.find((b) => b.id === badgeId);
    if (badge && !badge.unlockedAt) {
      badge.unlockedAt = new Date().toISOString();
      this.addXP(50, `Trophée débloqué : ${badge.name}`);
    }
  }
}

export const gamification = new GamificationManager();
