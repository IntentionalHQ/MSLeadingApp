/* v12_6_optional_retier.sql
   OPTIONAL. Bible Baseball clean-up, UPDATEs only: the 43 mis-tagged home runs become singles; three unplayable rows and one awkward Price Is Right question are deactivated (not deleted). Run before or after the others, it names exact rows.
   Adds only, nothing deleted. Safe to re-run. Paste the whole file and Run. */

update questions
   set difficulty = 'single'
 where difficulty = 'home_run'
   and replace(text, chr(8217), '''') in (
     'Moses led Israel out of Egypt. Who led them into Canaan?',
     'David defeated Goliath. Who defeated the prophets of Baal?',
     'Who replaced Judas Iscariot among the apostles?',
     'What book contains the Sermon on the Mount?',
     'What chapter contains the Hall of Faith?',
     'What Psalm begins "The Lord is my shepherd"?',
     'What chapter contains the Love Chapter?',
     'What chapter contains the Fruit of the Spirit?',
     'Which prophet confronted David about Bathsheba?',
     'Which judge defeated Midian with 300 men?',
     'Which prophet was taken to heaven in a whirlwind?',
     'Which prophet followed Elijah?',
     'Which disciple was a tax collector?',
     'Which disciple doubted Jesus'' resurrection?',
     'Which disciple denied Jesus three times?',
     'Which disciple betrayed Jesus?',
     'Which king threw Daniel into the lions'' den?',
     'Which king built the temple?',
     'Which queen saved the Jewish people?',
     'Which governor sentenced Jesus to death?',
     'What city did Jonah preach to?',
     'What city''s walls fell after marching around them?',
     'What city was Jesus born in?',
     'What city did Jesus grow up in?',
     'What mountain did Moses receive the Ten Commandments on?',
     'What mountain did Elijah challenge the prophets of Baal on?',
     'What river was Jesus baptized in?',
     'What river did Israel cross into the Promised Land?',
     'How many years did Israel wander in the wilderness?',
     'How many disciples did Jesus choose?',
     'How many days did Jesus fast in the wilderness?',
     'How many days was Jonah in the fish?',
     'How many loaves and fish fed the 5,000?',
     'How many people were on Noah''s ark from his family?',
     'What miracle happened at Cana?',
     'What happened on the Day of Pentecost?',
     'What happened to Saul on the Damascus Road?',
     'What happened to Ananias and Sapphira after lying?',
     'What happened to Lazarus after four days in the tomb?',
     'Which two commandments did Jesus say were greatest?',
     'What are the two ordinances most churches practice?',
     'What are the two parts of the Bible?',
     'What are the two greatest themes of the Bible?'
   );

update questions
   set active = false
 where replace(text, chr(8217), '''') in (
     'You of little faith, why did you doubt?',
     'What city was destroyed after Jonah warned its people and they repented?',
     'What was the name of the man Paul healed in Lystra who had never walked?'
   );

update pir_questions
   set active = false
 where question = 'How many concubines did Solomon have?';
