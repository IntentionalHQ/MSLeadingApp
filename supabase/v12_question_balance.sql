-- ============================================================================
-- v12 — Question-bank balance for 5th–8th graders
-- ============================================================================
-- Companion to QUESTION_AUDIT.md. ADDS ONLY. Nothing is deleted.
-- Safe to re-run: every insert skips rows whose text/topic/statement already exists.
--
-- What this adds:
--   A. game_prompts     +193 prompts with real banned words  (Hangman / Pictionary / Taboo)
--                       + banned words filled in on the 20 existing prompts (they were null)
--   B. questions        +32 real home runs, +30 real doubles  (Bible Baseball / Four Corners / Auction)
--   C. pir_questions    +40 "Everyday Bible Numbers"          (Price Is Right)
--   D. gtf_questions    +20 easy, +12 hard                    (Guess the Fake)
--   E. tf_questions     +30 hard (15 true / 15 false)         (True or False Showdown)
--   Z. OPTIONAL, commented out: re-tier the mis-tagged baseball home runs, deactivate 3 broken rows.
--
-- Run the whole file in the Supabase SQL editor. Run the optional block only if you agree with it.
-- ============================================================================


-- ============================================================================
-- Z. OPTIONAL — re-tier + deactivate (UPDATEs only, no deletes). Uncomment to use.
--    Runs BEFORE the inserts below on purpose, so the new home runs are not touched.
-- ============================================================================
-- -- 43 of the 46 current "home_run" rows are single-level questions ("How many disciples?",
-- -- "Where was Jesus born?"). Worth 4 bases today. Retag them to single; as open-answer
-- -- questions they will still earn 2 bases (the no-choices bonus), which fits.
-- update questions set difficulty = 'single'
--  where difficulty = 'home_run'
--    and text not in (
--      'What are the four living creatures around God’s throne in Revelation commonly described as?',
--      'What are the five books traditionally attributed to John?',
--      'What are the seven “I am” statements of Jesus in the Gospel of John?'
--    );
--
-- -- Three rows that cannot be played correctly (see audit): a broken import row, a question
-- -- whose answer contradicts it, and a question asking for a name the Bible never gives.
-- update questions set active = false
--  where text in (
--    'You of little faith, why did you doubt?',
--    'What city was destroyed after Jonah warned its people and they repented?',
--    'What was the name of the man Paul healed in Lystra who had never walked?'
--  );
--
-- -- Price Is Right: one question that is awkward for a middle-school room.
-- update pir_questions set active = false where question = 'How many concubines did Solomon have?';


-- ============================================================================
-- A. game_prompts — Hangman, Pictionary, Taboo (shared bank)
-- ============================================================================

-- A1. Fill in banned words for the 20 prompts that already exist (only where still null).
update game_prompts g set banned_words = v.bw::jsonb
from (values
  ('Noah''s Ark',                '["Boat","Flood","Animals","Two","Rain"]'),
  ('Moses',                      '["Egypt","Pharaoh","Red Sea","Commandments","Basket"]'),
  ('David and Goliath',          '["Giant","Sling","Stone","Shepherd","Philistine"]'),
  ('Jonah and the Whale',        '["Fish","Swallowed","Nineveh","Boat","Three days"]'),
  ('The Last Supper',            '["Bread","Wine","Disciples","Passover","Meal"]'),
  ('Jericho',                    '["Walls","March","Trumpets","Joshua","Fall"]'),
  ('Bethlehem',                  '["Jesus","Born","Manger","Star","Town"]'),
  ('Burning Bush',               '["Fire","Moses","Flames","Sandals","Holy ground"]'),
  ('Ten Commandments',           '["Moses","Stone","Tablets","Rules","Sinai"]'),
  ('Good Samaritan',             '["Robbers","Road","Help","Neighbor","Parable"]'),
  ('Fishers of Men',             '["Disciples","Net","Boat","Follow","Peter"]'),
  ('Garden of Eden',             '["Adam","Eve","Fruit","Snake","Tree"]'),
  ('Daniel in the Lions'' Den',  '["Pray","King","Angel","Mouths","Cats"]'),
  ('Prodigal Son',               '["Father","Pigs","Inheritance","Brother","Home"]'),
  ('Manna from Heaven',          '["Bread","Wilderness","Food","Israelites","Sky"]'),
  ('Peter Walks on Water',       '["Boat","Sink","Faith","Storm","Jesus"]'),
  ('The Empty Tomb',             '["Stone","Risen","Easter","Angel","Grave"]'),
  ('Solomon',                    '["Wise","King","Temple","David","Wisdom"]'),
  ('Ruth and Naomi',             '["Boaz","Mother-in-law","Loyal","Grain","Moab"]'),
  ('Nazareth',                   '["Jesus","Grew up","Town","Galilee","Hometown"]')
) as v(t, bw)
where g.text = v.t and g.banned_words is null;

