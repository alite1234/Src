export type Role = "admin" | "controller";

export type LogoLayout =
  | "primary"
  | "row"
  | "balanced"
  | "footer"
  | "corners";

export type SceneType =
  | "opening"
  | "welcome"
  | "speaker_intro"
  | "citation"
  | "speaking_now"
  | "topic"
  | "announcement"
  | "countdown"
  | "quiz_intro"
  | "quiz_question"
  | "answer_reveal"
  | "scoreboard"
  | "break"
  | "closing";

export type VisibilityKey =
  | "opening"
  | "welcome"
  | "speaker"
  | "citation"
  | "speaking_now"
  | "announcement"
  | "quiz"
  | "scoreboard"
  | "countdown"
  | "break"
  | "closing";

export type LogoVisibility = {
  default: boolean;
  scenes: Partial<Record<VisibilityKey, boolean>>;
};

export type SceneLogoOverride = {
  mode: "inherit" | "show" | "hide";
};

export type SceneContent = {
  heading?: string;
  subheading?: string;
  body?: string;
  footer?: string;
};

export type AnimationPreset =
  | "fade"
  | "slide"
  | "rise"
  | "zoom"
  | "reveal"
  | "spotlight";

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizSettings = {
  speedBonus: boolean;
  speedBonusRatio: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  lobbyCountdownSeconds: number;
  allowLateJoin: boolean;
  showLeaderboard: boolean;
  maxNameLength: number;
  tieBreaker: "time" | "name";
};

export type LiveMode = "holding" | "blank" | "scene" | "countdown" | "quiz";

export type QuizStatus =
  | "lobby"
  | "question"
  | "paused"
  | "reveal"
  | "leaderboard"
  | "ended";

export type ScoreboardDisplayMode =
  | "sequential"
  | "full"
  | "podium"
  | "score_only";

export type ThemeId = "navy-gold" | "midnight" | "oxblood" | "emerald";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  pattern: "rays" | "grid" | "orb" | "lines";
  vars: {
    bg: string;
    bg2: string;
    surface: string;
    accent: string;
    accent2: string;
    text: string;
    muted: string;
  };
};

export type PublicLogo = {
  id: string;
  name: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
};

export type PublicEvent = {
  id: string;
  title: string;
  subtitle: string | null;
  eventDate: string | null;
  venue: string | null;
  description: string | null;
  openingMessage: string | null;
  closingMessage: string | null;
  theme: ThemeId;
  animationStyle: AnimationPreset;
  logoLayout: LogoLayout;
  logoVisibility: LogoVisibility;
  status: string;
};

export type PublicSpeaker = {
  id: string;
  fullName: string;
  title: string | null;
  institution: string | null;
  topic: string | null;
  citation: string | null;
  photoUrl: string | null;
  backgroundUrl: string | null;
  animation: AnimationPreset;
  durationSeconds: number;
};

export type PublicScene = {
  id: string;
  type: SceneType;
  title: string;
  content: SceneContent;
  animation: AnimationPreset;
  durationSeconds: number | null;
  logoVisibility: SceneLogoOverride | null;
  speaker: PublicSpeaker | null;
};

export type PublicLiveState = {
  mode: LiveMode;
  sceneId: string | null;
  countdownLabel: string;
  countdownEndsAt: string | null;
  countdownRemainingMs: number | null;
  countdownRunning: boolean;
  scoreboardRevealCount: number;
  scoreboardShowAll: boolean;
  revision: number;
  updatedAt: string;
};

export type PublicScoreboardEntry = {
  id: string;
  name: string;
  score: number;
  displayOrder: number;
};

export type PublicScoreboard = {
  id: string;
  title: string;
  description: string | null;
  mode: "individual" | "team";
  displayMode: ScoreboardDisplayMode;
  tieBreaker: string;
  animation: AnimationPreset;
  entries: PublicScoreboardEntry[];
  totalEntries: number;
  revealedCount: number;
};

export type PublicQuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  durationSeconds: number;
  index: number;
  total: number;
  startedAt: string | null;
  endsAt: string | null;
  pausedRemainingMs: number | null;
  status: QuizStatus;
  correctOptionId: string | null;
};

export type LeaderboardEntry = {
  participantId: string;
  name: string;
  score: number;
  rank: number;
  totalMs: number;
};

export type QuizOptionStat = {
  optionId: string;
  count: number;
  isCorrect: boolean;
};

export type PublicQuizState = {
  sessionId: string;
  quizTitle: string;
  pin: string;
  status: QuizStatus;
  lobbyOpen: boolean;
  lobbyEndsAt: string | null;
  participantCount: number;
  submissionCount: number;
  question: PublicQuizQuestion | null;
  optionStats: QuizOptionStat[] | null;
  leaderboard: LeaderboardEntry[] | null;
  showLeaderboard: boolean;
};

export type PublicLivePayload = {
  event: PublicEvent | null;
  logos: PublicLogo[];
  live: PublicLiveState | null;
  scene: PublicScene | null;
  scoreboard: PublicScoreboard | null;
  quiz: PublicQuizState | null;
  serverTime: string;
};

export type ControlQuizState = PublicQuizState & {
  quizId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  remainingMs: number | null;
  leaderboard: LeaderboardEntry[];
  participants: { id: string; name: string; score: number }[];
  nextQuestionPrompt: string | null;
};

export type ControlStatePayload = {
  event: PublicEvent | null;
  logos: PublicLogo[];
  live: PublicLiveState | null;
  scene: PublicScene | null;
  previewScenes: PublicScene[];
  queue: { id: string; position: number; scene: PublicScene }[];
  speakers: PublicSpeaker[];
  scoreboard: PublicScoreboard | null;
  quizzes: {
    id: string;
    title: string;
    questionCount: number;
    settings: QuizSettings;
  }[];
  quiz: ControlQuizState | null;
  serverTime: string;
};

export type ParticipantMe = {
  id: string;
  name: string;
  score: number;
  rank: number | null;
  totalParticipants: number;
  currentResponse: {
    optionId: string;
    isCorrect: boolean | null;
    points: number | null;
  } | null;
};

export type PlayStatePayload = {
  joined: true;
  event: PublicEvent;
  logos: PublicLogo[];
  quiz: PublicQuizState;
  me: ParticipantMe;
  serverTime: string;
};
