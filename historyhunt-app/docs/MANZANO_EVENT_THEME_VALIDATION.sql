UPDATE public.campaigns
SET
  event_subtitle = NULL,
  event_logo_image_url = '/events/manzano/monty-logo.png',
  event_primary_color = '#4B2E83',
  event_secondary_color = '#E5E7EB',
  event_accent_color = '#B9A7D6'
WHERE slug = 'manzano-high-school-class-of-1986-40th-reunion'
RETURNING
  slug,
  event_logo_image_url,
  event_primary_color,
  event_secondary_color,
  event_accent_color;