-- A2. New prompts. Difficulty = how well a churched 5th–8th grader knows it AND how
--     drawable / guessable it is. Hint is for Hangman's hint button.
insert into game_prompts (text, category, difficulty, testament, hint, banned_words)
select v.text, v.category, v.difficulty, v.testament, v.hint, v.banned_words::jsonb
from (values
  -- ---- PEOPLE · easy ----
  ('Adam',               'person', 'easy',   'OT', 'First man',                          '["Eve","First","Garden","Man","Rib"]'),
  ('Eve',                'person', 'easy',   'OT', 'First woman',                        '["Adam","First","Woman","Apple","Snake"]'),
  ('Noah',               'person', 'easy',   'OT', 'Built a very big boat',              '["Ark","Flood","Boat","Animals","Rainbow"]'),
  ('Abraham',            'person', 'easy',   'OT', 'Father of many nations',             '["Isaac","Sarah","Father","Nations","Stars"]'),
  ('Jacob',              'person', 'easy',   'OT', 'Wrestled with God; twelve sons',     '["Esau","Ladder","Twelve","Israel","Twin"]'),
  ('Joseph',             'person', 'easy',   'OT', 'Colorful coat, dreams, Egypt',       '["Coat","Dreams","Brothers","Egypt","Pharaoh"]'),
  ('David',              'person', 'easy',   'OT', 'Shepherd boy who became king',       '["Goliath","King","Shepherd","Sling","Psalms"]'),
  ('Goliath',            'person', 'easy',   'OT', 'Nine-foot Philistine',               '["Giant","David","Tall","Sling","Stone"]'),
  ('Jonah',              'person', 'easy',   'OT', 'Ran from God, met a big fish',       '["Fish","Whale","Nineveh","Swallowed","Boat"]'),
  ('Daniel',             'person', 'easy',   'OT', 'Lions couldn''t touch him',          '["Lions","Den","Pray","Babylon","King"]'),
  ('Samson',             'person', 'easy',   'OT', 'Strongest man, long hair',           '["Strong","Hair","Delilah","Philistines","Pillars"]'),
  ('Esther',             'person', 'easy',   'OT', 'Queen who saved her people',         '["Queen","King","Jews","Haman","Mordecai"]'),
  ('Elijah',             'person', 'easy',   'OT', 'Fire from heaven, chariot ride',     '["Prophet","Fire","Chariot","Baal","Ravens"]'),
  ('Jesus',              'person', 'easy',   'NT', 'Son of God',                         '["God","Son","Christ","Savior","Cross"]'),
  ('Mary',               'person', 'easy',   'NT', 'Mother of Jesus',                    '["Jesus","Mother","Joseph","Angel","Baby"]'),
  ('Peter',              'person', 'easy',   'NT', 'Fisherman, denied Jesus 3 times',    '["Disciple","Rock","Denied","Rooster","Fisherman"]'),
  ('Paul',               'person', 'easy',   'NT', 'Wrote a lot of the New Testament',   '["Saul","Letters","Damascus","Missionary","Apostle"]'),
  ('Zacchaeus',          'person', 'easy',   'NT', 'Short man in a tree',                '["Short","Tree","Tax collector","Climb","Sycamore"]'),
  ('Lazarus',            'person', 'easy',   'NT', 'Four days dead, then not',           '["Dead","Tomb","Raised","Mary","Martha"]'),
  ('John the Baptist',   'person', 'easy',   'NT', 'Locusts, honey, river',              '["Baptize","Jordan","Locusts","Honey","Cousin"]'),
  ('Judas',              'person', 'easy',   'NT', 'Thirty pieces of silver',            '["Betray","Silver","Kiss","Disciple","Thirty"]'),
  ('Pharaoh',            'person', 'easy',   'OT', 'King of Egypt',                      '["Egypt","King","Moses","Plagues","Let my people go"]'),
  ('Isaac',              'person', 'easy',   'OT', 'Abraham''s promised son',            '["Abraham","Sarah","Son","Sacrifice","Ram"]'),
  -- ---- PEOPLE · medium ----
  ('Joshua',             'person', 'medium', 'OT', 'Led Israel into the Promised Land',  '["Jericho","Moses","Walls","Promised Land","Leader"]'),
  ('Gideon',             'person', 'medium', 'OT', '300 men, torches and trumpets',      '["300","Fleece","Midianites","Trumpets","Judge"]'),
  ('Deborah',            'person', 'medium', 'OT', 'A woman who judged Israel',          '["Judge","Woman","Barak","Palm tree","Prophetess"]'),
  ('Samuel',             'person', 'medium', 'OT', 'Heard God call his name at night',   '["Hannah","Eli","Prophet","Anoint","Speak Lord"]'),
  ('King Saul',          'person', 'medium', 'OT', 'First king of Israel',               '["First","King","David","Jonathan","Tall"]'),
  ('Nehemiah',           'person', 'medium', 'OT', 'Rebuilt Jerusalem''s wall',          '["Wall","Jerusalem","Cupbearer","Rebuild","52 days"]'),
  ('Elisha',             'person', 'medium', 'OT', 'Elijah''s successor, double portion','["Elijah","Prophet","Naaman","Double","Axe head"]'),
  ('Rahab',              'person', 'medium', 'OT', 'Hid the spies, red rope',            '["Spies","Jericho","Scarlet","Rope","Window"]'),
  ('Hannah',             'person', 'medium', 'OT', 'Prayed for a son',                   '["Samuel","Prayed","Son","Temple","Eli"]'),
  ('Thomas',             'person', 'medium', 'NT', 'Doubting disciple',                  '["Doubt","Disciple","Wounds","Believe","Twin"]'),
  ('Matthew',            'person', 'medium', 'NT', 'Tax collector turned disciple',      '["Tax collector","Gospel","Disciple","Levi","Book"]'),
  ('Martha',             'person', 'medium', 'NT', 'Busy in the kitchen',                '["Mary","Lazarus","Busy","Serving","Sister"]'),
  ('Nicodemus',          'person', 'medium', 'NT', 'Came to Jesus at night',             '["Night","Pharisee","Born again","Teacher","John 3"]'),
  ('Barnabas',           'person', 'medium', 'NT', 'Son of encouragement',               '["Paul","Encouragement","Missionary","Mark","Antioch"]'),
  ('Timothy',            'person', 'medium', 'NT', 'Paul''s young helper',               '["Paul","Young","Letters","Pastor","Helper"]'),
  ('Stephen',            'person', 'medium', 'NT', 'First martyr',                       '["Stoned","Martyr","First","Deacon","Acts"]'),
  ('Pontius Pilate',     'person', 'medium', 'NT', 'Washed his hands',                   '["Governor","Roman","Crucify","Hands","Trial"]'),
  ('King Herod',         'person', 'medium', 'NT', 'Wanted baby Jesus dead',             '["King","Wise men","Baby","Kill","Bethlehem"]'),
  ('Cain',               'person', 'medium', 'OT', 'Killed his brother',                 '["Abel","Brother","Killed","Farmer","Mark"]'),
  ('Abel',               'person', 'medium', 'OT', 'First person to die',                '["Cain","Brother","Sheep","Offering","Killed"]'),
  ('Delilah',            'person', 'medium', 'OT', 'Cut Samson''s hair',                 '["Samson","Hair","Cut","Secret","Philistines"]'),
  ('Boaz',               'person', 'medium', 'OT', 'Married Ruth',                       '["Ruth","Field","Grain","Redeemer","Naomi"]'),
  ('Miriam',             'person', 'medium', 'OT', 'Moses'' sister, sang at the sea',    '["Moses","Sister","Basket","Tambourine","Aaron"]'),
  ('Aaron',              'person', 'medium', 'OT', 'Moses'' brother, first high priest', '["Moses","Brother","Priest","Staff","Golden calf"]'),
  ('Mary Magdalene',     'person', 'medium', 'NT', 'First to see the risen Jesus',       '["Tomb","Easter","Risen","Woman","Garden"]'),
  ('Simon of Cyrene',    'person', 'medium', 'NT', 'Carried the cross',                  '["Cross","Carry","Jesus","Road","Forced"]'),
  ('Andrew',             'person', 'medium', 'NT', 'Brought Peter to Jesus',             '["Peter","Brother","Fisherman","Disciple","Loaves"]'),
  -- ---- PEOPLE · hard ----
  ('Melchizedek',        'person', 'hard',   'OT', 'King and priest who met Abraham',    '["Priest","King","Abraham","Salem","Bread"]'),
  ('Bartimaeus',         'person', 'hard',   'NT', 'Blind beggar near Jericho',          '["Blind","Beggar","Jericho","Son of David","Mercy"]'),
  ('Jairus',             'person', 'hard',   'NT', 'His daughter was raised',            '["Daughter","Raised","Synagogue","Sleeping","Twelve"]'),
  ('Onesimus',           'person', 'hard',   'NT', 'Runaway slave in Philemon',          '["Slave","Philemon","Runaway","Paul","Letter"]'),
  ('Methuselah',         'person', 'hard',   'OT', 'Lived 969 years',                    '["Oldest","969","Years","Old","Noah"]'),
  ('Nebuchadnezzar',     'person', 'hard',   'OT', 'King of Babylon, ate grass',         '["Babylon","King","Statue","Furnace","Grass"]'),
  ('Ezekiel',            'person', 'hard',   'OT', 'Valley of dry bones',                '["Bones","Prophet","Vision","Wheel","Valley"]'),
  ('Balaam',             'person', 'hard',   'OT', 'His donkey talked',                  '["Donkey","Talk","Angel","Curse","Prophet"]'),
  ('Jael',               'person', 'hard',   'OT', 'Tent peg',                           '["Tent","Peg","Sisera","Deborah","Hammer"]'),
  ('Lydia',              'person', 'hard',   'NT', 'Sold purple cloth',                  '["Purple","Cloth","Philippi","Paul","Seller"]'),
  ('Cornelius',          'person', 'hard',   'NT', 'Roman centurion Peter visited',      '["Centurion","Roman","Peter","Vision","Gentile"]'),
  ('Eutychus',           'person', 'hard',   'NT', 'Fell asleep, fell out a window',     '["Window","Fell","Asleep","Paul","Sermon"]'),
  ('Absalom',            'person', 'hard',   'OT', 'Caught by his hair in a tree',       '["Hair","Tree","David","Son","Rebel"]'),
  ('Josiah',             'person', 'hard',   'OT', 'King at age eight',                  '["King","Eight","Boy","Book of the Law","Judah"]'),
  ('Hezekiah',           'person', 'hard',   'OT', 'Got 15 extra years',                 '["King","Fifteen","Years","Sick","Sundial"]'),
  -- ---- PLACES · easy ----
  ('Egypt',              'place',  'easy',   'OT', 'Pyramids, Pharaoh, plagues',         '["Pharaoh","Pyramids","Moses","Slaves","Nile"]'),
  ('Jerusalem',          'place',  'easy',   null, 'City of David, the temple',          '["City","Temple","David","Holy","Israel"]'),
  ('Red Sea',            'place',  'easy',   'OT', 'Parted for Israel',                  '["Parted","Moses","Water","Egypt","Walls"]'),
  ('Jordan River',       'place',  'easy',   null, 'Where Jesus was baptized',           '["Baptized","River","Water","John","Cross"]'),
  ('Mount Sinai',        'place',  'easy',   'OT', 'Ten Commandments given here',        '["Mountain","Commandments","Moses","Tablets","Smoke"]'),
  ('Galilee',            'place',  'easy',   'NT', 'Lake where Jesus calmed the storm',  '["Sea","Lake","Boat","Storm","Fishing"]'),
  -- ---- PLACES · medium ----
  ('Babylon',            'place',  'medium', 'OT', 'Where Daniel was taken',             '["Daniel","Exile","Nebuchadnezzar","Captive","Tower"]'),
  ('Nineveh',            'place',  'medium', 'OT', 'Jonah''s assignment',                '["Jonah","City","Repent","Preach","Assyria"]'),
  ('Mount of Olives',    'place',  'medium', 'NT', 'Jesus ascended from here',           '["Ascension","Mountain","Trees","Jerusalem","Garden"]'),
  ('Damascus',           'place',  'medium', 'NT', 'Saul saw the light on the way here', '["Saul","Road","Light","Blind","Paul"]'),
  ('Rome',               'place',  'medium', 'NT', 'Paul''s final stop',                 '["Empire","Caesar","Paul","Italy","Letter"]'),
  ('Canaan',             'place',  'medium', 'OT', 'The Promised Land',                  '["Promised","Land","Milk","Honey","Israel"]'),
  ('Sodom',              'place',  'medium', 'OT', 'Lot''s city, destroyed by fire',     '["Lot","Fire","Destroyed","Gomorrah","Salt"]'),
  ('Golgotha',           'place',  'medium', 'NT', 'Place of the skull',                 '["Cross","Skull","Crucified","Hill","Calvary"]'),
  ('Capernaum',          'place',  'medium', 'NT', 'Jesus'' home base by the lake',      '["Jesus","Town","Galilee","Peter","Roof"]'),
  ('Gethsemane',         'place',  'medium', 'NT', 'Garden where Jesus prayed',          '["Garden","Prayed","Arrested","Sweat","Olive"]'),
  -- ---- PLACES · hard ----
  ('Patmos',             'place',  'hard',   'NT', 'John''s island',                     '["Island","John","Revelation","Exile","Vision"]'),
  ('Emmaus',             'place',  'hard',   'NT', 'Road where Jesus walked unnoticed',  '["Road","Walk","Bread","Risen","Two"]'),
  ('Antioch',            'place',  'hard',   'NT', 'First called Christians here',       '["Christians","First","Paul","Barnabas","Church"]'),
  ('Ephesus',            'place',  'hard',   'NT', 'Armor of God letter went here',      '["Paul","Letter","Armor","Church","Riot"]'),
  ('Corinth',            'place',  'hard',   'NT', 'Love chapter went here',             '["Paul","Letter","Love","Church","Greece"]'),
  ('Mount Carmel',       'place',  'hard',   'OT', 'Elijah vs. the prophets of Baal',    '["Elijah","Baal","Fire","Altar","Prophets"]'),
  ('Ur',                 'place',  'hard',   'OT', 'Abraham''s hometown',                '["Abraham","Home","Leave","Chaldeans","City"]'),
  ('Philippi',           'place',  'hard',   'NT', 'Paul and Silas jailed here',         '["Jail","Paul","Silas","Earthquake","Lydia"]'),
  -- ---- OBJECTS · easy ----
  ('Ark of the Covenant','object', 'easy',   'OT', 'Gold box with the tablets',          '["Box","Gold","Tablets","Angels","Carry"]'),
  ('Manger',             'object', 'easy',   'NT', 'Baby Jesus'' bed',                   '["Baby","Jesus","Hay","Feed","Stable"]'),
  ('Cross',              'object', 'easy',   'NT', 'Jesus died on it',                   '["Jesus","Died","Wood","Nails","Crucify"]'),
  ('Sling',              'object', 'easy',   'OT', 'David''s weapon',                    '["David","Stone","Goliath","Rock","Throw"]'),
  ('Rainbow',            'object', 'easy',   'OT', 'God''s promise in the sky',          '["Colors","Sky","Promise","Noah","Rain"]'),
  ('Crown of Thorns',    'object', 'easy',   'NT', 'Put on Jesus'' head',                '["Jesus","Head","Sharp","Soldiers","King"]'),
  ('Star of Bethlehem',  'object', 'easy',   'NT', 'The wise men followed it',           '["Wise men","Sky","Follow","Bright","Night"]'),
  ('Donkey',             'object', 'easy',   null, 'Jesus rode one; Balaam''s talked',   '["Ride","Animal","Palm Sunday","Talk","Ears"]'),
  ('Dove',               'object', 'easy',   null, 'Olive leaf; Holy Spirit',            '["Bird","Noah","Spirit","Baptism","White"]'),
  ('Shepherd''s Staff',  'object', 'easy',   null, 'Moses turned one into a snake',      '["Stick","Moses","Snake","Sheep","Rod"]'),
  -- ---- OBJECTS · medium ----
  ('Coat of Many Colors','object', 'medium', 'OT', 'Joseph''s gift from Jacob',          '["Joseph","Jacob","Robe","Brothers","Rainbow"]'),
  ('Jawbone of a Donkey','object', 'medium', 'OT', 'Samson''s weapon',                   '["Samson","Weapon","Bone","Thousand","Philistines"]'),
  ('Fleece',             'object', 'medium', 'OT', 'Gideon''s test',                     '["Gideon","Wool","Wet","Dry","Sign"]'),
  ('Golden Calf',        'object', 'medium', 'OT', 'Idol made at Sinai',                 '["Idol","Aaron","Cow","Gold","Worship"]'),
  ('Fiery Furnace',      'object', 'medium', 'OT', 'Three friends walked out unharmed',  '["Fire","Shadrach","Hot","King","Fourth man"]'),
  ('Widow''s Two Coins', 'object', 'medium', 'NT', 'Small gift, biggest heart',          '["Widow","Money","Offering","Small","Gave"]'),
  ('Palm Branch',        'object', 'medium', 'NT', 'Waved when Jesus rode in',           '["Sunday","Wave","Jesus","Donkey","Hosanna"]'),
  ('Loaves and Fishes',  'object', 'medium', 'NT', 'A boy''s lunch fed thousands',       '["Bread","Fish","5000","Boy","Baskets"]'),
  ('Mustard Seed',       'object', 'medium', 'NT', 'Tiny seed, big faith',               '["Small","Faith","Seed","Tree","Grow"]'),
  ('Chariot of Fire',    'object', 'medium', 'OT', 'Elijah''s ride to heaven',           '["Elijah","Fire","Heaven","Horses","Whirlwind"]'),
  ('Pillar of Salt',     'object', 'medium', 'OT', 'Lot''s wife looked back',            '["Lot","Wife","Looked back","Sodom","Statue"]'),
  ('Jacob''s Ladder',    'object', 'medium', 'OT', 'Angels going up and down',           '["Angels","Dream","Stairs","Heaven","Jacob"]'),
  ('Baby Moses'' Basket','object', 'medium', 'OT', 'Floated on the Nile',                '["River","Nile","Baby","Float","Princess"]'),
  ('Trumpet',            'object', 'medium', null, 'Jericho; the last day',              '["Horn","Blow","Jericho","Loud","Music"]'),
  ('Empty Net',          'object', 'medium', 'NT', 'Then 153 fish',                      '["Fish","Boat","Catch","Other side","Peter"]'),
  -- ---- OBJECTS · hard ----
  ('Bronze Serpent',     'object', 'hard',   'OT', 'Look and live',                      '["Snake","Pole","Moses","Bitten","Look"]'),
  ('Floating Axe Head',  'object', 'hard',   'OT', 'Elisha''s miracle',                  '["Elisha","Water","Iron","Float","Borrowed"]'),
  ('Tent Peg',           'object', 'hard',   'OT', 'Jael''s weapon',                     '["Jael","Sisera","Hammer","Tent","Nail"]'),
  ('Alabaster Jar',      'object', 'hard',   'NT', 'Perfume poured on Jesus',            '["Perfume","Poured","Woman","Feet","Expensive"]'),
  ('Armor of God',       'object', 'hard',   'NT', 'Belt, breastplate, shield, sword',   '["Shield","Sword","Helmet","Ephesians","Fight"]'),
  ('Scarlet Cord',       'object', 'hard',   'OT', 'Rahab''s sign',                      '["Rahab","Red","Rope","Window","Spies"]'),
  ('Frankincense',       'object', 'hard',   'NT', 'A wise man''s gift',                 '["Wise men","Gift","Gold","Myrrh","Smell"]'),
  ('Lampstand',          'object', 'hard',   null, 'Seven branches in the tabernacle',   '["Light","Candle","Seven","Gold","Tabernacle"]'),
  -- ---- STORIES · easy ----
  ('Creation',           'story',  'easy',   'OT', 'Seven days',                         '["God","Made","World","Days","Beginning"]'),
  ('The Flood',          'story',  'easy',   'OT', 'Forty days of rain',                 '["Noah","Rain","Ark","Water","Forty"]'),
  ('Parting of the Red Sea','story','easy',  'OT', 'Walls of water',                     '["Moses","Water","Split","Egypt","Dry ground"]'),
  ('Feeding the 5,000',  'story',  'easy',   'NT', 'Five loaves, two fish',              '["Bread","Fish","Crowd","Baskets","Boy"]'),
  ('The Birth of Jesus', 'story',  'easy',   'NT', 'No room at the inn',                 '["Christmas","Manger","Mary","Bethlehem","Baby"]'),
  ('The Resurrection',   'story',  'easy',   'NT', 'Third day',                          '["Easter","Tomb","Risen","Alive","Stone"]'),
  ('Jesus Calms the Storm','story','easy',   'NT', 'Peace, be still',                    '["Boat","Wind","Waves","Sleep","Quiet"]'),
  ('The Lost Sheep',     'story',  'easy',   'NT', 'Ninety-nine left behind',            '["Shepherd","99","Lost","Found","Lamb"]'),
  ('Zacchaeus in the Tree','story','easy',   'NT', 'Come down!',                         '["Short","Climb","Sycamore","Tax","Jesus"]'),
  -- ---- STORIES · medium ----
  ('The Ten Plagues',    'story',  'medium', 'OT', 'Frogs, flies, hail, darkness',       '["Egypt","Frogs","Pharaoh","Moses","Locusts"]'),
  ('Tower of Babel',     'story',  'medium', 'OT', 'Languages confused',                 '["Tall","Languages","Build","Sky","Confused"]'),
  ('Samson and Delilah', 'story',  'medium', 'OT', 'The secret of his strength',         '["Hair","Strong","Cut","Secret","Philistines"]'),
  ('Jacob and Esau',     'story',  'medium', 'OT', 'Stew for a birthright',              '["Twins","Stew","Birthright","Hairy","Blessing"]'),
  ('Elijah and the Prophets of Baal','story','medium','OT','Fire fell on the wet altar',  '["Fire","Altar","Water","Carmel","Prophets"]'),
  ('Esther Saves Her People','story','medium','OT', 'If I perish, I perish',             '["Queen","Haman","King","Jews","Banquet"]'),
  ('The Wise Men',       'story',  'medium', 'NT', 'Gold, frankincense, myrrh',          '["Star","Gifts","Three","Kings","East"]'),
  ('Jesus in the Temple as a Boy','story','medium','NT','Twelve years old, lost for 3 days','["Twelve","Lost","Teachers","Jerusalem","Parents"]'),
  ('Water into Wine',    'story',  'medium', 'NT', 'First miracle, at a wedding',        '["Wedding","Cana","Jars","Miracle","Drink"]'),
  ('Palm Sunday',        'story',  'medium', 'NT', 'Hosanna!',                           '["Donkey","Branches","Jerusalem","Hosanna","Coats"]'),
  ('The Lost Coin',      'story',  'medium', 'NT', 'She swept the whole house',          '["Woman","Sweep","Money","Lamp","Found"]'),
  ('The Sower',          'story',  'medium', 'NT', 'Seed on four kinds of ground',       '["Seed","Soil","Farmer","Birds","Thorns"]'),
  ('Wise and Foolish Builders','story','medium','NT','Rock vs. sand',                    '["House","Rock","Sand","Storm","Build"]'),
  ('Doubting Thomas',    'story',  'medium', 'NT', 'Unless I see the nail marks',        '["Thomas","Believe","Wounds","Hands","See"]'),
  ('Road to Damascus',   'story',  'medium', 'NT', 'Saul, why do you persecute me?',     '["Saul","Light","Blind","Road","Paul"]'),
  ('Pentecost',          'story',  'medium', 'NT', 'Wind, fire, languages',              '["Holy Spirit","Fire","Wind","Languages","Peter"]'),
  ('The Transfiguration','story',  'medium', 'NT', 'Jesus shone like the sun',           '["Mountain","Shine","Moses","Elijah","Bright"]'),
  ('The Rich Young Ruler','story', 'medium', 'NT', 'Went away sad',                      '["Rich","Sell","Poor","Sad","Follow"]'),
  ('The Ten Lepers',     'story',  'medium', 'NT', 'Only one said thank you',            '["Healed","Ten","Thank","One","Sick"]'),
  ('The Woman at the Well','story','medium', 'NT', 'Living water',                       '["Water","Samaritan","Well","Husbands","Drink"]'),
  ('Jesus Washes the Disciples'' Feet','story','medium','NT','A towel and a basin',      '["Feet","Towel","Water","Servant","Supper"]'),
  ('The Great Commission','story', 'medium', 'NT', 'Go and make disciples',              '["Go","Nations","Disciples","Baptize","Teach"]'),
  ('Abraham and Isaac',  'story',  'medium', 'OT', 'God provided a ram',                 '["Sacrifice","Ram","Mountain","Son","Knife"]'),
  ('Joseph in Egypt',    'story',  'medium', 'OT', 'From prison to palace',              '["Dreams","Pharaoh","Famine","Brothers","Prison"]'),
  ('Baby Moses in the Nile','story','medium','OT', 'Found by a princess',                '["Basket","River","Princess","Baby","Sister"]'),
  -- ---- STORIES · hard ----
  ('Balaam''s Donkey',   'story',  'hard',   'OT', 'The donkey saw the angel first',     '["Donkey","Talk","Angel","Sword","Beat"]'),
  ('The Writing on the Wall','story','hard', 'OT', 'Mene, mene, tekel',                  '["Hand","Wall","King","Feast","Daniel"]'),
  ('The Valley of Dry Bones','story','hard', 'OT', 'Can these bones live?',              '["Bones","Ezekiel","Skeleton","Alive","Army"]'),
  ('Naaman''s Leprosy',  'story',  'hard',   'OT', 'Seven dips in the Jordan',           '["Leprosy","Seven","River","Wash","Elisha"]'),
  ('Solomon and the Two Mothers','story','hard','OT','Cut the baby in half?',            '["Baby","Sword","Wise","Two","Women"]'),
  ('Jacob Wrestles with God','story','hard', 'OT', 'A new name and a limp',              '["Wrestle","Night","Hip","Israel","Bless"]'),
  ('Ananias and Sapphira','story', 'hard',   'NT', 'They lied about the money',          '["Lied","Money","Land","Died","Peter"]'),
  ('Philip and the Ethiopian','story','hard','NT', 'Do you understand what you read?',   '["Chariot","Isaiah","Baptize","Official","Read"]'),
  ('Peter''s Escape from Prison','story','hard','NT','Rhoda left him at the door',       '["Angel","Chains","Rhoda","Door","Herod"]'),
  ('Paul and Silas in Prison','story','hard','NT', 'Singing at midnight, earthquake',    '["Singing","Earthquake","Jailer","Chains","Midnight"]'),
  ('Gideon''s Fleece',   'story',  'hard',   'OT', 'Wet, then dry',                      '["Wool","Wet","Dry","Sign","Dew"]'),
  ('The Sun Stands Still','story', 'hard',   'OT', 'Joshua''s long day',                 '["Joshua","Sun","Moon","Battle","Day"]'),
  ('The Widow''s Oil',   'story',  'hard',   'OT', 'Jars kept filling',                  '["Jars","Oil","Elisha","Widow","Pour"]'),
  -- ---- THEMES · medium ----
  ('Forgiveness',        'theme',  'medium', null, 'Seventy times seven',                '["Sorry","Forgive","Sin","Pardon","Let go"]'),
  ('Faith',              'theme',  'medium', null, 'Trusting what you can''t see',       '["Believe","Trust","Hope","Sure","Unseen"]'),
  ('Grace',              'theme',  'medium', null, 'Undeserved favor',                   '["Gift","Free","Deserve","Favor","Saved"]'),
  ('Prayer',             'theme',  'medium', null, 'Talking with God',                   '["Talk","God","Kneel","Ask","Amen"]'),
  ('Baptism',            'theme',  'medium', null, 'Under the water and up',             '["Water","Dunk","Church","Sprinkle","John"]'),
  ('Communion',          'theme',  'medium', 'NT', 'Bread and cup',                      '["Bread","Cup","Juice","Church","Remember"]'),
  ('The Trinity',        'theme',  'medium', null, 'Three in one',                       '["Father","Son","Spirit","Three","One"]'),
  ('The Fruit of the Spirit','theme','medium','NT','Love, joy, peace…',                  '["Love","Joy","Peace","Patience","Galatians"]'),
  ('The Golden Rule',    'theme',  'medium', 'NT', 'Do to others…',                      '["Treat","Others","Want","Do unto","Nice"]'),
  ('The Lord''s Prayer', 'theme',  'medium', 'NT', 'Our Father in heaven',               '["Our Father","Heaven","Daily bread","Jesus taught","Amen"]'),
  ('The Beatitudes',     'theme',  'medium', 'NT', 'Blessed are the…',                   '["Blessed","Sermon","Mount","Poor","Meek"]'),
  ('Salvation',          'theme',  'medium', null, 'Being rescued from sin',             '["Saved","Rescue","Jesus","Sin","Heaven"]'),
  ('Heaven',             'theme',  'medium', null, 'Where God lives',                    '["God","Clouds","Sky","Angels","Forever"]'),
  ('Repentance',         'theme',  'medium', null, 'Turning around',                     '["Sorry","Turn","Sin","Change","Confess"]'),
  ('Worship',            'theme',  'medium', null, 'Singing to God',                     '["Sing","Praise","Church","Music","Hands"]'),
  ('Missionary',         'theme',  'medium', null, 'Sent to share the good news',        '["Travel","Preach","Country","Gospel","Sent"]'),
  ('Parable',            'theme',  'medium', 'NT', 'A story with a lesson',              '["Story","Jesus","Lesson","Teach","Meaning"]'),
  ('Miracle',            'theme',  'medium', null, 'Something only God can do',          '["Amazing","Power","Heal","Impossible","Wonder"]'),
  ('Angel',              'theme',  'medium', null, 'God''s messenger',                   '["Wings","Heaven","Messenger","Halo","Gabriel"]'),
  ('Sabbath',            'theme',  'medium', null, 'A day to rest',                      '["Rest","Seventh","Day","Sunday","Saturday"]'),
  ('Temptation',         'theme',  'medium', null, 'Wanting to do wrong',                '["Sin","Devil","Want","Wrong","Resist"]'),
  ('Covenant',           'theme',  'hard',   null, 'A promise between God and people',   '["Promise","Agreement","Rainbow","Sign","Abraham"]'),
  ('Prophet',            'theme',  'hard',   null, 'Speaks God''s message',              '["Message","Future","God","Speak","Isaiah"]'),
  ('Tithe',              'theme',  'hard',   null, 'Ten percent',                        '["Money","Ten","Percent","Give","Offering"]')
) as v(text, category, difficulty, testament, hint, banned_words)
where not exists (select 1 from game_prompts g where g.text = v.text);


