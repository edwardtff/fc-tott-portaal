import { supabase } from "./supabaseClient";

// ============================================================
// Players
// ============================================================
export async function fetchPlayers() {
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) throw error;
  return data || [];
}

export async function findPlayerByCredentials(username, password) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .ilike("username", username.trim())
    .eq("password", password)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPlayerById(id) {
  const { data, error } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePlayer(id, fields) {
  const { error } = await supabase.from("players").update(fields).eq("id", id);
  if (error) throw error;
}

export async function setPlayerActive(id, active) {
  const { error } = await supabase.from("players").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deletePlayer(id) {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

export async function createPlayer({ name, username, password, role }) {
  const { data, error } = await supabase
    .from("players")
    .insert({ name, username, password, role })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("stats").insert({ player_id: data.id, goals: 0, assists: 0 });
  return data;
}

export async function usernameExists(username) {
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .ilike("username", username.trim())
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// ============================================================
// Matches
// ============================================================
export async function fetchMatches() {
  const { data, error } = await supabase.from("matches").select("*").order("match_date");
  if (error) throw error;
  return data || [];
}

export async function createMatch({ category, opponent, date, location }) {
  const { data, error } = await supabase
    .from("matches")
    .insert({ category, opponent, match_date: date, location })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMatch(id) {
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) throw error;
}

export async function updateMatchScore(matchId, ownScore, opponentScore) {
  const { error } = await supabase
    .from("matches")
    .update({ own_score: ownScore, opponent_score: opponentScore })
    .eq("id", matchId);
  if (error) throw error;
}

// ============================================================
// Attendance
// ============================================================
export async function fetchAttendance() {
  const { data, error } = await supabase.from("attendance").select("*");
  if (error) throw error;
  return data || [];
}

export async function setAttendanceStatus({ matchId, playerId, status, reason }) {
  const { error } = await supabase.from("attendance").upsert(
    { match_id: matchId, player_id: playerId, status, reason: reason || "", updated_at: new Date().toISOString() },
    { onConflict: "match_id,player_id" }
  );
  if (error) throw error;
}

// ============================================================
// Lineups
// ============================================================
export async function fetchLineups() {
  const { data, error } = await supabase.from("lineups").select("*");
  if (error) throw error;
  return data || [];
}

export async function saveLineup(matchId, keeperId, fielderIds) {
  const { error: delErr } = await supabase.from("lineups").delete().eq("match_id", matchId);
  if (delErr) throw delErr;

  const rows = [];
  if (keeperId) rows.push({ match_id: matchId, player_id: keeperId, role: "keeper" });
  fielderIds.forEach((pid) => rows.push({ match_id: matchId, player_id: pid, role: "veldspeler" }));

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("lineups").insert(rows);
    if (insErr) throw insErr;
  }
}

// ============================================================
// Rules
// ============================================================
export async function fetchRules() {
  const { data, error } = await supabase.from("rules").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

export async function addRule(text, sortOrder) {
  const { error } = await supabase.from("rules").insert({ text, sort_order: sortOrder });
  if (error) throw error;
}

export async function deleteRule(id) {
  const { error } = await supabase.from("rules").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Fees
// ============================================================
export async function fetchFeeTypes() {
  const { data, error } = await supabase.from("fee_types").select("*");
  if (error) throw error;
  return data || [];
}

export async function fetchFeePayments() {
  const { data, error } = await supabase.from("fee_payments").select("*");
  if (error) throw error;
  return data || [];
}

export async function toggleFeePayment(playerId, feeTypeId, paid) {
  const { error } = await supabase.from("fee_payments").upsert(
    { player_id: playerId, fee_type_id: feeTypeId, paid },
    { onConflict: "player_id,fee_type_id" }
  );
  if (error) throw error;
}

// ============================================================
// Fine pot
// ============================================================
export async function fetchFineRules() {
  const { data, error } = await supabase.from("fine_rules").select("*");
  if (error) throw error;
  return data || [];
}

export async function addFineRule(label, amount) {
  const { error } = await supabase.from("fine_rules").insert({ label, amount });
  if (error) throw error;
}

export async function deleteFineRule(id) {
  const { error } = await supabase.from("fine_rules").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchFines() {
  const { data, error } = await supabase.from("fines").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function assignFine(playerId, fineRuleId, label, amount) {
  const { error } = await supabase
    .from("fines")
    .insert({ player_id: playerId, fine_rule_id: fineRuleId, label, amount });
  if (error) throw error;
}

export async function deleteFine(id) {
  const { error } = await supabase.from("fines").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Goals
// ============================================================
export async function fetchGoals() {
  const { data, error } = await supabase.from("goals").select("*");
  if (error) throw error;
  return data || [];
}

export async function addGoal(matchId, scorerId, assistId) {
  const { error } = await supabase
    .from("goals")
    .insert({ match_id: matchId, scorer_id: scorerId, assist_id: assistId || null });
  if (error) throw error;
}

export async function deleteGoal(id) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}


// ============================================================
// Shared club content: Updates, Videos, Branding, Sponsors, Requests, Notifications
// These are small text/URL rows and are suitable for the Supabase free plan.
// ============================================================
export async function fetchClubPosts() {
  const { data, error } = await supabase
    .from("club_posts")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body || "",
    category: row.category || "Mededeling",
    images: Array.isArray(row.images) ? row.images : [],
    author_id: row.author_id,
    author_name: row.author_name || "Team",
    author_photo: row.author_photo || "",
    pinned: !!row.pinned,
    public_visible: row.public_visible !== false,
    created_at: row.created_at,
  }));
}

export async function saveClubPosts(posts = []) {
  const rows = posts.map((post) => ({
    id: post.id,
    title: post.title || "Clubupdate",
    body: post.body || "",
    category: post.category || "Mededeling",
    images: Array.isArray(post.images) ? post.images : [],
    author_id: post.author_id || null,
    author_name: post.author_name || "Team",
    author_photo: post.author_photo || "",
    pinned: !!post.pinned,
    public_visible: post.public_visible !== false,
    created_at: post.created_at || new Date().toISOString(),
  }));

  const { error: delErr } = await supabase.from("club_posts").delete().neq("id", "__never__");
  if (delErr) throw delErr;
  if (rows.length === 0) return;

  const { error: insErr } = await supabase.from("club_posts").insert(rows);
  if (insErr) throw insErr;
}

export async function fetchClubVideos() {
  const { data, error } = await supabase
    .from("club_videos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    youtubeUrl: row.youtube_url,
    description: row.description || "",
    match_id: row.match_id || "",
    match_label: row.match_label || "Wedstrijdvideo",
    public_visible: row.public_visible !== false,
    created_by: row.created_by || null,
    created_at: row.created_at,
  }));
}

export async function saveClubVideos(videos = []) {
  const rows = videos.map((video) => ({
    id: video.id,
    title: video.title || "Wedstrijdvideo",
    youtube_url: video.youtubeUrl || video.youtube_url,
    description: video.description || "",
    match_id: video.match_id || null,
    match_label: video.match_label || "Wedstrijdvideo",
    public_visible: video.public_visible !== false,
    created_by: video.created_by || null,
    created_at: video.created_at || new Date().toISOString(),
  })).filter((row) => row.youtube_url);

  const { error: delErr } = await supabase.from("club_videos").delete().neq("id", "__never__");
  if (delErr) throw delErr;
  if (rows.length === 0) return;

  const { error: insErr } = await supabase.from("club_videos").insert(rows);
  if (insErr) throw insErr;
}

export async function fetchClubBranding() {
  const { data, error } = await supabase
    .from("club_branding")
    .select("*")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    logoUrl: data.logo_url || "",
    loginBannerUrl: data.login_banner_url || "",
    bannerUrl: data.banner_url || "",
    sponsorText: data.sponsor_text || "",
  };
}

export async function saveClubBranding(branding = {}) {
  const { error } = await supabase.from("club_branding").upsert({
    id: "main",
    logo_url: branding.logoUrl || "",
    login_banner_url: branding.loginBannerUrl || "",
    banner_url: branding.bannerUrl || branding.dashboardBannerUrl || "",
    sponsor_text: branding.sponsorText || "",
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function fetchClubSponsors() {
  const { data, error } = await supabase
    .from("club_sponsors")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addClubSponsor(sponsor = {}) {
  const { data, error } = await supabase
    .from("club_sponsors")
    .insert({
      name: sponsor.name || "Sponsor",
      logo_url: sponsor.logo_url || sponsor.logoUrl || "",
      website_url: sponsor.website_url || sponsor.websiteUrl || "",
      description: sponsor.description || "",
      sort_order: Number(sponsor.sort_order || sponsor.sortOrder || 100),
      active: sponsor.active !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClubSponsor(id, fields = {}) {
  const payload = {
    name: fields.name,
    logo_url: fields.logo_url || fields.logoUrl,
    website_url: fields.website_url || fields.websiteUrl,
    description: fields.description,
    sort_order: fields.sort_order !== undefined ? Number(fields.sort_order) : undefined,
    active: fields.active,
  };
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  const { error } = await supabase.from("club_sponsors").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteClubSponsor(id) {
  const { error } = await supabase.from("club_sponsors").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchFriendlyMatchRequests() {
  const { data, error } = await supabase
    .from("friendly_match_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createFriendlyMatchRequest(request = {}) {
  const { data, error } = await supabase
    .from("friendly_match_requests")
    .insert({
      team_name: request.team_name || request.teamName || "",
      contact_name: request.contact_name || request.contactName || "",
      email: request.email || "",
      phone: request.phone || "",
      preferred_date: request.preferred_date || request.preferredDate || null,
      message: request.message || "",
      status: "nieuw",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFriendlyMatchRequestStatus(id, status) {
  const { error } = await supabase.from("friendly_match_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteFriendlyMatchRequest(id) {
  const { error } = await supabase.from("friendly_match_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchNotificationReads(playerId) {
  if (!playerId) return [];
  const { data, error } = await supabase
    .from("club_notification_reads")
    .select("notification_key, read_at")
    .eq("player_id", playerId);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(playerId, notificationKey) {
  if (!playerId || !notificationKey) return;
  const { error } = await supabase.from("club_notification_reads").upsert(
    { player_id: playerId, notification_key: notificationKey, read_at: new Date().toISOString() },
    { onConflict: "player_id,notification_key" }
  );
  if (error) throw error;
}
