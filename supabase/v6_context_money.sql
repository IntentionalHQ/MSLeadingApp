-- v6 — Enriched Leader Context for the "Money & Value" category (20 questions).
-- Overwrites the existing terse Background text with narrative that tells the
-- leader where in the Bible the question sits and what's happening in the story.
-- Safe on live data. Re-run is idempotent (it just re-writes the same text).

update pir_questions set background =
  'In the Old Testament, a talent was a huge unit of weight used for gold, silver, and bronze — not a coin like a shekel. In Exodus 38, Moses recorded exact talent counts of metal donated for the tabernacle. The classroom conversion (3,000 shekels ≈ 34 kg) gives kids a mental picture: one talent weighed about as much as a large dog.'
where question = 'How much did one biblical talent weigh?';

update pir_questions set background =
  'A talent of gold shows up when God commands the tabernacle furnishings to be made of pure gold (Exodus 25), and again when Solomon''s fleet returns from Ophir loaded with it (1 Kings 9). This question asks how much the raw metal alone would sell for today — not what it was worth as sacred temple gold.'
where question = 'Using the workbook''s gold price, what is one talent of gold worth in raw metal?';

update pir_questions set background =
  'Silver talents appear throughout Scripture: Naaman brings talents of silver to Elisha as a healing gift (2 Kings 5), and Jesus tells a parable about a servant who owes 10,000 talents (Matthew 18). Silver was the everyday precious metal — used for taxes, ransoms, and tribute. This asks the modern raw-metal value of one talent of silver.'
where question = 'Using the workbook''s silver price, what is one talent of silver worth in raw metal?';

update pir_questions set background =
  'In Joshua 7, Achan steals a gold bar weighing 50 shekels from Jericho — a theft that costs him his life. In 2 Samuel 24, David refuses to accept a free threshing floor from Araunah and insists on paying full price. Gold shekels were rare and valuable. This asks: what''s one gold shekel of raw metal worth today?'
where question = 'Using the workbook''s gold price, what is one gold shekel worth in raw metal?';

update pir_questions set background =
  'In Genesis 23, Abraham buys the cave of Machpelah — the family burial ground — for 400 silver shekels. In Exodus 30, God commands each Israelite man over 20 to pay a half-shekel of silver as a temple tax. Silver shekels were the everyday currency of the Old Testament. This asks the modern raw-metal value of one.'
where question = 'Using the workbook''s silver price, what is one silver shekel worth in raw metal?';

update pir_questions set background =
  'In Matthew 26, Judas agrees to betray Jesus for 30 pieces of silver — the exact price Zechariah 11 prophesied for the shepherd of God''s people, and the same amount Exodus 21 set as compensation for a slave killed by an ox. It was a deliberate insult. This asks what 30 silver shekels of raw metal would be worth today — not the moral weight of the betrayal.'
where question = 'If Judas''s 30 pieces of silver were 30 silver shekels, what is their raw silver value today?';

update pir_questions set background =
  'In 1 Kings 10 (parallel in 2 Chronicles 9), right after the Queen of Sheba''s visit, the writer records Solomon''s yearly income of gold: 666 talents. The number is meant to signal astonishing, almost cartoonish wealth. Interestingly, the same number reappears in Revelation 13 in a completely different context.'
where question = 'How many talents of gold did Solomon receive in one year?';

update pir_questions set background =
  'In 1 Kings 10, the Queen of Sheba (likely from modern Yemen or Ethiopia) travels to Jerusalem with a caravan of camels loaded with gold, spices, and jewels. She had heard about Solomon''s wisdom and came to test him herself. Her gift of 120 talents of gold ranks as one of the most valuable diplomatic presents in the ancient world.'
where question = 'How many talents of gold did the Queen of Sheba give Solomon?';

update pir_questions set background =
  'Solomon partnered with King Hiram of Tyre to build a merchant fleet based at Ezion-geber on the Red Sea. Every three years the ships returned from Ophir (probably East Africa or Arabia) loaded with gold. 1 Kings 9 records 420 talents from one voyage; 2 Chronicles 8 says 450 for what may be the same shipment — a common copying variation.'
where question = 'How many talents of gold did Solomon''s fleet bring from Ophir in 1 Kings?';