-- ============================================================================
-- B. questions — Bible Baseball (+ Four Corners uses the multiple-choice ones, Auction all)
-- ============================================================================

-- B1. Thirty-two REAL home runs: open answer, hard but fair for a churched middle schooler.
insert into questions (text, correct_answer, difficulty, format, choices, testament)
select v.text, v.answer, 'home_run', 'open_answer', null, v.testament
from (values
  ('What was the name of Abraham’s first son, born to Hagar?',                                      'Ishmael',                 'OT'),
  ('How many years in total did Jacob work for Laban to marry Rachel?',                              'Fourteen',                'OT'),
  ('On what mountain did Moses die after seeing the Promised Land?',                                'Mount Nebo',              'OT'),
  ('Which left-handed judge killed King Eglon of Moab?',                                            'Ehud',                    'OT'),
  ('Who was the priest at Shiloh who raised Samuel?',                                               'Eli',                     'OT'),
  ('Which king of Judah became king at age eight?',                                                 'Josiah',                  'OT'),
  ('Which king of Judah was healed and given fifteen more years to live?',                          'Hezekiah',                'OT'),
  ('Which wicked queen tried to kill Elijah?',                                                      'Jezebel',                 'OT'),
  ('Which of David’s sons rebelled against him and was caught by his hair in a tree?',              'Absalom',                 'OT'),
  ('Who was Solomon’s mother?',                                                                     'Bathsheba',               'OT'),
  ('Which prophet was told by God to marry a woman named Gomer?',                                   'Hosea',                   'OT'),
  ('Which prophet was thrown into a muddy cistern for preaching?',                                  'Jeremiah',                'OT'),
  ('What Babylonian name was Daniel given?',                                                        'Belteshazzar',            'OT'),
  ('What is the longest chapter in the Bible?',                                                     'Psalm 119',               'OT'),
  ('Who was Moses’ father-in-law?',                                                                 'Jethro',                  'OT'),
  ('Which two spies gave a faithful report about the Promised Land?',                               'Joshua and Caleb',        'OT'),
  ('Who became king after Solomon and split the kingdom with his harsh answer?',                    'Rehoboam',                'OT'),
  ('Who was Jacob’s first wife?',                                                                   'Leah',                    'OT'),
  ('Who was Joseph’s Egyptian master before he was thrown in prison?',                              'Potiphar',                'OT'),
  ('What was the name of King Saul’s daughter who married David?',                                  'Michal',                  'OT'),
  ('Which book of the Bible never mentions God by name?',                                           'Esther',                  'OT'),
  ('How many years was Judah in exile in Babylon?',                                                 'Seventy',                 'OT'),
  ('Who was the father of John the Baptist?',                                                       'Zechariah',               'NT'),
  ('Which disciple brought his brother Peter to Jesus?',                                            'Andrew',                  'NT'),
  ('Which two disciples did Jesus nickname the “Sons of Thunder”?',                                 'James and John',          'NT'),
  ('On what island was Paul shipwrecked on the way to Rome?',                                       'Malta',                   'NT'),
  ('What married couple made tents with Paul in Corinth?',                                          'Priscilla and Aquila',    'NT'),
  ('What was the name of Timothy’s grandmother, known for her faith?',                              'Lois',                    'NT'),
  ('In what city was Paul born?',                                                                   'Tarsus',                  'NT'),
  ('What was the name of the pool where Jesus healed a man who had been sick for 38 years?',        'Bethesda',                'NT'),
  ('What was the name of the servant girl who left Peter standing at the door after his escape?',   'Rhoda',                   'NT'),
  ('Who was the Roman emperor when Jesus was born?',                                                'Caesar Augustus',         'NT')
) as v(text, answer, testament)
where not exists (select 1 from questions q where q.text = v.text);

