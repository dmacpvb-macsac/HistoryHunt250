import { supabase } from "@/lib/supabase";

export async function resolveGameFromQr(qrSlug: string) {
  const { data: venueRaw, error: venueError } = await supabase
    .from("venues")
    .select(`
      venue_id,
      slug,
      name,
      city,
      state,
      qr_slug,
      active,
      registration_enabled,
      quiz_enabled,
      reward_enabled,
      campaign_id,
      campaigns (
        campaign_id,
        slug,
        title,
        active
      )
    `)
    .eq("qr_slug", qrSlug)
    .eq("active", true)
    .single();

  if (venueError || !venueRaw) {
    throw new Error(`No active venue found for QR slug: ${qrSlug}`);
  }

  const campaign = Array.isArray(venueRaw.campaigns)
    ? venueRaw.campaigns[0]
    : venueRaw.campaigns;

  if (!campaign) {
    throw new Error(`No campaign found for QR slug: ${qrSlug}`);
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(`
      game_id,
      slug,
      title,
      description,
      state,
      city,
      question_count,
      total_points,
      participant_badge_url,
      perfect_score_badge_url,
      active
    `)
    .eq("campaign_id", venueRaw.campaign_id)
    .eq("active", true)
    .single();

  if (gameError || !game) {
    throw new Error(`No active game found for QR slug: ${qrSlug}`);
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select(`
      question_id,
      sort_order,
      lyric,
      lyric_prompt,
      question_text,
      choice_a,
      choice_b,
      choice_c,
      choice_d,
      correct_answer,
      educational_fact,
      lyric_meaning,
      category,
      difficulty,
      points,
      is_bonus,
      youtube_prompt,
      active
    `)
    .eq("game_id", game.game_id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (questionsError || !questions) {
    throw new Error(`Questions not found for game: ${game.slug}`);
  }

  const { campaigns, ...venue } = venueRaw;

  return {
    qrSlug,
    venue,
    campaign,
    game,
    questions,
    permissions: {
      registrationRequired: true,
      quizEnabled: venue.quiz_enabled,
      rewardsEnabled: venue.reward_enabled,
    },
  };
}