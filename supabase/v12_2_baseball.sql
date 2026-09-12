/* v12_2_baseball.sql
   Bible Baseball / Four Corners / Auction: adds 32 real home runs and 30 real doubles.
   Adds only, nothing deleted. Safe to re-run. Paste the whole file and Run. */

insert into questions (text, correct_answer, difficulty, format, choices, testament)
select v.text, v.answer, 'home_run', 'open_answer', null, v.testament
from (values
  ('What was the name of Abraham''s first son, born to Hagar?',                                      'Ishmael',                 'OT'),
  ('How many years in total did Jacob work for Laban to marry Rachel?',                              'Fourteen',                'OT'),
  ('On what mountain did Moses die after seeing the Promised Land?',                                'Mount Nebo',              'OT'),
  ('Which left-handed judge killed King Eglon of Moab?',                                            'Ehud',                    'OT'),
  ('Who was the priest at Shiloh who raised Samuel?',                                               'Eli',                     'OT'),
  ('Which king of Judah became king at age eight?',                                                 'Josiah',                  'OT'),
  ('Which king of Judah was healed and given fifteen more years to live?',                          'Hezekiah',                'OT'),
  ('Which wicked queen tried to kill Elijah?',                                                      'Jezebel',                 'OT'),
  ('Which of David''s sons rebelled against him and was caught by his hair in a tree?',              'Absalom',                 'OT'),
  ('Who was Solomon''s mother?',                                                                     'Bathsheba',               'OT'),
  ('Which prophet was told by God to marry a woman named Gomer?',                                   'Hosea',                   'OT'),
  ('Which prophet was thrown into a muddy cistern for preaching?',                                  'Jeremiah',                'OT'),
  ('What Babylonian name was Daniel given?',                                                        'Belteshazzar',            'OT'),
  ('What is the longest chapter in the Bible?',                                                     'Psalm 119',               'OT'),
  ('Who was Moses'' father-in-law?',                                                                 'Jethro',                  'OT'),
  ('Which two spies gave a faithful report about the Promised Land?',                               'Joshua and Caleb',        'OT'),
  ('Who became king after Solomon and split the kingdom with his harsh answer?',                    'Rehoboam',                'OT'),
  ('Who was Jacob''s first wife?',                                                                   'Leah',                    'OT'),
  ('Who was Joseph''s Egyptian master before he was thrown in prison?',                              'Potiphar',                'OT'),
  ('What was the name of King Saul''s daughter who married David?',                                  'Michal',                  'OT'),
  ('Which book of the Bible never mentions God by name?',                                           'Esther',                  'OT'),
  ('How many years was Judah in exile in Babylon?',                                                 'Seventy',                 'OT'),
  ('Who was the father of John the Baptist?',                                                       'Zechariah',               'NT'),
  ('Which disciple brought his brother Peter to Jesus?',                                            'Andrew',                  'NT'),
  ('Which two disciples did Jesus nickname the "Sons of Thunder"?',                                 'James and John',          'NT'),
  ('On what island was Paul shipwrecked on the way to Rome?',                                       'Malta',                   'NT'),
  ('What married couple made tents with Paul in Corinth?',                                          'Priscilla and Aquila',    'NT'),
  ('What was the name of Timothy''s grandmother, known for her faith?',                              'Lois',                    'NT'),
  ('In what city was Paul born?',                                                                   'Tarsus',                  'NT'),
  ('What was the name of the pool where Jesus healed a man who had been sick for 38 years?',        'Bethesda',                'NT'),
  ('What was the name of the servant girl who left Peter standing at the door after his escape?',   'Rhoda',                   'NT'),
  ('Who was the Roman emperor when Jesus was born?',                                                'Caesar Augustus',         'NT')
) as v(text, answer, testament)
where not exists (select 1 from questions q where q.text = v.text);

insert into questions (text, correct_answer, difficulty, format, choices, testament)
select v.text, v.answer, 'double', 'multiple_choice', v.choices::jsonb, v.testament
from (values
  ('Who was Ruth''s mother-in-law?',                                        'Naomi',                        '["A) Orpah","B) Naomi","C) Leah","D) Miriam"]',                                          'OT'),
  ('Who was Isaac''s wife?',                                                'Rebekah',                      '["A) Rachel","B) Leah","C) Rebekah","D) Sarah"]',                                        'OT'),
  ('How many plagues did God send on Egypt?',                              'Ten',                          '["A) Seven","B) Ten","C) Twelve","D) Forty"]',                                           'OT'),
  ('What did Gideon use to ask God for a sign?',                           'A wool fleece',                '["A) A wool fleece","B) A clay jar","C) A trumpet","D) A sword"]',                       'OT'),
  ('Who was Moses'' sister?',                                               'Miriam',                       '["A) Deborah","B) Hannah","C) Miriam","D) Zipporah"]',                                   'OT'),
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
  ('What was Matthew''s other name?',                                       'Levi',                         '["A) Simon","B) Levi","C) Nathanael","D) Silas"]',                                       'NT'),
  ('What was Peter''s name before Jesus renamed him?',                      'Simon',                        '["A) Andrew","B) Simon","C) James","D) Philip"]',                                        'NT'),
  ('What did the prodigal son end up feeding when his money ran out?',     'Pigs',                         '["A) Sheep","B) Camels","C) Pigs","D) Chickens"]',                                       'NT'),
  ('How many lepers did Jesus heal when only one came back to thank him?', 'Ten',                          '["A) Two","B) Seven","C) Ten","D) Twelve"]',                                             'NT'),
  ('What did Peter find in the mouth of a fish to pay the temple tax?',    'A coin',                       '["A) A pearl","B) A coin","C) A ring","D) A key"]',                                      'NT'),
  ('What kind of tree did Jesus curse for having no fruit?',               'A fig tree',                   '["A) An olive tree","B) A fig tree","C) A palm tree","D) A sycamore tree"]',            'NT'),
  ('Who came to Jesus at night to ask about being born again?',            'Nicodemus',                    '["A) Nicodemus","B) Zacchaeus","C) Joseph of Arimathea","D) Lazarus"]',                  'NT'),
  ('What is the name of the hill where Jesus was crucified?',              'Golgotha',                     '["A) Mount Sinai","B) Golgotha","C) Mount Carmel","D) Gethsemane"]',                     'NT'),
  ('What feast were Jesus and his disciples celebrating at the Last Supper?','Passover',                   '["A) Passover","B) Pentecost","C) Tabernacles","D) Purim"]',                             'NT'),
  ('How many days after the resurrection did Jesus ascend into heaven?',   'Forty',                        '["A) Three","B) Seven","C) Forty","D) Fifty"]',                                          'NT'),
  ('What did the Philippian jailer ask Paul and Silas?',                   'What must I do to be saved?',  '["A) Who are you?","B) Why are you singing?","C) What must I do to be saved?","D) Where is your God?"]', 'NT'),
  ('Which of Paul''s traveling companions was a doctor?',                   'Luke',                         '["A) Timothy","B) Silas","C) Luke","D) Mark"]',                                          'NT')
) as v(text, answer, choices, testament)
where not exists (select 1 from questions q where q.text = v.text);
