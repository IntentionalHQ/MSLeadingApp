export type GameId =
  | "bible_baseball"
  | "four_corners"
  | "true_false_showdown"
  | "bible_taboo"
  | "bible_hangman"
  | "bible_hot_seat"
  | "bible_pictionary"
  | "guess_the_fake"
  | "bible_auction"
  | "bible_price_is_right"
  | "bible_shooting_range"
  | "verse_scramble"
  | "verse_hunt";

export type GameDef = {
  id: GameId;
  label: string;
  icon: string;
  short: string;
  description: string;
  ready: boolean;
};

export const GAMES: GameDef[] = [
  {
    id: "bible_baseball",
    label: "Bible Baseball",
    icon: "⚾",
    short: "Answer to earn singles, doubles, triples, or home runs.",
    description:
      "Teams answer Bible questions to earn singles, doubles, triples, or home runs and move runners around bases.",
    ready: true,
  },
  {
    id: "four_corners",
    label: "Four Corners",
    icon: "📍",
    short: "Students move to the corner of their answer choice.",
    description:
      "Each corner is an answer choice. Students move to the corner they think is correct, then you reveal the answer.",
    ready: true,
  },
  {
    id: "true_false_showdown",
    label: "True or False Showdown",
    icon: "⚖️",
    short: "Pick a side — true or false. Wrong answers sit; last one standing wins.",
    description:
      "Like Four Corners, but two sides: TRUE and FALSE. Read a statement; students move to the side they believe. Reveal the answer — everyone on the wrong side sits down and watches. Keep going until one student is left standing. Ships with 200+ Bible statements that ramp from easy to hard.",
    ready: true,
  },
  {
    id: "bible_taboo",
    label: "Bible Taboo",
    icon: "🚫",
    short: "Describe the answer without saying the banned words.",
    description:
      "Students describe a Bible person, place, object, or story without using the banned words on the card.",
    ready: true,
  },
  {
    id: "bible_hangman",
    label: "Bible Hangman",
    icon: "✝️",
    short: "Guess letters to solve a Bible word or phrase.",
    description:
      "Students guess letters to solve Bible words, names, places, or lesson themes. Use a cross, ark, or rescue-rope drawing instead of a hanging person.",
    ready: true,
  },
  {
    id: "bible_hot_seat",
    label: "Bible Hot Seat",
    icon: "🔥",
    short: "One student guesses the answer behind them from teammates' clues.",
    description:
      "One student faces away from the board while their team gives clues to help them guess the Bible answer behind them.",
    ready: false,
  },
  {
    id: "bible_pictionary",
    label: "Bible Pictionary",
    icon: "🎨",
    short: "Draw Bible stories while your team guesses.",
    description:
      "Students draw Bible stories, people, objects, or places while their team races to guess correctly.",
    ready: true,
  },
  {
    id: "guess_the_fake",
    label: "Guess the Fake",
    icon: "🕵️",
    short: "Two truths and a lie — Bible edition.",
    description:
      "Give three statements about a Bible story or person. Teams identify which one is false.",
    ready: true,
  },
  {
    id: "bible_auction",
    label: "Bible Auction",
    icon: "💰",
    short: "Bid fake money on how confident you are in your answer.",
    description:
      "Teams get fake money and bid on how confident they are they can answer a Bible question. Correct answers gain the bid; wrong answers lose it.",
    ready: true,
  },
  {
    id: "bible_price_is_right",
    label: "Bible Price Is Right",
    icon: "🎯",
    short: "Guess Bible numbers without going over.",
    description:
      "Teams guess Bible numbers, values, quantities, or prices without going over. Closest answer wins the point.",
    ready: true,
  },
  {
    id: "bible_shooting_range",
    label: "Bible Shooting Range Trivia",
    icon: "🥤",
    short: "Shoot at the cup that matches your answer.",
    description:
      "Set up cups labeled A, B, and C as answer choices. Students shoot at the cup matching their answer; correct shots earn a point. Keep cups close together so accuracy matters. Highest total wins.",
    ready: false,
  },
  {
    id: "verse_scramble",
    label: "Verse Scramble",
    icon: "🔀",
    short: "Race to put the week's memory verse back in order.",
    description:
      "The week's memory verse is shuffled word by word. Teams race to arrange the words back into the correct order. Reinforces the verse with zero prep — it uses the verse already in the Sunday plan.",
    ready: false,
  },
  {
    id: "verse_hunt",
    label: "Verse Hunt",
    icon: "🔦",
    short: "Race to find any verse that fits the category the leader calls.",
    description:
      "A twist on the Sword Drill. The leader calls a broad category (\"a verse with an animal in it\"). Teams search their Bibles together; the first person with a verse that fits stands and reads it. If the judge approves, that team scores. A per-round timer means a too-hard prompt just ends in a tie. Ships with 200+ prompts — no prep, no props.",
    ready: true,
  },
];

export const GAMES_BY_ID: Record<GameId, GameDef> = Object.fromEntries(
  GAMES.map((g) => [g.id, g])
) as Record<GameId, GameDef>;

export function gameLabel(id: string | null | undefined): string {
  if (!id) return "Group Game";
  return (GAMES_BY_ID as any)[id]?.label ?? id;
}

export function gameRoutePath(itineraryId: string, id: string): string {
  const def = (GAMES_BY_ID as any)[id];
  if (!def) return `/itineraries/${itineraryId}/games`;
  if (id === "bible_baseball") return `/itineraries/${itineraryId}/baseball`;
  return `/itineraries/${itineraryId}/games/${id}`;
}

// Standalone game routes — played without an itinerary. Results still record
// globally (itinerary_id is null).
export function standaloneGameRoutePath(id: string): string {
  const def = (GAMES_BY_ID as any)[id];
  if (!def) return `/games`;
  return `/games/${id}`;
}
