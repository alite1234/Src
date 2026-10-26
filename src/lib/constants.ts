import type {
  AnimationPreset,
  LogoLayout,
  LogoVisibility,
  QuizSettings,
  SceneType,
  Theme,
  ThemeId,
  VisibilityKey,
} from "./types";

export const APP_NAME = "SRC Legislative Summit";

export const SCENE_TYPES: {
  value: SceneType;
  label: string;
  description: string;
  visibilityKey: VisibilityKey;
  creatable: boolean;
}[] = [
  {
    value: "opening",
    label: "Opening Screen",
    description: "Title, date, venue and summit branding.",
    visibilityKey: "opening",
    creatable: true,
  },
  {
    value: "welcome",
    label: "Welcome Screen",
    description: "A welcome message for the audience.",
    visibilityKey: "welcome",
    creatable: true,
  },
  {
    value: "speaker_intro",
    label: "Speaker Introduction",
    description: "Portrait and profile of the next speaker.",
    visibilityKey: "speaker",
    creatable: true,
  },
  {
    value: "citation",
    label: "Citation Presentation",
    description: "Long-form citation with portrait.",
    visibilityKey: "citation",
    creatable: true,
  },
  {
    value: "speaking_now",
    label: "Speaking Now",
    description: "Announce the speaker currently on stage.",
    visibilityKey: "speaking_now",
    creatable: true,
  },
  {
    value: "topic",
    label: "Topic Announcement",
    description: "Introduce a session topic.",
    visibilityKey: "announcement",
    creatable: true,
  },
  {
    value: "announcement",
    label: "General Announcement",
    description: "Any message that needs the audience's attention.",
    visibilityKey: "announcement",
    creatable: true,
  },
  {
    value: "countdown",
    label: "Countdown Screen",
    description: "A branded backdrop while a timer runs.",
    visibilityKey: "countdown",
    creatable: true,
  },
  {
    value: "quiz_intro",
    label: "Quiz Introduction",
    description: "Joining instructions before the quiz starts.",
    visibilityKey: "quiz",
    creatable: true,
  },
  {
    value: "scoreboard",
    label: "Scoreboard",
    description: "Leaderboard with sequential reveal controls.",
    visibilityKey: "scoreboard",
    creatable: true,
  },
  {
    value: "break",
    label: "Break Screen",
    description: "Displayed while the summit is on a short break.",
    visibilityKey: "break",
    creatable: true,
  },
  {
    value: "closing",
    label: "Closing Screen",
    description: "Thank-you message and closing branding.",
    visibilityKey: "closing",
    creatable: true,
  },
  {
    value: "quiz_question",
    label: "Quiz Question",
    description: "Generated automatically by the live quiz.",
    visibilityKey: "quiz",
    creatable: false,
  },
  {
    value: "answer_reveal",
    label: "Answer Reveal",
    description: "Generated automatically by the live quiz.",
    visibilityKey: "quiz",
    creatable: false,
  },
];

export const SCENE_TYPE_MAP = Object.fromEntries(
  SCENE_TYPES.map((scene) => [scene.value, scene]),
) as Record<
  SceneType,
  (typeof SCENE_TYPES)[number]
>;

export const LOGO_LAYOUTS: {
  value: LogoLayout;
  label: string;
  description: string;
}[] = [
  {
    value: "primary",
    label: "Primary Logo",
    description: "One prominent logo in the header area.",
  },
  {
    value: "row",
    label: "Horizontal Row",
    description: "All logos arranged side by side.",
  },
  {
    value: "balanced",
    label: "Balanced Header",
    description: "A primary logo with smaller supporting logos.",
  },
  {
    value: "footer",
    label: "Footer Row",
    description: "All logos arranged along the bottom edge.",
  },
  {
    value: "corners",
    label: "Corner Branding",
    description: "Logos placed in the approved screen corners.",
  },
];

export const VISIBILITY_KEYS: { key: VisibilityKey; label: string }[] = [
  { key: "opening", label: "Opening screens" },
  { key: "welcome", label: "Welcome screens" },
  { key: "speaker", label: "Speaker introductions" },
  { key: "citation", label: "Citation displays" },
  { key: "speaking_now", label: "Speaking Now screens" },
  { key: "announcement", label: "Topic & general announcements" },
  { key: "quiz", label: "Quiz lobby, questions & reveals" },
  { key: "scoreboard", label: "Scoreboards & leaderboards" },
  { key: "countdown", label: "Countdown screens" },
  { key: "break", label: "Break screens" },
  { key: "closing", label: "Closing screens" },
];