-- B2. Thirty REAL doubles: multiple choice, medium. The correct_answer matches one choice exactly
--     (Four Corners needs that).
insert into questions (text, correct_answer, difficulty, format, choices, testament)
select v.text, v.answer, 'double', 'multiple_choice', v.choices::jsonb, v.testament
from (values
  ('Who was Ruth’s mother-in-law?',                                        'Naomi',                        '["A) Orpah","B) Naomi","C) Leah","D) Miriam"]',                                          'OT'),
  ('Who was Isaac’s wife?',                                                'Rebekah',                      '["A) Rachel","B) Leah","C) Rebekah","D) Sarah"]',                                        'OT'),
  ('How many plagues did God send on Egypt?',                              'Ten',                          '["A) Seven","B) Ten","C) Twelve","D) Forty"]',                                           'OT'),
  ('What did Gideon use to ask God for a sign?',                           'A wool fleece',                '["A) A wool fleece","B) A clay jar","C) A trumpet","D) A sword"]',                       'OT'),
  ('Who was Moses’ sister?',                                               'Miriam',                       '["A) Deborah","B) Hannah","C) Miriam","D) Zipporah"]',                                   'OT'),
  ('What did God send to feed Elijah by the brook?',                       'Ravens',                       '["A) Ravens","B) Angels","C) Doves","D) Sheep"]',                                        'OT'),
  ('Which judge of Israel was a woman?',                                   'Deborah',                      '["A) Ruth","B) Esther","C) Deborah","D) Jael"]',                                         'OT'),
  ('What did Samson tie to the tails of foxes?',                           'Torches',                      '["A) Bells","B) Torches","C) Ropes","D) Stones"]',                                       'OT'),
  ('Which king saw a hand writing on the wall?',                           'Belshazzar',                   '["A) Nebuchadnezzar","B) Darius","C) Belshazzar","D) Cyrus"]',                           'OT'),
  ('How many sons did Jacob have?',                                        'Twelve',                       '["A) Seven","B) Ten","C) Twelve","D) Thirteen"]',                                        'OT'),
  ('What was the first thing God created?',                                'Light',                        '["A) Water","B) Animals","C) Light","D) Land"]',                                         'OT'),
  ('On which day did God create people?',                                  'The sixth day',                '["A) The first day","B) The third day","C) The sixth day","D) The seventh day"]',        'OT'),
  ('Who was the first person to die in the Bible?',                        'Abel',                         '["A) Adam","B) Cain","C) Abel","D) Seth"]',                                              'OT'),
  ('Where did Jacob dream about a stairway to heaven?',                    'Bethel',                       '["A) Bethel","B) Bethlehem","C) Hebron","D) Jericho"]',                                  'OT'),
  ('Who tricked Isaac into giving him the blessing meant for Esau?',       'Jacob',                        '["A) Joseph","B) Jacob","C) Laban","D) Ishmael"]',                                       'OT'),
  ('Which king tried to have baby Jesus killed?',                          'Herod',                        '["A) Herod","B) Pilate","C) Caesar","D) Nero"]',                                         'NT'),
  ('What three gifts did the wise men bring?',                             'Gold, frankincense, and myrrh','["A) Gold, silver, and bronze","B) Gold, frankincense, and myrrh","C) Bread, wine, and oil","D) Wool, linen, and silk"]', 'NT'),
  ('Who was the mother of John the Baptist?',                              'Elizabeth',                    '["A) Mary","B) Anna","C) Elizabeth","D) Martha"]',                                       'NT'),
  ('What was Matthew’s other name?',                                       'Levi',                         '["A) Simon","B) Levi","C) Nathanael","D) Silas"]',                                       'NT'),
  ('What was Peter’s name before Jesus renamed him?',                      'Simon',                        '["A) Andrew","B) Simon","C) James","D) Philip"]',                                        'NT'),
  ('What did the prodigal son end up feeding when his money ran out?',     'Pigs',                         '["A) Sheep","B) Camels","C) Pigs","D) Chickens"]',                                       'NT'),
  ('How many lepers did Jesus heal when only one came back to thank him?', 'Ten',                          '["A) Two","B) Seven","C) Ten","D) Twelve"]',                                             'NT'),
  ('What did Peter find in the mouth of a fish to pay the temple tax?',    'A coin',                       '["A) A pearl","B) A coin","C) A ring","D) A key"]',                                      'NT'),
  ('What kind of tree did Jesus curse for having no fruit?',               'A fig tree',                   '["A) An olive tree","B) A fig tree","C) A palm tree","D) A sycamore tree"]',            'NT'),
  ('Who came to Jesus at night to ask about being born again?',            'Nicodemus',                    '["A) Nicodemus","B) Zacchaeus","C) Joseph of Arimathea","D) Lazarus"]',                  'NT'),
  ('What is the name of the hill where Jesus was crucified?',              'Golgotha',                     '["A) Mount Sinai","B) Golgotha","C) Mount Carmel","D) Gethsemane"]',                     'NT'),
  ('What feast were Jesus and his disciples celebrating at the Last Supper?','Passover',                   '["A) Passover","B) Pentecost","C) Tabernacles","D) Purim"]',                             'NT'),
  ('How many days after the resurrection did Jesus ascend into heaven?',   'Forty',                        '["A) Three","B) Seven","C) Forty","D) Fifty"]',                                          'NT'),
  ('What did the Philippian jailer ask Paul and Silas?',                   'What must I do to be saved?',  '["A) Who are you?","B) Why are you singing?","C) What must I do to be saved?","D) Where is your God?"]', 'NT'),
  ('Which of Paul’s traveling companions was a doctor?',                   'Luke',                         '["A) Timothy","B) Silas","C) Luke","D) Mark"]',                                          'NT')
) as v(text, answer, choices, testament)
where not exists (select 1 from questions q where q.text = v.text);


