update public.campaigns
set
  event_welcome_title = 'Welcome to the Class of 1986 History Hunt Games!',
  event_welcome_message = E'Brought to you by Mac & Sac Enterprises and your classmate, Dave MacCutcheon.\n\nGet out your Scepter, grab an almanac, then register and play. Phone a friend if needed. We hope you enjoy the journey back in time.\n\nPlay all five games in any order. Your best completed score from each game counts toward the overall leaderboard. A King and Queen of the Hunt will be announced at the Sunday Cookout and posted online.',
  event_welcome_note = 'Any errors are Claude’s fault.'
where slug = 'manzano-high-school-class-of-1986-40th-reunion';

select
  slug,
  event_welcome_title,
  event_welcome_message,
  event_welcome_note
from public.campaigns
where slug = 'manzano-high-school-class-of-1986-40th-reunion';