update pir_questions set background =
  'In 1 Chronicles 29, David — near the end of his life — gathers Israel''s leaders to fund the temple his son Solomon will build. He announces he''s giving 3,000 talents of gold from his personal treasury on top of what he''d already donated as king. It was a challenge for the leaders to match his generosity.'
where question = 'How many talents of gold did David personally dedicate for the Temple?';

update pir_questions set background =
  'Same scene as the previous question: David''s deathbed challenge in 1 Chronicles 29 to fund Solomon''s future temple. Alongside 3,000 talents of gold, he adds 7,000 talents of refined silver from his private wealth — specifically for overlaying the walls of the temple buildings. His example moved the leaders to give freely too.'
where question = 'How many talents of silver did David personally dedicate for the Temple?';

update pir_questions set background =
  'In Esther 3, the Persian official Haman is furious that Mordecai the Jew refuses to bow to him. He tells King Xerxes there''s a certain people who don''t follow the king''s laws and offers 10,000 talents of silver — enough to fund a small war — for permission to destroy them all. Esther''s courage before the king undid the plot.'
where question = 'How many talents of silver did Haman offer the king?';

update pir_questions set background =
  'In 2 Kings 18, Assyria''s army under Sennacherib has already captured every fortified city of Judah except Jerusalem. King Hezekiah panics and offers tribute. Assyria demands 30 talents of gold and 300 talents of silver. Hezekiah scrapes the gold together by stripping it off the temple doors and doorposts — and the Assyrians attack anyway.'
where question = 'How many talents of gold did Assyria demand from Hezekiah?';

update pir_questions set background =
  'Same tribute as the previous question: after Assyria conquered nearly all of Judah, Hezekiah agreed to pay 300 talents of silver in addition to the gold. The chronicler in 2 Chronicles 32 highlights how God ultimately delivered Jerusalem despite Hezekiah''s weakness in trying to buy off the invaders. Ten times more silver than gold was demanded.'
where question = 'How many talents of silver did Assyria demand from Hezekiah?';

update pir_questions set background =
  'In Ezekiel 45 — written during the Babylonian exile — the prophet lays out fair weights and measures for a future restored Israel: 20 + 25 + 15 shekels together equal one mina (60 total). Different regions used different mina standards elsewhere, but Ezekiel''s version became the classroom baseline for teaching.'
where question = 'How many shekels made one mina in Ezekiel''s standard?';

update pir_questions set background =
  'In Matthew 20, Jesus tells the parable of the vineyard workers. The landowner hires laborers at dawn and agrees on one denarius for the day — the standard daily wage for common labor in the Roman world. In Revelation 6, during famine, a day''s wage buys just a single quart of wheat. It was ordinary people''s money.'
where question = 'About how much labor did one denarius normally represent in Jesus''s parables?';

update pir_questions set background =
  'In Mark 14 and John 12, a woman anoints Jesus with pure nard perfume worth over 300 denarii — nearly a year''s wages for a laborer. The disciples (especially Judas) call it wasteful. Jesus defends her: she was anointing him for burial. This happens just days before the crucifixion.'
where question = 'How many days'' wages was the perfume poured on Jesus estimated to be worth?';

update pir_questions set background =
  'In Mark 6 and John 6, thousands of people have followed Jesus into a remote area and stayed all day. The disciples panic about feeding them and say 200 denarii — about 8 months of wages — wouldn''t even buy enough bread for a small bite each. Jesus takes five loaves and two fish and feeds everyone with baskets left over.'
where question = 'How many days'' wages did the disciples say would not buy enough bread for the 5,000?';

update pir_questions set background =
  'In Mark 12, Jesus is watching people drop offerings into the temple treasury. Wealthy people drop in large sums; a poor widow drops in two lepta — the smallest Roman coins in circulation, together worth about 1/64 of a day''s wage. Jesus tells his disciples she gave more than anyone else because she gave everything she had to live on.'
where question = 'The widow''s two small coins together equaled what fraction of a denarius?';

update pir_questions set background =
  'In Matthew 18, Jesus tells the parable of a servant who owes his king 10,000 talents — an intentionally absurd, impossible debt (roughly 164,000 years of daily wages). The king forgives it. Then that same servant refuses to forgive a fellow servant who owes him a hundred denarii (about three months'' wages). The lesson: our sin debt is unpayable, and God has forgiven it entirely.'
where question = 'About how many years of daily wages was the unforgiving servant''s 10,000-talent debt?';