-- ============================================================================
-- C. pir_questions — Price Is Right: "Everyday Bible Numbers" (kid-sized numbers)
-- ============================================================================
insert into pir_questions (question, host_answer, accepted_answer, numeric_target, unit, category, background, reference_1, fact_type)
select * from (values
  ('How many plagues did God send on Egypt?',                                                  '10',            'Exact: 10',          10,   'plagues',        'Everyday Bible Numbers', 'Blood, frogs, gnats, flies, livestock, boils, hail, locusts, darkness, death of the firstborn.', 'Exodus 7–12',       'Bible count'),
  ('How many books are in the whole Bible?',                                                   '66',            'Exact: 66',          66,   'books',          'Everyday Bible Numbers', '39 in the Old Testament, 27 in the New.',                                                   'Table of contents', 'Bible count'),
  ('How many sons did Jacob have?',                                                            '12',            'Exact: 12',          12,   'sons',           'Everyday Bible Numbers', 'They became the twelve tribes of Israel.',                                                  'Genesis 35:22–26',  'Bible count'),
  ('How many smooth stones did David pick up before facing Goliath?',                          '5',             'Exact: 5',           5,    'stones',         'Everyday Bible Numbers', 'He only needed one.',                                                                        '1 Samuel 17:40',    'Bible count'),
  ('How many lepers did Jesus heal at once, with only one coming back to say thank you?',      '10',            'Exact: 10',          10,   'lepers',         'Everyday Bible Numbers', 'The one who returned was a Samaritan.',                                                     'Luke 17:11–19',     'Bible count'),
  ('Jesus said to forgive not seven times but seventy times seven. What number is that?',      '490',           'Accept 490 (or 77 in some translations)', 490, 'times',      'Everyday Bible Numbers', 'The point is: stop counting.',                                                              'Matthew 18:22',     'Bible count'),
  ('How many years did Jacob work for Laban to marry Rachel?',                                 '14',            'Exact: 14',          14,   'years',          'Everyday Bible Numbers', 'Seven years, then tricked into marrying Leah, then seven more.',                            'Genesis 29:18–30',  'Bible count'),
  ('How many chapters are in the book of Psalms?',                                             '150',           'Exact: 150',         150,  'chapters',       'Everyday Bible Numbers', 'The longest book in the Bible by chapters.',                                                'Psalms',            'Bible count'),
  ('How many pieces of silver did Judas receive for betraying Jesus?',                         '30',            'Exact: 30',          30,   'pieces of silver','Everyday Bible Numbers','The price of a slave in Exodus 21:32.',                                                     'Matthew 26:15',     'Bible count'),
  ('How many spies did Moses send into Canaan?',                                               '12',            'Exact: 12',          12,   'spies',          'Everyday Bible Numbers', 'One from each tribe. Only Joshua and Caleb trusted God.',                                   'Numbers 13',        'Bible count'),
  ('How many years did it take Solomon to build the temple?',                                  '7',             'Exact: 7',           7,    'years',          'Everyday Bible Numbers', 'His own palace took 13 years.',                                                             '1 Kings 6:38',      'Bible count'),
  ('How old was Josiah when he became king?',                                                  '8',             'Exact: 8',           8,    'years old',      'Everyday Bible Numbers', 'He reigned 31 years and led a huge revival.',                                               '2 Kings 22:1',      'Bible count'),
  ('How old was Jesus when his parents found him talking with the teachers in the temple?',    '12',            'Exact: 12',          12,   'years old',      'Everyday Bible Numbers', 'They had been searching for three days.',                                                   'Luke 2:42–46',      'Bible count'),
  ('About how old was Jesus when he began his public ministry?',                               '30',            '29–31',              30,   'years old',      'Everyday Bible Numbers', 'Luke says "about thirty."',                                                                  'Luke 3:23',         'Bible count'),
  ('How old was Abraham when Isaac was born?',                                                 '100',           'Exact: 100',         100,  'years old',      'Everyday Bible Numbers', 'Sarah was 90.',                                                                              'Genesis 21:5',      'Bible count'),
  ('How old was Sarah when Isaac was born?',                                                   '90',            'Exact: 90',          90,   'years old',      'Everyday Bible Numbers', 'She laughed when she first heard the promise.',                                             'Genesis 17:17',     'Bible count'),
  ('How many fish were in the net the disciples hauled in after the resurrection?',            '153',           'Exact: 153',         153,  'fish',           'Everyday Bible Numbers', 'And the net did not tear.',                                                                 'John 21:11',        'Bible count'),
  ('How many days after his resurrection did Jesus ascend into heaven?',                       '40',            'Exact: 40',          40,   'days',           'Everyday Bible Numbers', 'He appeared to his followers during those days.',                                           'Acts 1:3',          'Bible count'),
  ('About how many believers were gathered when Matthias was chosen to replace Judas?',        'about 120',     '110–130',            120,  'people',         'Everyday Bible Numbers', 'This was before Pentecost.',                                                                'Acts 1:15',         'Bible count'),
  ('How many disciples did Jesus send out two by two in Luke 10?',                             '72',            'Accept 70 or 72 (translations differ)', 72, 'disciples',   'Everyday Bible Numbers', 'Some manuscripts say seventy.',                                                             'Luke 10:1',         'Bible count'),
  ('How many bridesmaids were in Jesus’ parable of the lamps?',                                '10',            'Exact: 10',          10,   'bridesmaids',    'Everyday Bible Numbers', 'Five wise, five foolish.',                                                                  'Matthew 25:1',      'Bible count'),
  ('How many sheep did the shepherd leave behind to look for the one that was lost?',          '99',            'Exact: 99',          99,   'sheep',          'Everyday Bible Numbers', 'Out of one hundred.',                                                                        'Luke 15:4',         'Bible count'),
  ('How many churches received letters at the start of Revelation?',                           '7',             'Exact: 7',           7,    'churches',       'Everyday Bible Numbers', 'Ephesus, Smyrna, Pergamum, Thyatira, Sardis, Philadelphia, Laodicea.',                      'Revelation 1:11',   'Bible count'),
  ('How many gates does the New Jerusalem have?',                                              '12',            'Exact: 12',          12,   'gates',          'Everyday Bible Numbers', 'Each one made of a single pearl.',                                                          'Revelation 21:12–21','Bible count'),
  ('How many stone tablets were the Ten Commandments written on?',                             '2',             'Exact: 2',           2,    'tablets',        'Everyday Bible Numbers', 'Written by the finger of God.',                                                             'Exodus 31:18',      'Bible count'),
  ('How many days was Saul blind after meeting Jesus on the road to Damascus?',                '3',             'Exact: 3',           3,    'days',           'Everyday Bible Numbers', 'He did not eat or drink until Ananias came.',                                               'Acts 9:9',          'Bible count'),
  ('How many years did the Israelites live in Egypt before the Exodus?',                       '430',           '400–430',            430,  'years',          'Everyday Bible Numbers', 'Genesis 15 rounds it to 400.',                                                              'Exodus 12:40',      'Bible count'),
  ('How many years was Judah in exile in Babylon?',                                            '70',            'Exact: 70',          70,   'years',          'Everyday Bible Numbers', 'Jeremiah predicted it.',                                                                    'Jeremiah 25:11',    'Bible count'),
  ('How many prophets of Baal did Elijah face on Mount Carmel?',                               '450',           'Exact: 450',         450,  'prophets',       'Everyday Bible Numbers', 'Plus 400 prophets of Asherah were invited.',                                                '1 Kings 18:22',     'Bible count'),
  ('How many husbands had the Samaritan woman at the well had?',                               '5',             'Exact: 5',           5,    'husbands',       'Everyday Bible Numbers', 'And the man she lived with was not her husband.',                                           'John 4:18',         'Bible count'),
  ('How many years had the man at the pool of Bethesda been unable to walk?',                  '38',            'Exact: 38',          38,   'years',          'Everyday Bible Numbers', 'Jesus asked him, "Do you want to get well?"',                                               'John 5:5',          'Bible count'),
  ('How many years had the woman who touched Jesus’ cloak been bleeding?',                     '12',            'Exact: 12',          12,   'years',          'Everyday Bible Numbers', 'She had spent everything on doctors.',                                                      'Mark 5:25',         'Bible count'),
  ('How many hours of darkness covered the land while Jesus was on the cross?',                '3',             'Exact: 3',           3,    'hours',          'Everyday Bible Numbers', 'From noon until three in the afternoon.',                                                   'Matthew 27:45',     'Bible count'),
  ('How many rivers flowed out of the Garden of Eden?',                                        '4',             'Exact: 4',           4,    'rivers',         'Everyday Bible Numbers', 'Pishon, Gihon, Tigris, Euphrates.',                                                         'Genesis 2:10–14',   'Bible count'),
  ('How many pairs of each CLEAN animal did Noah take on the ark?',                            '7',             'Exact: 7',           7,    'pairs',          'Everyday Bible Numbers', 'Only one pair of the unclean animals.',                                                     'Genesis 7:2',       'Bible count'),
  ('How old was Joseph when his brothers sold him?',                                           '17',            'Exact: 17',          17,   'years old',      'Everyday Bible Numbers', 'He was 30 when he stood before Pharaoh.',                                                   'Genesis 37:2',      'Bible count'),
  ('How old was Moses when he stood before Pharaoh and said "Let my people go"?',              '80',            'Exact: 80',          80,   'years old',      'Everyday Bible Numbers', 'Aaron was 83.',                                                                             'Exodus 7:7',        'Bible count'),
  ('How old was Noah when the flood came?',                                                    '600',           'Exact: 600',         600,  'years old',      'Everyday Bible Numbers', 'He lived 350 more years after it.',                                                         'Genesis 7:6',       'Bible count'),
  ('How many verses are in Psalm 119, the longest chapter in the Bible?',                      '176',           'Exact: 176',         176,  'verses',         'Everyday Bible Numbers', 'It is an acrostic: 22 sections, one per Hebrew letter.',                                    'Psalm 119',         'Bible count'),
  ('How many times in total did Israel march around Jericho over the seven days?',             '13',            'Exact: 13',          13,   'laps',           'Everyday Bible Numbers', 'Once a day for six days, then seven times on day seven.',                                   'Joshua 6:3–4',      'Bible count')
) as v(question, host_answer, accepted_answer, numeric_target, unit, category, background, reference_1, fact_type)
where not exists (select 1 from pir_questions p where p.question = v.question);


