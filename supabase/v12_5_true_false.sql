/* v12_5_true_false.sql
   True or False Showdown: adds 30 hard statements, 15 true and 15 false.
   Adds only, nothing deleted. Safe to re-run. Paste the whole file and Run. */

insert into tf_questions (statement, answer, difficulty, testament, reference, explanation) values
  ('Moses died on Mount Nebo after seeing the Promised Land from a distance.',         true,  'hard', 'OT', 'Deuteronomy 34:1-5',  'He saw it but was not allowed to enter.'),
  ('Jacob worked a total of fourteen years for Laban to marry Rachel.',                true,  'hard', 'OT', 'Genesis 29:18-30',    'Seven years, then seven more after being tricked into marrying Leah.'),
  ('Paul was born in the city of Tarsus.',                                             true,  'hard', 'NT', 'Acts 22:3',           'A city in Cilicia, modern Turkey.'),
  ('Timothy''s grandmother was named Lois.',                                            true,  'hard', 'NT', '2 Timothy 1:5',       'His mother was Eunice.'),
  ('Josiah was eight years old when he became king of Judah.',                         true,  'hard', 'OT', '2 Kings 22:1',        'He reigned 31 years.'),
  ('Daniel was given the Babylonian name Belteshazzar.',                               true,  'hard', 'OT', 'Daniel 1:7',          'His three friends were renamed Shadrach, Meshach, and Abednego.'),
  ('The book of Esther never mentions God by name.',                                   true,  'hard', 'OT', 'Esther',              'God is at work throughout, but the name is never written.'),
  ('Jesus was about thirty years old when he began his public ministry.',              true,  'hard', 'NT', 'Luke 3:23',           '"Jesus himself was about thirty years old when he began."'),
  ('Paul was bitten by a poisonous snake on Malta and was unharmed.',                  true,  'hard', 'NT', 'Acts 28:3-6',         'The islanders expected him to die.'),
  ('Deborah judged Israel while sitting under a palm tree.',                           true,  'hard', 'OT', 'Judges 4:5',          '"The Palm of Deborah" between Ramah and Bethel.'),
  ('Jesus cursed a fig tree and it withered.',                                         true,  'hard', 'NT', 'Matthew 21:18-19',    'It had leaves but no fruit.'),
  ('King Saul''s daughter Michal married David.',                                       true,  'hard', 'OT', '1 Samuel 18:27',      'She later helped David escape from Saul.'),
  ('Solomon''s temple took seven years to build.',                                      true,  'hard', 'OT', '1 Kings 6:38',        'His palace took thirteen.'),
  ('Elijah was fed by ravens at the brook Cherith.',                                   true,  'hard', 'OT', '1 Kings 17:2-6',      'Bread and meat, morning and evening.'),
  ('Abraham''s father was named Terah.',                                                true,  'hard', 'OT', 'Genesis 11:27',       'Terah started the journey from Ur and died in Haran.'),
  ('Jacob''s first wife was Rachel.',                                                   false, 'hard', 'OT', 'Genesis 29:23-25',    'Laban tricked him into marrying Leah first.'),
  ('Timothy''s mother was a Greek woman named Lydia.',                                  false, 'hard', 'NT', 'Acts 16:1; 2 Tim 1:5','His mother Eunice was a Jewish believer; his father was Greek.'),
  ('Moses'' father-in-law Jethro was a priest of Egypt.',                               false, 'hard', 'OT', 'Exodus 3:1',          'He was a priest of Midian.'),
  ('The people of Judah were in exile in Babylon for 400 years.',                      false, 'hard', 'OT', 'Jeremiah 25:11',      'Seventy years.'),
  ('Lazarus and his sisters lived in Jericho.',                                        false, 'hard', 'NT', 'John 11:1',           'They lived in Bethany, near Jerusalem.'),
  ('Absalom was killed by his father David.',                                          false, 'hard', 'OT', '2 Samuel 18:14-15',   'Joab killed him against David''s orders.'),
  ('Ezra led the rebuilding of Jerusalem''s walls.',                                    false, 'hard', 'OT', 'Nehemiah 2-6',        'Nehemiah rebuilt the walls; Ezra taught the Law.'),
  ('The Ark of the Covenant was captured by the Egyptians.',                           false, 'hard', 'OT', '1 Samuel 4:11',       'The Philistines captured it.'),
  ('Samson was from the tribe of Judah.',                                              false, 'hard', 'OT', 'Judges 13:2',         'He was from the tribe of Dan.'),
  ('God told Hosea to marry a woman named Ruth.',                                      false, 'hard', 'OT', 'Hosea 1:2-3',         'Her name was Gomer.'),
  ('Peter was freed from prison by the apostle Paul.',                                 false, 'hard', 'NT', 'Acts 12:7',           'An angel freed him.'),
  ('The Gospel of Mark is the longest of the four Gospels.',                           false, 'hard', 'NT', 'Luke',                'Mark is the shortest; Luke is the longest.'),
  ('Jesus raised the widow of Nain''s daughter from the dead.',                         false, 'hard', 'NT', 'Luke 7:11-15',        'It was her son.'),
  ('The name Barnabas means "son of thunder."',                                        false, 'hard', 'NT', 'Acts 4:36; Mark 3:17','Barnabas means "son of encouragement"; James and John were the sons of thunder.'),
  ('Enoch was the father of Noah.',                                                    false, 'hard', 'OT', 'Genesis 5:28-29',     'Lamech was Noah''s father; Enoch was his great-grandfather.')
on conflict (statement) do nothing;
