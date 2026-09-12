export type SectionType =
  | "free_hangout" | "rules" | "memory_verse" | "bible_reading"
  | "discussion" | "prayer" | "memory_verse_check" | "group_game"
  | "score_recording" | "custom";

export const SECTION_LABEL: Record<SectionType, string> = {
  free_hangout: "Free Hangout",
  rules: "Rules / Reset",
  memory_verse: "Memory Verse",
  bible_reading: "Bible Reading",
  discussion: "Discussion",
  prayer: "Prayer",
  memory_verse_check: "Memory Verse Check",
  group_game: "Group Game",
  score_recording: "Score Recording",
  custom: "Custom Section",
};

export const SECTION_ICON: Record<SectionType, string> = {
  free_hangout: "☕", rules: "📏", memory_verse: "📖", bible_reading: "📜", discussion: "💬",
  prayer: "🙏", memory_verse_check: "✅", group_game: "🎮", score_recording: "📝", custom: "▫️",
};

export type Itinerary = {
  id: string;
  title: string;
  lesson_title: string | null;
  bible_passage: string | null;
  memory_verse: string | null;
  scheduled_date: string | null;
  is_template: boolean;
  created_at: string;
  start_time: string | null;
  slot_minutes: number | null;
  led_at: string | null;
};

export type Section = {
  id: string;
  itinerary_id: string;
  position: number;
  title: string;
  section_type: SectionType;
  start_time: string | null;
  duration_minutes: number | null;
  instructions: string | null;
  script: string | null;
  discussion_questions: string | null;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  chosen_game: string | null;
};

/** Defaults used when a section is inserted from the palette. */
export const SECTION_DEFAULTS: Record<SectionType, { title: string; duration: number }> = {
  free_hangout: { title: "Free Hangout", duration: 8 },
  rules: { title: "Rules / Reset", duration: 4 },
  memory_verse: { title: "Memory Verse", duration: 5 },
  memory_verse_check: { title: "Memory Verse Check", duration: 8 },
  bible_reading: { title: "Bible Reading", duration: 10 },
  discussion: { title: "Discussion", duration: 15 },
  prayer: { title: "Prayer", duration: 5 },
  group_game: { title: "Group Game", duration: 20 },
  score_recording: { title: "Score Recording", duration: 3 },
  custom: { title: "New Section", duration: 5 },
};

/** Order the palette chips are shown in (the natural flow of a Sunday). */
export const SECTION_PALETTE_ORDER: SectionType[] = [
  "free_hangout", "rules", "memory_verse", "memory_verse_check", "bible_reading",
  "discussion", "prayer", "group_game", "score_recording", "custom",
];

/** Which detail fields each type shows in the editor. */
export const SECTION_FIELDS: Record<SectionType, Array<"instructions" | "script" | "discussion_questions" | "notes">> = {
  free_hangout: ["notes"],
  rules: ["script", "notes"],
  memory_verse: ["script", "notes"],
  memory_verse_check: ["instructions", "script", "notes"],
  bible_reading: ["instructions", "script", "discussion_questions", "notes"],
  discussion: ["instructions", "discussion_questions", "notes"],
  prayer: ["script", "notes"],
  group_game: ["instructions", "notes"],
  score_recording: ["notes"],
  custom: ["instructions", "script", "discussion_questions", "notes"],
};

export type Contest = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  weeks: number | null;
  duration_months: number | null;
  status: "active" | "archived";
  snapshot: any;
  created_at: string;
  archived_at: string | null;
};

export type Team = {
  id: string;
  name: string;
  mascot: string | null;
  icon: string | null;
  total_score: number;
};

export type Student = {
  id: string;
  name: string;
  team_id: string | null;
};

export type GamePrompt = {
  id: string;
  text: string;
  category: "person" | "place" | "object" | "story" | "theme" | "other";
  difficulty: "easy" | "medium" | "hard";
  banned_words: string[] | null;
  testament: "OT" | "NT" | null;
  hint: string | null;
  active: boolean;
};

export type PirQuestion = {
  id: string;
  question: string;
  host_answer: string | null;
  accepted_answer: string | null;
  numeric_target: number | null;
  unit: string | null;
  category: string | null;
  background: string | null;
  reference_1: string | null;
  reference_2: string | null;
  fact_type: string | null;
  source_url: string | null;
  active: boolean;
};

export type Question = {
  id: string;
  text: string;
  correct_answer: string;
  difficulty: "single" | "double" | "triple" | "home_run";
  format: "multiple_choice" | "open_answer";
  choices: string[] | null;
  active: boolean;
};
