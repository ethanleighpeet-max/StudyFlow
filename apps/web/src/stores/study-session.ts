import { create } from 'zustand';

type TimerMode = 'pomodoro' | 'custom' | 'open-ended';
type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';

interface SessionNote {
  id?: string;
  content: string;
  timestampOffset: number;
  createdAt: string;
}

interface StudySessionState {
  // Session identity
  sessionId: string | null;
  subjectId: string | null;
  subjectName: string | null;

  // Timer config
  timerMode: TimerMode;
  timerDurationSeconds: number; // total duration in seconds (0 for open-ended)
  sessionGoal: string;

  // Timer runtime
  status: SessionStatus;
  elapsedSeconds: number;
  startedAt: Date | null;

  // Notes
  notes: SessionNote[];

  // Actions — setup
  setTimerMode: (mode: TimerMode) => void;
  setCustomDuration: (minutes: number) => void;
  setSubject: (id: string | null, name: string | null) => void;
  setSessionGoal: (goal: string) => void;

  // Actions — timer control
  startSession: (sessionId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  tick: () => void;
  completeSession: () => void;
  resetSession: () => void;

  // Actions — notes
  addNote: (note: SessionNote) => void;

  // Computed helpers
  remainingSeconds: () => number;
  progressPercent: () => number;
  isTimerFinished: () => boolean;
}

export const useStudySession = create<StudySessionState>((set, get) => ({
  sessionId: null,
  subjectId: null,
  subjectName: null,

  timerMode: 'pomodoro',
  timerDurationSeconds: 25 * 60,
  sessionGoal: '',

  status: 'idle',
  elapsedSeconds: 0,
  startedAt: null,

  notes: [],

  setTimerMode: (mode) =>
    set({
      timerMode: mode,
      timerDurationSeconds:
        mode === 'pomodoro' ? 25 * 60 : mode === 'open-ended' ? 0 : get().timerDurationSeconds,
    }),

  setCustomDuration: (minutes) =>
    set({ timerDurationSeconds: minutes * 60 }),

  setSubject: (id, name) =>
    set({ subjectId: id, subjectName: name }),

  setSessionGoal: (goal) =>
    set({ sessionGoal: goal }),

  startSession: (sessionId) =>
    set({
      sessionId,
      status: 'running',
      elapsedSeconds: 0,
      startedAt: new Date(),
      notes: [],
    }),

  pauseSession: () =>
    set({ status: 'paused' }),

  resumeSession: () =>
    set({ status: 'running' }),

  tick: () => {
    const state = get();
    if (state.status !== 'running') return;

    const newElapsed = state.elapsedSeconds + 1;
    set({ elapsedSeconds: newElapsed });

    // Auto-complete for timed modes
    if (state.timerDurationSeconds > 0 && newElapsed >= state.timerDurationSeconds) {
      set({ status: 'completed' });
    }
  },

  completeSession: () =>
    set({ status: 'completed' }),

  resetSession: () =>
    set({
      sessionId: null,
      subjectId: null,
      subjectName: null,
      timerMode: 'pomodoro',
      timerDurationSeconds: 25 * 60,
      sessionGoal: '',
      status: 'idle',
      elapsedSeconds: 0,
      startedAt: null,
      notes: [],
    }),

  addNote: (note) =>
    set((state) => ({ notes: [...state.notes, note] })),

  remainingSeconds: () => {
    const state = get();
    if (state.timerDurationSeconds === 0) return 0; // open-ended
    return Math.max(0, state.timerDurationSeconds - state.elapsedSeconds);
  },

  progressPercent: () => {
    const state = get();
    if (state.timerDurationSeconds === 0) return 0;
    return Math.min(100, (state.elapsedSeconds / state.timerDurationSeconds) * 100);
  },

  isTimerFinished: () => {
    const state = get();
    if (state.timerDurationSeconds === 0) return false;
    return state.elapsedSeconds >= state.timerDurationSeconds;
  },
}));