-- ============================================================================
-- D. gtf_questions — Guess the Fake: +20 easy, +12 hard (statement_3 is always the fake)
-- ============================================================================
insert into gtf_questions (topic, difficulty, testament, statement_1, statement_2, statement_3, fake_index, explanation, reference, context) values
  -- easy
  ('Jesus Calms the Storm', 'easy', 'NT', 'Jesus was asleep in the boat when the storm hit.', 'Jesus said "Quiet! Be still!" and the wind stopped.', 'The disciples swam to shore to escape the storm.', 3, 'They stayed in the boat; Jesus calmed the storm.', 'Mark 4:35–41', 'A sudden storm on the Sea of Galilee terrifies experienced fishermen.'),
  ('Baby Moses', 'easy', 'OT', 'Moses’ mother hid him in a basket on the Nile River.', 'Pharaoh’s daughter found him and raised him as her son.', 'Moses was found floating in a wooden boat on the Red Sea.', 3, 'It was a basket on the Nile, not a boat on the Red Sea.', 'Exodus 2:1–10', 'Pharaoh has ordered Hebrew baby boys killed.'),
  ('The Red Sea Crossing', 'easy', 'OT', 'God parted the sea and Israel crossed on dry ground.', 'Pharaoh’s army drowned when the water came back.', 'The Israelites crossed the sea in boats that Noah built.', 3, 'No boats; they walked through on dry ground.', 'Exodus 14', 'Israel is trapped between Pharaoh’s army and the sea.'),
  ('The Lost Coin', 'easy', 'NT', 'A woman lost one of her ten silver coins.', 'She lit a lamp and swept the house until she found it.', 'She gave up and went out to buy a new coin.', 3, 'She searched until she found it, then threw a party.', 'Luke 15:8–10', 'One of three "lost" parables Jesus told in a row.'),
  ('The Shepherds at Christmas', 'easy', 'NT', 'An angel told the shepherds that a Savior had been born.', 'A huge crowd of angels praised God saying "Glory to God in the highest."', 'The shepherds brought baby Jesus a lamb as a present.', 3, 'The Bible never mentions the shepherds bringing a gift.', 'Luke 2:8–20', 'Night shift in the fields outside Bethlehem.'),
  ('Jesus and the Children', 'easy', 'NT', 'Jesus said "Let the little children come to me."', 'The disciples tried to send the children away.', 'Jesus said children had to wait until they were grown up to come to him.', 3, 'He welcomed them and said the kingdom belongs to such as these.', 'Mark 10:13–16', 'Parents bring their kids to Jesus for a blessing.'),
  ('Peter Walks on Water', 'easy', 'NT', 'Peter got out of the boat and walked toward Jesus on the water.', 'Peter started to sink when he looked at the wind and waves.', 'Peter walked all the way to shore without getting wet.', 3, 'He sank and Jesus caught him.', 'Matthew 14:22–33', 'Late at night, the disciples see Jesus walking on the lake.'),
  ('The Widow’s Two Coins', 'easy', 'NT', 'A poor widow put two tiny coins into the temple offering.', 'Jesus said she gave more than all the rich people.', 'Jesus told her to take her coins back because they were too small.', 3, 'He praised her; she gave everything she had.', 'Mark 12:41–44', 'Jesus watches people drop money into the offering box.'),
  ('Water into Wine', 'easy', 'NT', 'Jesus’ first miracle happened at a wedding in Cana.', 'Servants filled six stone jars with water.', 'At the end of the party Jesus turned the wine back into water.', 3, 'The wine stayed wine, and it was the best of the night.', 'John 2:1–11', 'The wedding host has run out of wine.'),
  ('Jesus in the Temple as a Boy', 'easy', 'NT', 'Jesus was twelve when his parents lost track of him in Jerusalem.', 'They found him in the temple talking with the teachers.', 'Jesus had run off to join a fishing boat on the lake.', 3, 'He was in the temple, "in my Father’s house."', 'Luke 2:41–52', 'The family is heading home after Passover.'),
  ('The Lord’s Prayer', 'easy', 'NT', 'Jesus taught his disciples to pray "Our Father in heaven."', 'The prayer includes "Give us today our daily bread."', 'The prayer ends with "and please give us lots of money."', 3, 'Nothing about money; it asks for forgiveness and protection.', 'Matthew 6:9–13', 'The disciples ask Jesus to teach them to pray.'),
  ('Elijah and the Ravens', 'easy', 'OT', 'Ravens brought Elijah bread and meat every morning and evening.', 'Elijah drank water from a brook.', 'Elijah lived in a cave with a friendly lion.', 3, 'Birds fed him; no lion.', '1 Kings 17:1–6', 'Elijah is hiding during a drought he announced.'),
  ('The Good Shepherd', 'easy', 'NT', 'Jesus said "I am the good shepherd."', 'The good shepherd lays down his life for the sheep.', 'Jesus said the good shepherd sells the sheep when they get sick.', 3, 'He protects them; a hired hand runs away.', 'John 10:11–15', 'Jesus explains how he cares for his people.'),
  ('The Twelve Spies', 'easy', 'OT', 'Moses sent twelve spies into the Promised Land.', 'They carried back a cluster of grapes so big it took two men.', 'All twelve spies said "Let’s go take the land right now!"', 3, 'Only Joshua and Caleb trusted God; the other ten were afraid.', 'Numbers 13–14', 'Israel is on the edge of Canaan.'),
  ('David the Shepherd Boy', 'easy', 'OT', 'David was the youngest of Jesse’s sons.', 'David killed a lion and a bear while protecting his sheep.', 'David was chosen as king because he was the tallest.', 3, 'God looks at the heart, not the outside.', '1 Samuel 16–17', 'Samuel visits Bethlehem to anoint a new king.'),
  ('The Angel Visits Mary', 'easy', 'NT', 'The angel Gabriel told Mary she would have a son named Jesus.', 'Mary answered, "I am the Lord’s servant."', 'The angel told Mary to name the baby Joseph Junior.', 3, 'The name was Jesus.', 'Luke 1:26–38', 'Mary is a young woman engaged to Joseph in Nazareth.'),
  ('God Makes People', 'easy', 'OT', 'God formed the first man from the dust of the ground.', 'God made the first woman while Adam was in a deep sleep.', 'God made people on the third day of creation.', 3, 'People were made on the sixth day.', 'Genesis 1:26–27; 2:7–22', 'The last thing God makes before resting.'),
  ('The Great Commission', 'easy', 'NT', 'Jesus told his followers to go and make disciples of all nations.', 'Jesus promised, "I am with you always."', 'Jesus told them to stay in Jerusalem forever and never travel.', 3, 'He sent them to the whole world.', 'Matthew 28:18–20', 'Jesus’ last instructions before returning to heaven.'),
  ('Samuel Hears God', 'easy', 'OT', 'Young Samuel heard a voice calling his name at night.', 'Eli told him to answer, "Speak, Lord, your servant is listening."', 'The voice turned out to be Eli playing a prank.', 3, 'It was God, calling Samuel to be a prophet.', '1 Samuel 3', 'Samuel is a boy serving in the tabernacle.'),
  ('The Burning Bush', 'easy', 'OT', 'God spoke to Moses from a bush that was on fire but did not burn up.', 'God told Moses to take off his sandals because the ground was holy.', 'The bush burned to ashes as soon as God finished speaking.', 3, 'The bush was never consumed.', 'Exodus 3', 'Moses is a shepherd in Midian, 40 years after fleeing Egypt.'),
  -- hard
  ('Absalom', 'hard', 'OT', 'Absalom was David’s son and led a rebellion against him.', 'Absalom got caught by his hair in a tree while riding a mule.', 'David killed Absalom himself in battle.', 3, 'Joab killed him; David wept when he heard.', '2 Samuel 15–18', 'A handsome prince steals the hearts of Israel.'),
  ('Hezekiah', 'hard', 'OT', 'God added fifteen years to Hezekiah’s life when he was dying.', 'As a sign, the shadow on the stairway went backward ten steps.', 'Hezekiah was king of the northern kingdom of Israel.', 3, 'He was king of Judah, in Jerusalem.', '2 Kings 20:1–11', 'A good king gets sick while Assyria threatens.'),
  ('Josiah', 'hard', 'OT', 'Josiah became king when he was eight years old.', 'The Book of the Law was found while the temple was being repaired in his reign.', 'Josiah tore down the temple and built a palace in its place.', 3, 'He repaired the temple and led a revival.', '2 Kings 22–23', 'A boy king in a nation that has forgotten God.'),
  ('Hosea', 'hard', 'OT', 'God told the prophet Hosea to marry a woman named Gomer.', 'Hosea’s marriage was a picture of God’s love for unfaithful Israel.', 'Hosea was swallowed by a great fish.', 3, 'That was Jonah.', 'Hosea 1–3', 'A prophet whose own life becomes the sermon.'),
  ('Elijah on the Mountain', 'hard', 'OT', 'Elijah ran from Queen Jezebel all the way to Mount Horeb.', 'God was not in the wind, earthquake, or fire, but spoke in a gentle whisper.', 'Elijah stayed on the mountain for the rest of his life.', 3, 'God sent him back with a job to do.', '1 Kings 19', 'Right after the victory on Mount Carmel, Elijah is exhausted and afraid.'),
  ('Joseph and Potiphar', 'hard', 'OT', 'Potiphar’s wife falsely accused Joseph.', 'In prison, Joseph explained the dreams of the cupbearer and the baker.', 'Potiphar was the Pharaoh of Egypt.', 3, 'Potiphar was an officer, captain of the guard.', 'Genesis 39–40', 'Joseph is a slave in a rich man’s house.'),
  ('The Bronze Serpent', 'hard', 'OT', 'Moses made a bronze snake and put it on a pole.', 'Anyone who was bitten and looked at it lived.', 'Jesus said people should worship the bronze snake.', 3, 'Jesus compared himself to it being lifted up; Hezekiah later destroyed it because people worshiped it.', 'Numbers 21:4–9; John 3:14', 'Poisonous snakes are biting the grumbling Israelites.'),
  ('Paul’s Shipwreck', 'hard', 'NT', 'Paul was shipwrecked on the island of Malta.', 'A viper bit Paul and he shook it off unharmed.', 'Paul was sailing to Rome on vacation.', 3, 'He was a prisoner being taken to appeal to Caesar.', 'Acts 27–28', 'Two weeks of storm in the Mediterranean.'),
  ('Peter’s Escape', 'hard', 'NT', 'An angel freed Peter from prison the night before Herod planned to kill him.', 'The servant girl Rhoda was so excited she left Peter standing at the door.', 'Peter dug his way out of prison with a spoon.', 3, 'The chains fell off and the gate opened by itself.', 'Acts 12:1–17', 'James has just been executed; the church is praying all night.'),
  ('Solomon’s Wise Judgment', 'hard', 'OT', 'Two women each claimed the same living baby was theirs.', 'Solomon suggested cutting the baby in two.', 'Solomon kept the baby and raised him in the palace.', 3, 'The real mother gave up her claim to save the child, so Solomon gave him to her.', '1 Kings 3:16–28', 'Solomon has just asked God for wisdom.'),
  ('The Seven Churches', 'hard', 'NT', 'Revelation opens with letters to seven churches.', 'The church in Laodicea was called "lukewarm."', 'One of the seven letters was written to the church in Jerusalem.', 3, 'All seven were in Asia Minor (modern Turkey).', 'Revelation 2–3', 'John is in exile on Patmos.'),
  ('Enoch', 'hard', 'OT', 'Enoch walked with God, and God took him without dying.', 'Enoch was the father of Methuselah.', 'Enoch built the first city in the Bible.', 3, 'Cain built the first city; Enoch is known for walking with God.', 'Genesis 5:21–24', 'One of only two people in the Bible who never died.')
