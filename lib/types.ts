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

export type Itinerary = {
  id: string;
  title: string;
  lesson_title: string | null;
  bible_passage: string | null;
  memory_verse: string | null;
  scheduled_date: string | null;
  is_template: boolean;
  created_at: string;
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
  chosen_game: string | null;
};

export type Contest = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  weeks: number | null;
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
