import type { GameId } from "./games";

// Plain-language rules for each game, shown in a collapsible panel at the
// bottom of every game screen. Numbers here mirror the constants inside each
// game component (round lengths, win targets, bonuses); keep them in sync.
export type GameRules = { setup: string[]; play: string[]; scoring: string[] };

export const GAME_RULES: Partial<Record<GameId, GameRules>> = {
  bible_baseball: {
    setup: [
      "Two teams. One bats, the other fields. Three innings, each with a top and a bottom half.",
      "The batting team picks a difficulty: Single, Double, Triple, or Home Run. Harder questions move runners further.",
    ],
    play: [
      "Read the question to the batting team. Correct = a hit of that size; runners advance and any runner crossing home scores a run.",
      "Wrong = a pop fly. The fielding team gets a shot at the same question. If they answer correctly the batter is out AND there is a bonus out. If they miss, it is just one out.",
      "Three outs ends the half-inning and the other team bats.",
      "Tied after three innings goes to a sudden-death Home Run round.",
    ],
    scoring: [
      "Every run scored is 1 team point on the season scoreboard.",
      "The winning team also earns a 3 point win bonus.",
    ],
  },
  four_corners: {
    setup: [
      "Label the four corners of the room A, B, C, and D.",
      "Optional: keep the two-team scoreboard on screen, or ignore it and just play.",
    ],
    play: [
      "Read the multiple-choice question and the four answers. Students walk to the corner they think is right.",
      "Tap the right answer to reveal it. Students in the right corner stay in; everyone else sits, or just plays on. Your call.",
    ],
    scoring: [
      "Tap +1 for a team whenever you want to reward them (most players in the right corner, first there, etc.).",
      "Points go straight to the season scoreboard when you finish.",
    ],
  },
  true_false_showdown: {
    setup: [
      "Label one side of the room TRUE and the other FALSE. Everyone stands in the middle.",
    ],
    play: [
      "Read the statement. Students move to the side they believe.",
      "Tap Reveal. Everyone on the wrong side sits down and watches.",
      "Statements start easy and get harder as the crowd thins. Keep going until one student is left standing.",
    ],
    scoring: [
      "Last student standing wins. Give their team a point on the scoreboard if you want a team result.",
    ],
  },
  bible_taboo: {
    setup: [
      "Two teams. One clue-giver from the active team faces their teammates; only the clue-giver sees the phone.",
    ],
    play: [
      "Each card shows a Bible word plus a list of banned words. Describe the word without saying any banned word, the word itself, or part of it.",
      "Teammates shout guesses. Got it: tap Got it and go to the next card. Stuck or slipped a banned word: tap Pass.",
      "Each round is 60 seconds. Then the other team takes a turn.",
    ],
    scoring: [
      "1 point per correct card.",
      "First team to 8 points wins.",
    ],
  },
  bible_hangman: {
    setup: [
      "Two teams take turns. Draw the puzzle on a whiteboard, or just use the phone screen.",
      "Wrong guesses build a cross drawing instead of a hanging person.",
    ],
    play: [
      "The active team guesses one letter at a time. Right letters are filled in; wrong letters add to the drawing.",
      "Six wrong guesses and the round is lost. Solve the word before that to win the round.",
    ],
    scoring: [
      "1 point for solving a puzzle.",
      "First team to 3 points wins.",
    ],
  },
  bible_pictionary: {
    setup: [
      "Two teams. One drawer per round from the active team; only the drawer sees the phone.",
      "A whiteboard or big paper and a marker.",
    ],
    play: [
      "The drawer draws the Bible word, person, place, or story. No letters, numbers, or talking.",
      "Teammates guess out loud. Tap Guessed it when they get it, or Skip when time is up or they give up.",
      "Each round is 60 seconds. Then the other team draws.",
    ],
    scoring: [
      "1 point per card guessed.",
      "First team to 5 points wins.",
    ],
  },
  guess_the_fake: {
    setup: [
      "Two truths and a lie, Bible edition. Play as a whole group, or in Teams mode where the two teams alternate on matching difficulty.",
    ],
    play: [
      "Read the three statements A, B, and C about a Bible story or person. Two are true, one is made up.",
      "The group (or the active team) picks the fake. Tap Reveal to show the answer and a short explanation.",
    ],
    scoring: [
      "Whole group: keep a running tally of how many the room got right.",
      "Teams: 1 point per correct pick. Highest score when you stop wins.",
    ],
  },
  bible_auction: {
    setup: [
      "Two teams. Each starts with $500 of fake money.",
    ],
    play: [
      "The active team picks a difficulty and bids any amount up to what they have, before seeing the question.",
      "Then the question is read. Correct: the bet doubles. Wrong: they lose it.",
      "Teams alternate. Stop whenever you like or when a team is out of money.",
    ],
    scoring: [
      "The team with the most cash at the end wins and earns 1 team point on the season scoreboard.",
    ],
  },
  bible_price_is_right: {
    setup: [
      "Two teams. Each round both teams write down a number.",
    ],
    play: [
      "Read the question. It always has a number for an answer, like how many days, people, or years.",
      "Both teams lock in a guess, then tap Reveal.",
    ],
    scoring: [
      "Closest without going over gets the point. If both go over, closest still wins.",
      "First team to 5 points wins.",
    ],
  },
  verse_hunt: {
    setup: [
      "A twist on the Sword Drill. Two teams, every student with a Bible. Pick the round length (90 seconds by default) and who is judging.",
    ],
    play: [
      "Read the category, like \"a verse with an animal in it\". Teams search their Bibles together.",
      "The first student with a verse that fits stands up and reads it. The judge decides if it fits.",
      "If the clock runs out first, the round is a tie and nobody scores.",
    ],
    scoring: [
      "Easy prompt 1 point, medium 2, hard 3.",
      "Highest total when you stop wins.",
    ],
  },
};