on conflict (topic) do nothing;


-- ============================================================================
-- E. tf_questions — True or False Showdown: +30 hard (rounds 10+ use this tier)
-- ============================================================================
insert into tf_questions (statement, answer, difficulty, testament, reference, explanation) values
  -- true
  ('Moses died on Mount Nebo after seeing the Promised Land from a distance.',         true,  'hard', 'OT', 'Deuteronomy 34:1–5',  'He saw it but was not allowed to enter.'),
  ('Jacob worked a total of fourteen years for Laban to marry Rachel.',                true,  'hard', 'OT', 'Genesis 29:18–30',    'Seven years, then seven more after being tricked into marrying Leah.'),
  ('Paul was born in the city of Tarsus.',                                             true,  'hard', 'NT', 'Acts 22:3',           'A city in Cilicia, modern Turkey.'),
  ('Timothy’s grandmother was named Lois.',                                            true,  'hard', 'NT', '2 Timothy 1:5',       'His mother was Eunice.'),
  ('Josiah was eight years old when he became king of Judah.',                         true,  'hard', 'OT', '2 Kings 22:1',        'He reigned 31 years.'),
  ('Daniel was given the Babylonian name Belteshazzar.',                               true,  'hard', 'OT', 'Daniel 1:7',          'His three friends were renamed Shadrach, Meshach, and Abednego.'),
  ('The book of Esther never mentions God by name.',                                   true,  'hard', 'OT', 'Esther',              'God is at work throughout, but the name is never written.'),
  ('Jesus was about thirty years old when he began his public ministry.',              true,  'hard', 'NT', 'Luke 3:23',           '"Jesus himself was about thirty years old when he began."'),
  ('Paul was bitten by a poisonous snake on Malta and was unharmed.',                  true,  'hard', 'NT', 'Acts 28:3–6',         'The islanders expected him to die.'),
  ('Deborah judged Israel while sitting under a palm tree.',                           true,  'hard', 'OT', 'Judges 4:5',          '"The Palm of Deborah" between Ramah and Bethel.'),
  ('Jesus cursed a fig tree and it withered.',                                         true,  'hard', 'NT', 'Matthew 21:18–19',    'It had leaves but no fruit.'),
  ('King Saul’s daughter Michal married David.',                                       true,  'hard', 'OT', '1 Samuel 18:27',      'She later helped David escape from Saul.'),
  ('Solomon’s temple took seven years to build.',                                      true,  'hard', 'OT', '1 Kings 6:38',        'His palace took thirteen.'),
  ('Elijah was fed by ravens at the brook Cherith.',                                   true,  'hard', 'OT', '1 Kings 17:2–6',      'Bread and meat, morning and evening.'),
  ('Abraham’s father was named Terah.',                                                true,  'hard', 'OT', 'Genesis 11:27',       'Terah started the journey from Ur and died in Haran.'),
  -- false
  ('Jacob’s first wife was Rachel.',                                                   false, 'hard', 'OT', 'Genesis 29:23–25',    'Laban tricked him into marrying Leah first.'),
  ('Timothy’s mother was a Greek woman named Lydia.',                                  false, 'hard', 'NT', 'Acts 16:1; 2 Tim 1:5','His mother Eunice was a Jewish believer; his father was Greek.'),
  ('Moses’ father-in-law Jethro was a priest of Egypt.',                               false, 'hard', 'OT', 'Exodus 3:1',          'He was a priest of Midian.'),
  ('The people of Judah were in exile in Babylon for 400 years.',                      false, 'hard', 'OT', 'Jeremiah 25:11',      'Seventy years.'),
  ('Lazarus and his sisters lived in Jericho.',                                        false, 'hard', 'NT', 'John 11:1',           'They lived in Bethany, near Jerusalem.'),
  ('Absalom was killed by his father David.',                                          false, 'hard', 'OT', '2 Samuel 18:14–15',   'Joab killed him against David’s orders.'),
  ('Ezra led the rebuilding of Jerusalem’s walls.',                                    false, 'hard', 'OT', 'Nehemiah 2–6',        'Nehemiah rebuilt the walls; Ezra taught the Law.'),
  ('The Ark of the Covenant was captured by the Egyptians.',                           false, 'hard', 'OT', '1 Samuel 4:11',       'The Philistines captured it.'),
  ('Samson was from the tribe of Judah.',                                              false, 'hard', 'OT', 'Judges 13:2',         'He was from the tribe of Dan.'),
  ('God told Hosea to marry a woman named Ruth.',                                      false, 'hard', 'OT', 'Hosea 1:2–3',         'Her name was Gomer.'),
  ('Peter was freed from prison by the apostle Paul.',                                 false, 'hard', 'NT', 'Acts 12:7',           'An angel freed him.'),
  ('The Gospel of Mark is the longest of the four Gospels.',                           false, 'hard', 'NT', 'Luke',                'Mark is the shortest; Luke is the longest.'),
  ('Jesus raised the widow of Nain’s daughter from the dead.',                         false, 'hard', 'NT', 'Luke 7:11–15',        'It was her son.'),
  ('The name Barnabas means "son of thunder."',                                        false, 'hard', 'NT', 'Acts 4:36; Mark 3:17','Barnabas means "son of encouragement"; James and John were the sons of thunder.'),
  ('Enoch was the father of Noah.',                                                    false, 'hard', 'OT', 'Genesis 5:28–29',     'Lamech was Noah’s father; Enoch was his great-grandfather.')
on conflict (statement) do nothing;

-- Done. See QUESTION_AUDIT.md for the before/after counts.
