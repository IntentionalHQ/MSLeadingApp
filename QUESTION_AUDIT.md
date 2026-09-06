# Question Bank Audit — all game modes, for 5th–8th graders

Audited every seed file and every game's loading code (September 2026). Nothing is deleted. The SQL to add what is missing is in [supabase/v12_question_balance.sql](supabase/v12_question_balance.sql). Paste it into the Supabase SQL editor and run it once; it is safe to re-run.

## The short version

| Game | Bank (table) | Today | Verdict | SQL adds |
|------|--------------|-------|---------|----------|
| Bible Hangman, Pictionary, Taboo | `game_prompts` | **20 prompts, shared by all three, no banned words** | **Critically short.** One Taboo game burns 20–40 prompts. | +193 prompts with banned words; banned words filled in on the 20 existing |
| Bible Baseball, Four Corners, Auction | `questions` | 404 (185 single, 122 double, 51 triple, 46 home run) | Plenty of questions. **Tiers are wrong:** 43 of 46 home runs are single-level questions; the doubles are mostly re-worded singles. | +32 real home runs, +30 real doubles; optional retag |
| Bible Price Is Right | `pir_questions` | 120 (115 playable) | Enough, but skewed to giant numbers (armies, censuses, ancient-city population estimates). Few "a 6th grader could reason this out" questions. | +40 "Everyday Bible Numbers" |
| Guess the Fake | `gtf_questions` | 85 (17 easy, 41 medium, 27 hard) | **Easy tier is too thin.** Teams mode draws two easy questions per easy round; 17 lasts one game. | +20 easy, +12 hard |
| True or False Showdown | `tf_questions` | 200 (40 easy, 120 medium, 40 hard) | Medium is deep. Hard is used from round 10 onward, and a big room can go 15–20 rounds, so hard runs out in a few games. | +30 hard (15 true, 15 false) |
| Verse Hunt | `verse_hunt_prompts` | 215 (91 easy, 79 medium, 45 hard) | Healthy. No additions. | none |

After the SQL: prompts 213, questions 466, Price Is Right 160, Guess the Fake 117 (37 / 41 / 39), True or False 230 (40 / 120 / 70).

---

## How each game consumes its bank (why the counts matter)

- **Taboo**: 60-second rounds, first team to 8 points. A good team clears 4–6 prompts per round, so one game uses 20–40 prompts. `banned_words` is null on every existing row, so the game derives banned words from the prompt text and hint. For "Noah's Ark" with hint "Two of every kind" that yields banned words like "Noah's", "Ark", "Two", "every", "kind", which is both too easy and oddly worded.
- **Hangman**: first to 3 solved words; 6–10 prompts per game. Long multi-word prompts like "Peter Walks on Water" are painful on a phone-sized letter grid.
- **Pictionary**: first to 5; about 10 prompts per game. Needs drawable nouns and stories.
- All three share the same 20 rows, so after two Sundays the kids have seen every word.
- **Baseball**: picks by difficulty tier. With multiple choice shown, single = 1 base, double = 2, triple = 3, home run = 4. Answering without seeing choices bumps single to 2 and double to 3.
- **Four Corners**: uses every active multiple-choice question regardless of tier. Fine.
- **Auction**: leader picks a tier per round. Fine.
- **Guess the Fake, Teams mode**: each round picks a tier and draws **two** questions of that tier (one per team). Whole-group mode draws one at a time from a no-repeat bag.
- **True or False**: with "ramp" on, rounds 1–3 are easy, 4–9 medium, 10+ hard. Last student standing with 15–20 kids often runs past round 12.
- **Price Is Right**: leader can filter by category; rows with no numeric target are skipped by the game.

---

## Bible Baseball / Four Corners / Auction (`questions`)

### The difficulty problem, concretely

The home-run tier is the clearest case. Same question, different tiers:

| Question | Tagged |
|----------|--------|
| Who replaced Judas Iscariot? | single **and** home run |
| Which prophet confronted David about Bathsheba? | single, double, **and** home run |
| Which disciple was a tax collector? | single (twice) **and** home run |
| How many disciples did Jesus choose? | single **and** home run |
| Where was Jesus born? | single **and** home run |
| Which king built the temple? | single, double, **and** home run |

Of the 46 home runs, only three are genuinely home-run hard (the four living creatures, the five books of John, the seven "I am" statements), and those three are list-recitation questions that are arguably too hard for this age. The other 43 are the easiest questions in the whole bank, worth four bases. A kid who picks "home run" and gets "Where was Jesus born?" is being handed the game.

The double tier has the same issue in the other direction. Rows 248–307 in the seed ("What did Noah build?", "How many of most animals entered the ark?", "Who was the first king of Israel?") are singles re-tagged as doubles. Meanwhile some singles are harder than most doubles ("What tribe was Moses from?", "What job did Nehemiah have?", "Who was Simon of Cyrene?").

Triples (51) are mostly right: Jael, Josiah, Cyrus, Habakkuk, Obadiah, Laodicea, Demetrius. A few are too academic for middle school (Seleucia; "what city did Paul write Romans from, according to most scholars").

### Broken rows (not deleted, optional deactivate in the SQL)

- Row 213: text "You of little faith, why did you doubt?", answer "false", double, open answer. An import artifact; unplayable.
- Row 325: "What city was destroyed after Jonah warned its people and they repented?" with answer "Nineveh was spared". The question contradicts its own answer.
- Row 350: "What was the name of the man Paul healed in Lystra?" The Bible never gives his name; answer is "A man lame from birth".

### Duplicates

Roughly 60 questions appear two or three times with slightly different wording (Rahab's cord ×4, Daniel's den ×3, Nehemiah cupbearer ×3, Jordan River ×4). Not harmful, but they inflate the counts, and the in-game no-repeat only checks ids, so a team can get "the same" question twice in one game. Left alone; worth a cleanup pass in the admin page later.

### What the SQL adds

