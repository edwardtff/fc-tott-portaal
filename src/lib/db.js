import { supabase } from "./supabaseClient";

// ============================================================
// Players
// ============================================================
export async function fetchPlayers() {
  const { data, error } = await supabase.from("players").select("*").order("name");
  if (error) throw error;
  return data;
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
  // ensure a stats row exists
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
  return data;
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

// ============================================================
// Attendance
// ============================================================
export async function fetchAttendance() {
  const { data, error } = await supabase.from("attendance").select("*");
  if (error) throw error;
  return data;
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
  return data;
}

export async function saveLineup(matchId, keeperId, fielderIds) {
  // Replace strategy: delete existing rows for this match, then insert fresh ones.
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
  return data;
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
  return data;
}

export async function fetchFeePayments() {
  const { data, error } = await supabase.from("fee_payments").select("*");
  if (error) throw error;
  return data;
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
  return data;
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
  return data;
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
// Stats
// ============================================================
export async function fetchStats() {
  const { data, error } = await supabase.from("stats").select("*");
  if (error) throw error;
  return data;
}

export async function adjustStat(playerId, field, delta) {
  const { data: current, error: readErr } = await supabase
    .from("stats")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();
  if (readErr) throw readErr;
  const base = current || { player_id: playerId, goals: 0, assists: 0 };
  const next = Math.max(0, (base[field] || 0) + delta);
  const { error } = await supabase.from("stats").upsert({ ...base, [field]: next });
  if (error) throw error;
}