export const DEFAULT_LOGO_VISIBILITY: LogoVisibility = {
  default: true,
  scenes: {},
};

export const ANIMATION_PRESETS: {
  value: AnimationPreset;
  label: string;
}[] = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "rise", label: "Text Rise" },
  { value: "zoom", label: "Image Zoom" },
  { value: "reveal", label: "Sequential Reveal" },
  { value: "spotlight", label: "Spotlight" },
];

export const THEMES: Record<ThemeId, Theme> = {
  "navy-gold": {
    id: "navy-gold",
    name: "Navy & Gold",
    description: "The official legislative summit palette.",
    pattern: "rays",
    vars: {
      bg: "#040d1f",
      bg2: "#0b1f45",
      surface: "#0e254e",
      accent: "#d4af37",
      accent2: "#f0d98c",
      text: "#faf7ef",
      muted: "#a9b6cd",
    },
  },
  midnight: {
    id: "midnight",
    name: "Midnight Sapphire",
    description: "Deep sapphire with cool silver accents.",
    pattern: "grid",
    vars: {
      bg: "#050a1a",
      bg2: "#0d1b3d",
      surface: "#122349",
      accent: "#9fc4ff",
      accent2: "#d9e7ff",
      text: "#f2f6ff",
      muted: "#a6b4cf",
    },
  },
  oxblood: {
    id: "oxblood",
    name: "Oxford Burgundy",
    description: "Formal burgundy with champagne detailing.",
    pattern: "lines",
    vars: {
      bg: "#170609",
      bg2: "#3a0d18",
      surface: "#4a1220",
      accent: "#e3bd7a",
      accent2: "#f5dfb2",
      text: "#fdf6ee",
      muted: "#cbb2b2",
    },
  },
  emerald: {
    id: "emerald",
    name: "Emerald Chamber",
    description: "Deep green with warm gold highlights.",
    pattern: "orb",
    vars: {
      bg: "#04130f",
      bg2: "#0a2a22",
      surface: "#0d352b",
      accent: "#d5b867",
      accent2: "#f1e2ae",
      text: "#f5faf6",
      muted: "#a9c4b7",
    },
  },
};

export const THEME_LIST = Object.values(THEMES);

export function getSceneVisibilityKey(type: SceneType): VisibilityKey {
  return SCENE_TYPE_MAP[type]?.visibilityKey ?? "opening";
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  speedBonus: true,
  speedBonusRatio: 0.5,
  randomizeQuestions: false,
  randomizeAnswers: false,
  lobbyCountdownSeconds: 30,
  allowLateJoin: true,
  showLeaderboard: true,
  maxNameLength: 20,
  tieBreaker: "time",
};

export const MAX_LOGOS = 5;
export const MAX_IMAGE_BYTES = 2_500_000;
export const MAX_SPEAKER_BYTES = 2_500_000;

export const QUIZ_PIN_LENGTH = 6;

export const CONTROL_ROLES = ["admin", "controller"] as const;

export const SCOREBOARD_DISPLAY_MODES = [
  { value: "sequential", label: "Sequential rank reveal" },
  { value: "full", label: "Full leaderboard" },
  { value: "podium", label: "Top-three podium" },
  { value: "score_only", label: "Score-only display" },
] as const;

export const AUDIT_ACTIONS = {
  eventCreated: "event.created",
  eventUpdated: "event.updated",
  eventActivated: "event.activated",
  logoAdded: "logo.added",
  logoRemoved: "logo.removed",
  logoUpdated: "logo.updated",
  speakerCreated: "speaker.created",
  speakerUpdated: "speaker.updated",
  speakerDeleted: "speaker.deleted",
  sceneCreated: "scene.created",
  sceneUpdated: "scene.updated",
  sceneDeleted: "scene.deleted",
  queueUpdated: "queue.updated",
  scoreboardUpdated: "scoreboard.updated",
  scoreChanged: "score.changed",
  quizUpdated: "quiz.updated",
  questionCreated: "question.created",
  questionUpdated: "question.updated",
  questionDeleted: "question.deleted",
  quizLaunched: "quiz.launched",
  quizEnded: "quiz.ended",
  scenePublished: "projection.published",
  scoreRevealed: "scoreboard.revealed",
} as const;

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && value in THEMES;
}