- 32 real home runs: open answer, hard but fair for a kid who has been in church a few years. Secondary characters, "which king / which prophet", places, numbers: Ishmael, Ehud, Eli, Josiah, Hezekiah, Jezebel, Absalom, Hosea, Belteshazzar, Jethro, Leah, Potiphar, Michal, Zechariah, Andrew, Sons of Thunder, Malta, Priscilla and Aquila, Lois, Tarsus, Bethesda, Rhoda, Caesar Augustus, and more.
- 30 real doubles: four-choice multiple choice at true medium level (Naomi, Rebekah, ten plagues, Gideon's fleece, Miriam, ravens, Deborah, Belshazzar, Bethel, Herod, Elizabeth, Levi, Golgotha, Passover, the Philippian jailer, Luke the doctor). These also feed Four Corners.
- Optional, commented out: retag the 43 easy home runs to `single` (as open-answer they still earn 2 bases, which is right), and deactivate the three broken rows.

---

## Hangman / Pictionary / Taboo (`game_prompts`)

Twenty prompts total. This is the one bank that is simply too small to run a game.

What the SQL adds (193 rows, every one with five banned words, a hint, category, testament):

| Category | Easy | Medium | Hard |
|----------|------|--------|------|
| Person | 23 | 27 | 15 |
| Place | 6 | 10 | 8 |
| Object | 10 | 15 | 8 |
| Story | 9 | 25 | 13 |
| Theme | 0 | 21 | 3 |

Difficulty here means "how well a churched 5th–8th grader knows it, and how drawable or guessable it is." Easy is Noah, David, Jonah, the manger, the cross; hard is Melchizedek, Balaam's donkey, the writing on the wall, the alabaster jar.

The 20 existing prompts get their `banned_words` filled in by an UPDATE (only where still null), so Taboo stops inventing banned words from the hint.

---

## Price Is Right (`pir_questions`)

120 rows. Five ("Using the workbook's gold price…") have no numeric target and are already skipped by the game. The "Cities & Archaeology" category (10) is population *estimates*, not Bible facts; fine for a guessing game, but the leader should say so. "How many concubines did Solomon have?" is awkward for this age; the SQL has an optional line to deactivate it.

The real gap is tone: 90 of the 115 playable questions are five- to seven-digit numbers (armies, censuses, talents) that a kid can only guess wildly at. Price Is Right is most fun when the number is something you could reason toward.

What the SQL adds: a new category, **Everyday Bible Numbers**, 40 questions with small, well-known numbers and a one-line "background" for the host: ten plagues, 66 books, 12 sons, 5 stones, 30 pieces of silver, 12 spies, 7 years to build the temple, Josiah king at 8, Jesus at 12 in the temple, 153 fish, 40 days to the ascension, 99 sheep, 7 churches, 3 hours of darkness, 38 years at Bethesda, 176 verses in Psalm 119, 13 laps around Jericho. Pick the category at the start of a game for a kid-friendly round.

---

## Guess the Fake (`gtf_questions`)

85 rows. Content quality is good and the explanations are useful for the leader. Two things:

1. **Easy has 17 rows.** In Teams mode an easy round uses two of them. The tier is empty after one game, and the bag starts repeating.
2. **Some hard rows are not hard.** "Kings of Israel" (fake: David was the first king), "Stephen" (fake: beheaded by Herod), "Nebuchadnezzar" (fake: king of Egypt), "Joshua" (fake: parted the Red Sea) are medium at best. Leave them; just know that "hard" is uneven.

The SQL adds 20 easy (Jesus calms the storm, baby Moses, the lost coin, the shepherds, Peter walks on water, the widow's coins, water into wine, the Lord's Prayer, Samuel hears God, the burning bush…) and 12 genuinely hard (Absalom, Hezekiah, Josiah, Hosea, Elijah on Horeb, Joseph and Potiphar, the bronze serpent, Paul's shipwreck, Peter's escape, Solomon's judgment, the seven churches, Enoch). Each has a reference and a spoiler-free context line, matching the v9 format.

The offline fallback in `lib/guessTheFake.ts` has 86 rounds while the table has 85 (one topic collided with the unique index on import). Harmless.

---

## True or False Showdown (`tf_questions`)

200 rows, 1:3:1 easy/medium/hard, true/false roughly balanced in every tier. This is the best-built bank. Only concern is depth of the hard tier given the ramp: a 20-kid showdown reaches hard by round 10 and may need 8–10 hard statements, so 40 covers about four games before the bag reshuffles. The SQL adds 30 hard, 15 true and 15 false, each with a reference and a correction for the leader.

A few hard rows overlap easier questions in other banks ("Methuselah lived 969 years" is medium here and a Price Is Right target; "Nathan confronted David" is a baseball single). Not a problem inside this game.

---

## Verse Hunt (`verse_hunt_prompts`)

215 prompts, 91/79/45. Enough for a whole season without repeats. Tiering is mostly sensible; a handful of "hard" prompts are easy in practice ("a verse from one of Paul's letters", "a verse that mentions the Holy Spirit", "a verse with the word therefore") and a few mediums are hard ("a verse that mentions a specific tribe or nation"). Not worth SQL; adjust in the admin page if it bugs you.

---

## Running it

1. Open the Supabase SQL editor, paste `supabase/v12_question_balance.sql`, run.
2. Read the optional block at the top first. It is commented out. Uncomment only the parts you agree with (the home-run retag is the one I would take).
3. Re-running the file is safe: every insert skips rows whose text, topic, or statement already exists.

## Follow-ups that need the app, not SQL

- An admin page for `gtf_questions`, `tf_questions`, and `verse_hunt_prompts` (only baseball, prompts, and Price Is Right have one today).
- A "played recently" record so a question is not reused across Sundays (see PLAN.md, Phase 4).
- A duplicate finder in the baseball admin page.
