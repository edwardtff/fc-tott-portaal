import React, { useState, useEffect } from "react";
import {
  Calendar, MapPin, Clock, ShieldCheck, Wallet, ShirtIcon, GlassWater, Swords,
  Check, X, Plus, Trash2, ChevronRight, Users, AlertCircle, HelpCircle,
  ChevronDown, ChevronUp, Lock, LogOut, UserCog, UserPlus, UserMinus,
  Goal, Handshake, Star, Shield, Camera, Eye, EyeOff, Coins, Gavel,
  Repeat, Trophy, Flag, Award, Bell, Newspaper, MessageCircle, Pin, Settings,
} from "lucide-react";
import * as db from "./lib/db";

// ============================================================
// Constants
// ============================================================
const MATCH_TYPES = [
  { key: "oefenwedstrijd", label: "Oefenwedstrijd", deadlineHours: 24, icon: "Repeat", color: "#5B7C99", bg: "#E7EEF3" },
  { key: "groepsactiviteit", label: "Groepsactiviteit", deadlineHours: 24, icon: "Users", color: "#8A6FB0", bg: "#EFE9F6" },
  { key: "toernooi", label: "Toernooi", deadlineHours: 48, icon: "Trophy", color: "#B0822E", bg: "#F6EEDD" },
  { key: "competitie", label: "Competitie", deadlineHours: 48, icon: "Flag", color: "#4A5D23", bg: "#E8EDDD" },
  { key: "beker", label: "Bekerwedstrijd", deadlineHours: 48, icon: "Award", color: "#C7401F", bg: "#FBE7E1" },
];
const matchTypeInfo = (key) => MATCH_TYPES.find((t) => t.key === key) || MATCH_TYPES[0];
const MATCH_TYPE_ICONS = { Repeat, Users, Trophy, Flag, Award };

const ATTENDANCE_STATUSES = [
  { key: "aanwezig", label: "Aanwezig", icon: Check, color: "var(--success)", bg: "var(--accent-soft)", needsReason: false },
  { key: "afwezig", label: "Afwezig", icon: X, color: "var(--warn)", bg: "var(--warn-soft)", needsReason: true },
  { key: "twijfel", label: "Weet ik nog niet", icon: HelpCircle, color: "#A6790A", bg: "#F6EEDD", needsReason: true },
];

const FEE_ICONS = { inschrijving: Users, kleding: ShirtIcon, drinken: GlassWater, oefenwedstrijden: Swords };

const POSITIONS = ["Keeper", "Verdediger", "Aanvaller", "Allround"];

// ============================================================
// Utility
// ============================================================
function formatDateNL(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }) +
    " · " + d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}
function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}
function useCountdown(targetIso) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      setLeft(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000 * 30);
    return () => clearInterval(id);
  }, [targetIso]);
  if (left === null) return "—";
  const days = Math.floor(left / (1000 * 60 * 60 * 24));
  const hours = Math.floor((left / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((left / (1000 * 60)) % 60);
  if (left <= 0) return "Nu";
  return `${days}d ${hours}u ${mins}m`;
}
function deadlinePassed(match) {
  const info = matchTypeInfo(match.category);
  const deadline = new Date(match.match_date).getTime() - info.deadlineHours * 60 * 60 * 1000;
  return Date.now() > deadline;
}
function deadlineLabel(match) {
  const info = matchTypeInfo(match.category);
  const deadline = new Date(new Date(match.match_date).getTime() - info.deadlineHours * 60 * 60 * 1000);
  return deadline.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) +
    " " + deadline.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

const SESSION_KEY = "tott_session_player_id";
const LOCAL_POSTS_KEY = "tott_local_club_posts_v1";
const LOCAL_BRANDING_KEY = "tott_local_branding_v1";

const DEFAULT_BRANDING = {
  logoUrl: "",
  loginBannerUrl: "",
  dashboardBannerUrl: "",
  sponsorImageUrl: "",
  clubShortName: "FC TOTT",
};

function readLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function useLocalJsonState(key, fallback) {
  const [value, setValue] = useState(() => readLocalJson(key, fallback));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Kon lokale clubdata niet opslaan", error);
    }
  }, [key, value]);

  return [value, setValue];
}

function normalizeImages(images = []) {
  return images.map((img) => String(img || "").trim()).filter(Boolean).slice(0, 6);
}

function makePostId() {
  return `post_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ============================================================
// App shell
// ============================================================
const NAV = [
  { key: "wedstrijden", label: "Wedstrijden", icon: Calendar },
  { key: "updates", label: "Updates", icon: Newspaper },
  { key: "profiel", label: "Profiel", icon: UserCog },
  { key: "boetepot", label: "Boetepot", icon: Coins },
  { key: "huisregels", label: "Huisregels", icon: ShieldCheck },
  { key: "financien", label: "Financiën", icon: Wallet },
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState("wedstrijden");

  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rules, setRules] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [goals, setGoals] = useState([]);
  const [fineRules, setFineRules] = useState([]);
  const [fines, setFines] = useState([]);

  const [sessionId, setSessionId] = useState(null);
  const [clubPosts, setClubPosts] = useLocalJsonState(LOCAL_POSTS_KEY, []);
  const [branding, setBranding] = useLocalJsonState(LOCAL_BRANDING_KEY, DEFAULT_BRANDING);

  const reloadAll = async () => {
    const [p, m, r, ft, fp, att, lu, gl, fr, fn] = await Promise.all([
      db.fetchPlayers(), db.fetchMatches(), db.fetchRules(), db.fetchFeeTypes(),
      db.fetchFeePayments(), db.fetchAttendance(), db.fetchLineups(), db.fetchGoals(),
      db.fetchFineRules(), db.fetchFines(),
    ]);
    setPlayers(p); setMatches(m); setRules(r); setFeeTypes(ft);
    setFeePayments(fp); setAttendance(att); setLineups(lu); setGoals(gl);
    setFineRules(fr); setFines(fn);
    return p;
  };

  useEffect(() => {
    (async () => {
      try {
        const p = await reloadAll();
        const storedId = localStorage.getItem(SESSION_KEY);
        if (storedId && p.some((pl) => pl.id === storedId && pl.active)) {
          setSessionId(storedId);
        }
      } catch (e) {
        console.error(e);
        setLoadError(e.message || "Kon geen verbinding maken met de database.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const me = players.find((p) => p.id === sessionId);
  const isAdmin = me?.role === "admin";

  const nextMatch = matches
    .filter((m) => new Date(m.match_date).getTime() > Date.now())
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0];
  const countdown = useCountdown(nextMatch?.match_date);

  const login = (id) => {
    setSessionId(id);
    localStorage.setItem(SESSION_KEY, id);
  };
  const logout = () => {
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
    setTab("wedstrijden");
  };

  const changeTab = (nextTab) => {
    setTab(nextTab);

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches) {
      window.setTimeout(() => {
        document.querySelector(".dreelio-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  // helper maps for attendance/lineups grouped by match
  const attendanceByMatch = {};
  attendance.forEach((a) => {
    attendanceByMatch[a.match_id] = attendanceByMatch[a.match_id] || {};
    attendanceByMatch[a.match_id][a.player_id] = { status: a.status, reason: a.reason };
  });
  const lineupsByMatch = {};
  lineups.forEach((l) => {
    lineupsByMatch[l.match_id] = lineupsByMatch[l.match_id] || { keeper: null, fielders: [] };
    if (l.role === "keeper") lineupsByMatch[l.match_id].keeper = l.player_id;
    else lineupsByMatch[l.match_id].fielders.push(l.player_id);
  });
  const feesByPlayer = {};
  feePayments.forEach((f) => {
    feesByPlayer[f.player_id] = feesByPlayer[f.player_id] || {};
    feesByPlayer[f.player_id][f.fee_type_id] = f.paid;
  });
  const statsByPlayer = {};
  players.forEach((p) => { statsByPlayer[p.id] = { goals: 0, assists: 0 }; });
  goals.forEach((g) => {
    if (statsByPlayer[g.scorer_id]) statsByPlayer[g.scorer_id].goals += 1;
    if (g.assist_id && statsByPlayer[g.assist_id]) statsByPlayer[g.assist_id].assists += 1;
  });
  const goalsByMatch = {};
  goals.forEach((g) => {
    goalsByMatch[g.match_id] = goalsByMatch[g.match_id] || [];
    goalsByMatch[g.match_id].push(g);
  });

  if (loading) {
    return (
      <div style={styles.app} className="tott-app dreelio-app">
        <style>{globalCss + dreelioDashboardCss}</style>
        <div style={styles.loadingScreen}>Laden…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.app} className="tott-app dreelio-app">
        <style>{globalCss + dreelioDashboardCss}</style>
        <div style={styles.loadingScreen}>
          <AlertCircle size={22} style={{ marginBottom: 10, color: "var(--warn)" }} />
          <div>Kon geen verbinding maken met de database.</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>{loadError}</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
            Controleer of VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY correct zijn ingesteld.
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div style={styles.app} className="tott-app dreelio-app">
        <style>{globalCss + dreelioDashboardCss}</style>
        <Header branding={branding} />
        <LoginScreen players={players} onLogin={login} branding={branding} />
        <footer style={styles.footer}>FC TOTT · Sponsored By Nola Marketing (website, branding en marketing)</footer>
      </div>
    );
  }

  const myOpenCount = feeTypes.filter((f) => !(feesByPlayer[me.id] || {})[f.id]).length;
  const potTotal = fines.reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div style={styles.app} className="tott-app dreelio-app">
      <style>{globalCss + dreelioDashboardCss}</style>

      <div className="dreelio-shell">
        <DreelioSidebar
          me={me}
          tab={tab}
          setTab={changeTab}
          onLogout={logout}
          myOpenCount={myOpenCount}
          potTotal={potTotal}
          postsCount={clubPosts.length}
          nextMatch={nextMatch}
          attendanceByMatch={attendanceByMatch}
          branding={branding}
        />

        <div className="dreelio-content">
          <div className="dreelio-mobile-topbar">
            <Header me={me} onLogout={logout} branding={branding} />
          </div>

          <Top3
            nextMatch={nextMatch}
            countdown={countdown}
            myOpenCount={myOpenCount}
            potTotal={potTotal}
            me={me}
            players={players}
            attendanceByMatch={attendanceByMatch}
            setTab={changeTab}
            posts={clubPosts}
            branding={branding}
            statsByPlayer={statsByPlayer}
          />

          <main style={styles.main} className="tott-main dreelio-main">
            {tab === "wedstrijden" && (
              <MatchesTab
                matches={matches} players={players}
                attendanceByMatch={attendanceByMatch} lineupsByMatch={lineupsByMatch}
                goalsByMatch={goalsByMatch}
                me={me} isAdmin={isAdmin} reloadAll={reloadAll}
              />
            )}
            {tab === "updates" && (
              <UpdatesTab
                posts={clubPosts}
                setPosts={setClubPosts}
                me={me}
                players={players}
                isAdmin={isAdmin}
              />
            )}
            {tab === "profiel" && (
              <ProfileTab
                me={me} players={players}
                attendanceByMatch={attendanceByMatch} matches={matches}
                statsByPlayer={statsByPlayer} isAdmin={isAdmin} reloadAll={reloadAll}
              />
            )}
            {tab === "boetepot" && (
              <FinePotTab fineRules={fineRules} fines={fines} players={players} isAdmin={isAdmin} reloadAll={reloadAll} />
            )}
            {tab === "huisregels" && (
              <RulesTab rules={rules} isAdmin={isAdmin} reloadAll={reloadAll} />
            )}
            {tab === "financien" && (
              <FinanceTab players={players} feeTypes={feeTypes} feesByPlayer={feesByPlayer} me={me} isAdmin={isAdmin} reloadAll={reloadAll} />
            )}
            {isAdmin && <AdminPanel players={players} reloadAll={reloadAll} branding={branding} setBranding={setBranding} />}
          </main>

          <footer style={styles.footer} className="dreelio-footer">FC TOTT · Sponsored By Nola Marketing (website, branding en marketing)</footer>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Login
// ============================================================
function LoginScreen({ players, onLogin, branding = DEFAULT_BRANDING }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const found = await db.findPlayerByCredentials(username, password);
      if (!found) {
        setError("Gebruikersnaam of wachtwoord klopt niet.");
        return;
      }
      if (!found.active) {
        setError("Dit account is door een beheerder geblokkeerd. Neem contact op met het bestuur.");
        return;
      }
      onLogin(found.id);
    } catch (err) {
      setError("Kon niet inloggen: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.loginWrap}>
      <form style={styles.loginCard} className="dreelio-login-card" onSubmit={submit}>
        {branding.loginBannerUrl && (
          <img src={branding.loginBannerUrl} alt="Clubbeeld" className="dreelio-login-banner" />
        )}
        <div style={styles.loginIcon}><Lock size={20} /></div>
        <div style={styles.loginTitle}>Inloggen bij FC TOTT</div>
        <div style={styles.loginSub}>Gebruik de inloggegevens die je van het bestuur hebt gekregen.</div>

        <label style={styles.loginLabel}>Gebruikersnaam</label>
        <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)}
          autoComplete="username" placeholder="bijv. daan" />

        <label style={styles.loginLabel}>Wachtwoord</label>
        <div style={styles.pwRow}>
          <input style={{ ...styles.input, flex: 1 }} type={showPw ? "text" : "password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" placeholder="••••••" />
          <button type="button" style={styles.pwToggle} onClick={() => setShowPw((s) => !s)} aria-label="Wachtwoord tonen">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <div style={styles.loginError}><AlertCircle size={14} /> {error}</div>}

        <button type="submit" style={styles.primaryBtnFull} disabled={busy}>
          {busy ? "Bezig…" : "Inloggen"}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// Header / Top bar
// ============================================================
function Header({ me, onLogout, branding = DEFAULT_BRANDING }) {
  return (
    <header style={styles.header} className="tott-header">
      <div style={styles.crest} className="tott-crest">
        {branding.logoUrl ? <img src={branding.logoUrl} alt="Clublogo" className="tott-crest-img" /> : "TOTT"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={styles.clubName} className="tott-clubname">FC Talk Of The Town</div>
        <div style={styles.clubSub} className="tott-clubsub">Zaalvoetbal · Clubportaal</div>
      </div>
      {me && (
        <button style={styles.logoutBtn} onClick={onLogout} aria-label="Uitloggen">
          <LogOut size={16} />
        </button>
      )}
    </header>
  );
}


function DreelioSidebar({ me, tab, setTab, onLogout, myOpenCount, potTotal, postsCount = 0, nextMatch, attendanceByMatch = {}, branding = DEFAULT_BRANDING }) {
  const needsMatchResponse = !!(nextMatch && me && !attendanceByMatch[nextMatch.id]?.[me.id]?.status);
  const badgeFor = (key) => {
    if (key === "financien" && myOpenCount > 0) return myOpenCount;
    if (key === "updates" && postsCount > 0) return Math.min(postsCount, 9);
    if (key === "wedstrijden" && needsMatchResponse) return "!";
    return null;
  };
  return (
    <aside className="dreelio-sidebar" aria-label="Hoofdnavigatie">
      <div className="dreelio-sidebar-brand">
        <div className="dreelio-sidebar-logo">{branding.logoUrl ? <img src={branding.logoUrl} alt="Clublogo" /> : "T"}</div>
        <div>
          <div className="dreelio-sidebar-title">FC TOTT</div>
          <div className="dreelio-sidebar-sub">Clubportaal</div>
        </div>
      </div>

      <div className="dreelio-sidebar-group-label">Menu</div>
      <nav className="dreelio-sidebar-nav">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.key;
          return (
            <button
              key={n.key}
              type="button"
              onClick={() => setTab(n.key)}
              className={`dreelio-side-link ${active ? "is-active" : ""}`}
            >
              <span className="dreelio-side-icon"><Icon size={17} /></span>
              <span>{n.label}</span>
              {badgeFor(n.key) && <span className="dreelio-nav-badge">{badgeFor(n.key)}</span>}
            </button>
          );
        })}
      </nav>

      <div className="dreelio-sidebar-card">
        <div className="dreelio-mini-label">Vandaag</div>
        <div className="dreelio-mini-row">
          <span>Open betalingen</span>
          <strong>{myOpenCount}</strong>
        </div>
        <div className="dreelio-mini-row">
          <span>Boetepot</span>
          <strong>€{potTotal}</strong>
        </div>
      </div>

      <div className="dreelio-sidebar-spacer" />

      <div className="dreelio-profile-card">
        <div className="dreelio-profile-avatar">
          {me?.photo ? <img src={me.photo} alt={me.name} /> : (me?.name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="dreelio-profile-copy">
          <div className="dreelio-profile-name">{me?.name}</div>
          <div className="dreelio-profile-role">{me?.role === "admin" ? "Admin" : "Speler"}</div>
        </div>
        <button className="dreelio-logout" type="button" onClick={onLogout} aria-label="Uitloggen">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

function Top3({ nextMatch, countdown, myOpenCount, potTotal, me, players = [], attendanceByMatch = {}, setTab, posts = [], branding = DEFAULT_BRANDING, statsByPlayer = {} }) {
  const category = nextMatch ? matchTypeInfo(nextMatch.category) : null;
  const firstName = (me?.name || "speler").split(" ")[0];
  const activePlayers = players.filter((p) => p.active !== false);
  const nextAttendance = nextMatch ? attendanceByMatch[nextMatch.id] || {} : {};
  const presentPlayers = activePlayers.filter((p) => nextAttendance[p.id]?.status === "aanwezig");
  const absentPlayers = activePlayers.filter((p) => nextAttendance[p.id]?.status === "afwezig");
  const unsurePlayers = activePlayers.filter((p) => nextAttendance[p.id]?.status === "twijfel");
  const myNextStatus = nextMatch && me ? nextAttendance[me.id]?.status : null;
  const myStatusLabel = myNextStatus
    ? ATTENDANCE_STATUSES.find((s) => s.key === myNextStatus)?.label
    : "Nog niet ingevuld";

  const topScorerEntry = Object.entries(statsByPlayer || {})
    .map(([playerId, stats]) => ({ player: players.find((p) => p.id === playerId), goals: stats?.goals || 0, assists: stats?.assists || 0 }))
    .filter((x) => x.player)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)[0];
  const latestPosts = [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2);
  const notifications = [
    ...(myOpenCount > 0 ? [{ icon: Wallet, text: `Je hebt ${myOpenCount} betaling${myOpenCount === 1 ? "" : "en"} open.`, tab: "financien" }] : []),
    ...(nextMatch && !myNextStatus ? [{ icon: Calendar, text: `Geef je status door voor ${nextMatch.opponent}.`, tab: "wedstrijden" }] : []),
    ...(latestPosts.length ? [{ icon: Newspaper, text: `Nieuwe update: ${latestPosts[0].title || "clubpost"}.`, tab: "updates" }] : []),
  ];
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const teamPulseText = nextMatch
    ? `${presentPlayers.length} aanwezig · ${absentPlayers.length} afwezig · ${unsurePlayers.length} twijfel`
    : "Voeg een wedstrijd toe om de teamstatus live te zien";

  return (
    <>
      <section className="dreelio-overview" aria-label="Dashboard overzicht">
        <div className="dreelio-welcome-card">
          <div className="dreelio-card-topline">
            <span className="dreelio-chip"><span className="dreelio-live-dot" /> Live clubdashboard</span>
            <span className="dreelio-chip muted">{activePlayers.length} spelers</span>
            <button type="button" className="dreelio-bell-button" onClick={() => setNotificationsOpen((open) => !open)}>
              <Bell size={15} />
              {notifications.length > 0 && <span>{notifications.length}</span>}
            </button>
            {notificationsOpen && (
              <div className="dreelio-notification-popover">
                <div className="dreelio-popover-title">Notificaties</div>
                {notifications.length === 0 && <div className="dreelio-popover-empty">Alles is rustig.</div>}
                {notifications.map((note, i) => {
                  const Icon = note.icon;
                  return (
                    <button key={i} type="button" onClick={() => { setNotificationsOpen(false); setTab?.(note.tab); }}>
                      <Icon size={15} />
                      <span>{note.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {branding.dashboardBannerUrl && (
            <div className="dreelio-dashboard-banner">
              <img src={branding.dashboardBannerUrl} alt="Club banner" />
            </div>
          )}
          <div>
            <div className="dreelio-kicker">Hoi {firstName}</div>
            <h1>Je teamstatus in één levend overzicht.</h1>
            <p>Zie direct wat belangrijk is: de volgende wedstrijd, wie zich heeft aangemeld, open betalingen en de stand van de boetepot.</p>
          </div>
          <div className="dreelio-quick-row">
            <button type="button" onClick={() => setTab?.("wedstrijden")} className="dreelio-quick-action">
              <span>Mijn actie</span>
              <strong>{myStatusLabel}</strong>
            </button>
            <button type="button" onClick={() => setTab?.("financien")} className={`dreelio-quick-action ${myOpenCount > 0 ? "needs-attention" : ""}`}>
              <span>Betalingen</span>
              <strong>{myOpenCount > 0 ? `${myOpenCount} open` : "Alles rond"}</strong>
            </button>
          </div>
        </div>

        <article className="dreelio-kpi-card dreelio-match-card">
          <div className="dreelio-kpi-icon"><Calendar size={19} /></div>
          <div className="dreelio-kpi-copy">
            <div className="dreelio-kpi-label">Volgende wedstrijd</div>
            <div className="dreelio-kpi-title">
              {nextMatch ? <>FC TOTT <span>vs</span> {nextMatch.opponent}</> : "Nog niets gepland"}
            </div>
            <div className="dreelio-kpi-meta">
              {nextMatch ? formatDateShort(nextMatch.match_date) : "Voeg een wedstrijd toe"}
              {category ? ` · ${category.label}` : ""}
            </div>
          </div>
        </article>

        <article className={`dreelio-kpi-card ${myOpenCount > 0 ? "is-warning" : ""}`}>
          <div className="dreelio-kpi-icon"><AlertCircle size={19} /></div>
          <div className="dreelio-kpi-copy">
            <div className="dreelio-kpi-label">Betalingen</div>
            <div className="dreelio-kpi-number">{myOpenCount}</div>
            <div className="dreelio-kpi-meta">{myOpenCount === 1 ? "betaling open" : "betalingen open"}</div>
          </div>
        </article>

        <article className="dreelio-kpi-card">
          <div className="dreelio-kpi-icon"><Coins size={19} /></div>
          <div className="dreelio-kpi-copy">
            <div className="dreelio-kpi-label">Boetepot</div>
            <div className="dreelio-kpi-number">€{potTotal}</div>
            <div className="dreelio-kpi-meta">Teamstand</div>
          </div>
        </article>

        <article className="dreelio-kpi-card dreelio-countdown-card">
          <div className="dreelio-kpi-icon"><Trophy size={19} /></div>
          <div className="dreelio-kpi-copy">
            <div className="dreelio-kpi-label">Team highlight</div>
            <div className="dreelio-kpi-number">{topScorerEntry?.goals > 0 ? topScorerEntry.goals : (nextMatch ? countdown : "—")}</div>
            <div className="dreelio-kpi-meta">
              {topScorerEntry?.goals > 0 ? `Topscorer · ${topScorerEntry.player.name}` : "Countdown / clubvorm"}
            </div>
          </div>
        </article>
      </section>

      <section className="dreelio-activity-strip" aria-label="Live teamstatus">
        <div className="dreelio-activity-main">
          <span className="dreelio-live-dot" />
          <div>
            <strong>Team pulse</strong>
            <span>{teamPulseText}</span>
          </div>
        </div>
        <div className="dreelio-activity-avatars">
          <AvatarStack players={presentPlayers.length ? presentPlayers : activePlayers.slice(0, 6)} />
        </div>
        <div className="dreelio-activity-stat"><strong>{presentPlayers.length}</strong><span>Aanwezig</span></div>
        <div className="dreelio-activity-stat"><strong>{unsurePlayers.length}</strong><span>Twijfel</span></div>
      </section>

      {latestPosts.length > 0 && (
        <section className="dreelio-home-updates" aria-label="Laatste clubupdates">
          <div className="dreelio-home-updates-head">
            <div>
              <strong>Laatste updates</strong>
              <span>Rustige preview van de clubfeed</span>
            </div>
            <button type="button" onClick={() => setTab?.("updates")}>Bekijk alles</button>
          </div>
          <div className="dreelio-home-updates-list">
            {latestPosts.map((post) => (
              <button type="button" key={post.id} onClick={() => setTab?.("updates")} className="dreelio-home-update-item">
                {post.images?.[0] ? <img src={post.images[0]} alt="Update" /> : <span><MessageCircle size={15} /></span>}
                <div>
                  <strong>{post.title || "Clubupdate"}</strong>
                  <small>{post.author_name || "Team"}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ============================================================
// Wedstrijden + Aanwezigheid + Opstelling
// ============================================================
function AvatarStack({ players: list, max = 6 }) {
  const shown = list.slice(0, max);
  const extra = list.length - shown.length;
  return (
    <div style={styles.avatarStack}>
      {shown.map((p, i) => (
        <div key={p.id} style={{ ...styles.avatarStackItem, zIndex: shown.length - i, marginLeft: i === 0 ? 0 : -10 }}>
          {p.photo ? (
            <img src={p.photo} alt={p.name} style={styles.avatarStackImg} />
          ) : (
            <span>{(p.name || "?").slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div style={{ ...styles.avatarStackItem, ...styles.avatarStackMore, marginLeft: -10 }}>+{extra}</div>
      )}
    </div>
  );
}

function MatchesTab({ matches, players, attendanceByMatch, lineupsByMatch, goalsByMatch, me, isAdmin, reloadAll }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "competitie", opponent: "", date: "", location: "" });
  const [expanded, setExpanded] = useState(null);
  const [lineupOpenFor, setLineupOpenFor] = useState(null);
  const [resultOpenFor, setResultOpenFor] = useState(null);
  const [reasonPrompt, setReasonPrompt] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = [...matches].sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  const upcoming = sorted.filter((m) => new Date(m.match_date).getTime() > Date.now());
  const nextMatch = upcoming[0];

  const addMatch = async () => {
    if (!form.opponent || !form.date) return;
    setBusy(true);
    try {
      await db.createMatch(form);
      await reloadAll();
      setForm({ category: "competitie", opponent: "", date: "", location: "" });
      setShowForm(false);
    } finally { setBusy(false); }
  };

  const removeMatch = async (id) => {
    setBusy(true);
    try { await db.deleteMatch(id); await reloadAll(); } finally { setBusy(false); }
  };

  const applyStatus = async (matchId, playerId, status, reason) => {
    setBusy(true);
    try {
      await db.setAttendanceStatus({ matchId, playerId, status, reason });
      await reloadAll();
    } finally { setBusy(false); }
  };

  const requestStatus = (match, status) => {
    const needsReason = ATTENDANCE_STATUSES.find((s) => s.key === status)?.needsReason;
    if (needsReason) {
      setReasonText("");
      setReasonPrompt({ matchId: match.id, status });
    } else {
      applyStatus(match.id, me.id, status, "");
    }
  };

  const confirmReason = async () => {
    if (!reasonPrompt) return;
    await applyStatus(reasonPrompt.matchId, me.id, reasonPrompt.status, reasonText.trim());
    setReasonPrompt(null);
  };

  const canChangeMyStatus = (match) => !deadlinePassed(match);

  return (
    <section>
      {me && nextMatch && (
        <div style={styles.meCard} className="dreelio-panel dreelio-me-card">
          <div style={styles.meCardHead}>
            <div style={styles.meCardTitle}>Kom jij naar de volgende wedstrijd?</div>
            <span style={styles.catTag}>{matchTypeInfo(nextMatch.category).label}</span>
          </div>
          <div style={styles.meCardMatch}>vs {nextMatch.opponent} · {formatDateNL(nextMatch.match_date)}</div>

          {!canChangeMyStatus(nextMatch) ? (
            <div style={styles.deadlinePassed}>
              <AlertCircle size={14} /> Afmelden kan niet meer — de deadline ({deadlineLabel(nextMatch)}) is voorbij.
            </div>
          ) : (
            <>
              <div style={styles.meBtnRow} className="tott-me-btnrow">
                {ATTENDANCE_STATUSES.map((s) => {
                  const Icon = s.icon;
                  const active = attendanceByMatch[nextMatch.id]?.[me.id]?.status === s.key;
                  return (
                    <button key={s.key} onClick={() => requestStatus(nextMatch, s.key)} disabled={busy}
                      style={{ ...styles.meBtn, ...(active ? { background: s.color, color: "#fff", borderColor: s.color } : {}) }}>
                      <Icon size={20} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <div style={styles.deadlineNote}>
                Afmelden kan tot {deadlineLabel(nextMatch)} ({matchTypeInfo(nextMatch.category).deadlineHours}u van tevoren).
              </div>
              {attendanceByMatch[nextMatch.id]?.[me.id]?.reason && (
                <div style={styles.myReason}>Jouw reden (alleen zichtbaar voor admins): "{attendanceByMatch[nextMatch.id][me.id].reason}"</div>
              )}
            </>
          )}
        </div>
      )}

      {reasonPrompt && (
        <div style={styles.modalOverlay} onClick={() => setReasonPrompt(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              Reden voor "{ATTENDANCE_STATUSES.find((s) => s.key === reasonPrompt.status)?.label}"
            </div>
            <div style={styles.modalSub}>Alleen admins zien deze reden.</div>
            <textarea style={styles.textarea} value={reasonText} onChange={(e) => setReasonText(e.target.value)}
              placeholder="Bijv. werk, ziek, vakantie…" rows={3} autoFocus />
            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={() => setReasonPrompt(null)}>Annuleren</button>
              <button style={styles.primaryBtn} onClick={confirmReason} disabled={!reasonText.trim()}>Opslaan</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.sectionHead} className="tott-sectionhead">
        <div>
          <div style={styles.eyebrow}>Programma</div>
          <h2 style={styles.h2} className="tott-h2">Wedstrijden</h2>
        </div>
        {isAdmin && (
          <button style={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
            <Plus size={15} /> Update toevoegen
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div style={styles.formCard} className="dreelio-panel dreelio-form-card">
          <div style={styles.formRow} className="tott-formrow">
            <select style={styles.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {MATCH_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <input style={styles.input} placeholder="Tegenstander" value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
          </div>
          <div style={styles.formRow} className="tott-formrow">
            <input style={styles.input} type="datetime-local" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input style={styles.input} placeholder="Locatie / zaal" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <button style={styles.primaryBtn} onClick={addMatch} disabled={busy}>Plaatsen</button>
        </div>
      )}

      <div style={styles.matchList} className="dreelio-match-list">
        {sorted.length === 0 && <EmptyState text="Nog geen wedstrijden gepland." />}
        {sorted.map((m) => {
          const past = new Date(m.match_date).getTime() < Date.now();
          const isOpen = expanded === m.id;
          const matchAtt = attendanceByMatch[m.id] || {};
          const counts = ATTENDANCE_STATUSES.reduce((acc, s) => {
            acc[s.key] = players.filter((p) => matchAtt[p.id]?.status === s.key).length;
            return acc;
          }, {});
          const lineup = lineupsByMatch[m.id];
          const matchGoals = goalsByMatch[m.id] || [];
          const hasScore = m.own_score !== null && m.own_score !== undefined;
          const enoughPresent = counts.aanwezig >= 5;
          const hasUnsure = counts.twijfel > 0;

          return (
            <div key={m.id} className="dreelio-panel dreelio-match-card-row" style={{ ...styles.matchCard, ...styles.matchCardCol, opacity: past ? 0.55 : 1 }}>
              <div style={styles.matchCardTop} className="tott-matchtop">
                {(() => {
                  const info = matchTypeInfo(m.category);
                  const TypeIcon = MATCH_TYPE_ICONS[info.icon];
                  return (
                    <div style={{ ...styles.matchTypeTag, color: info.color, background: info.bg }}>
                      <TypeIcon size={11} /> {info.label}
                    </div>
                  );
                })()}
                <div style={styles.matchMain}>
                  <div style={styles.matchOpponent}>FC TOTT — {m.opponent}</div>
                  <div style={styles.matchMeta} className="tott-matchmeta">
                    <span style={styles.metaItem}><Clock size={13} /> {formatDateNL(m.match_date)}</span>
                    {m.location && <span style={styles.metaItem}><MapPin size={13} /> {m.location}</span>}
                    {m.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="dreelio-route-link"
                      >Route</a>
                    )}
                  </div>
                </div>
                {hasScore && (
                  <div style={styles.scoreBadge}>{m.own_score} - {m.opponent_score}</div>
                )}
                {isAdmin && (
                  <button style={styles.iconBtn} onClick={() => removeMatch(m.id)} aria-label="Verwijderen">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {hasScore && matchGoals.length > 0 && (
                <div style={{ ...styles.lineupPreview, paddingBottom: 12 }}>
                  <Goal size={13} /> Doelpunten:&nbsp;
                  {matchGoals.map((g, i) => {
                    const scorer = players.find((p) => p.id === g.scorer_id)?.name || "Onbekend";
                    const assist = players.find((p) => p.id === g.assist_id)?.name;
                    return (
                      <span key={g.id} style={{ color: "var(--text)" }}>
                        {i > 0 && ", "}{scorer}{assist ? ` (assist: ${assist})` : ""}
                      </span>
                    );
                  })}
                </div>
              )}

              {lineup && (lineup.keeper || lineup.fielders?.length > 0) && (
                <div style={styles.lineupPreviewWrap}>
                  <AvatarStack players={[lineup.keeper, ...(lineup.fielders || [])].filter(Boolean).map((id) => players.find((p) => p.id === id)).filter(Boolean)} />
                  <div style={styles.lineupPreview}>
                    <Shield size={13} /> Opstelling:&nbsp;
                    {lineup.keeper && <strong style={{ color: "var(--text)" }}>{players.find((p) => p.id === lineup.keeper)?.name} (keeper)</strong>}
                    {lineup.fielders?.length > 0 && (
                      <span style={{ color: "var(--text)" }}>, {lineup.fielders.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                </div>
              )}

              {!past && enoughPresent && hasUnsure && (
                <div style={styles.unsureWarning}>
                  <AlertCircle size={13} /> Er zijn al genoeg aanmeldingen ({counts.aanwezig}) — spelers die op "weet ik nog niet" staan, spelen mogelijk niet mee.
                </div>
              )}

              <button style={styles.attendanceToggle} onClick={() => setExpanded(isOpen ? null : m.id)}>
                <span style={styles.attendanceSummary}>
                  <Check size={13} color="var(--accent)" /> {counts.aanwezig}
                  <X size={13} color="var(--warn)" style={{ marginLeft: 10 }} /> {counts.afwezig}
                  <HelpCircle size={13} color="#A6790A" style={{ marginLeft: 10 }} /> {counts.twijfel}
                </span>
                <span style={styles.attendanceToggleLabel}>
                  Iedereen {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>


              {isOpen && (
                <div style={styles.attendanceList}>
                  {players.length === 0 && <EmptyState text="Nog geen spelers." dark />}
                  {players.map((p) => {
                    const entry = matchAtt[p.id];
                    const statusInfo = ATTENDANCE_STATUSES.find((s) => s.key === entry?.status);
                    return (
                      <div key={p.id} style={styles.attendanceFullRow}>
                        <span style={styles.attendanceName}>{p.name}</span>
                        <div style={styles.attendanceStatusWrap}>
                          {statusInfo ? (
                            <span style={{ ...styles.statusPillStatic, color: statusInfo.color, background: statusInfo.bg, border: "none" }}>
                              {React.createElement(statusInfo.icon, { size: 12 })} {statusInfo.label}
                            </span>
                          ) : (
                            <span style={styles.statusPillStatic}>Nog niet ingevuld</span>
                          )}
                          {isAdmin && entry?.reason && (
                            <span style={styles.adminReason} title={entry.reason}>
                              <Eye size={11} /> "{entry.reason}"
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isAdmin && (
                <div style={styles.lineupSection}>
                  <button style={styles.attendanceToggle} onClick={() => setLineupOpenFor(lineupOpenFor === m.id ? null : m.id)}>
                    <span style={styles.attendanceToggleLabel}>
                      <Shield size={14} /> Opstelling instellen {lineupOpenFor === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  {lineupOpenFor === m.id && (
                    <LineupEditor
                      players={players} attendance={matchAtt} lineup={lineup || { keeper: null, fielders: [] }}
                      onSave={async (next) => {
                        await db.saveLineup(m.id, next.keeper, next.fielders);
                        await reloadAll();
                      }}
                    />
                  )}
                </div>
              )}

              {isAdmin && (
                <div style={styles.lineupSection}>
                  <button style={styles.attendanceToggle} onClick={() => setResultOpenFor(resultOpenFor === m.id ? null : m.id)}>
                    <span style={styles.attendanceToggleLabel}>
                      <Goal size={14} /> Uitslag &amp; doelpunten invullen {resultOpenFor === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  {resultOpenFor === m.id && (
                    <MatchResultEditor
                      match={m} players={players} goals={matchGoals} reloadAll={reloadAll}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LineupEditor({ players, attendance, lineup, onSave }) {
  const available = players.filter((p) => attendance[p.id]?.status === "aanwezig");
  const [keeper, setKeeper] = useState(lineup.keeper || "");
  const [fielders, setFielders] = useState(lineup.fielders || []);
  const [saving, setSaving] = useState(false);

  const toggleFielder = (id) => {
    setFielders((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 4) return cur;
      return [...cur, id];
    });
  };

  const save = async () => {
    setSaving(true);
    try { await onSave({ keeper: keeper || null, fielders }); } finally { setSaving(false); }
  };

  if (available.length === 0) {
    return <div style={styles.lineupEmpty}>Nog niemand heeft zich aanwezig gemeld voor deze wedstrijd.</div>;
  }

  return (
    <div style={styles.lineupEditor}>
      <div style={styles.lineupLabel}>Keeper (1)</div>
      <div style={styles.lineupGrid}>
        {available.map((p) => (
          <button key={p.id} onClick={() => setKeeper(keeper === p.id ? "" : p.id)}
            style={{ ...styles.lineupChip, ...(keeper === p.id ? styles.lineupChipActiveKeeper : {}) }}>
            {p.name}
          </button>
        ))}
      </div>

      <div style={{ ...styles.lineupLabel, marginTop: 12 }}>Veldspelers ({fielders.length}/4)</div>
      <div style={styles.lineupGrid}>
        {available.filter((p) => p.id !== keeper).map((p) => (
          <button key={p.id} onClick={() => toggleFielder(p.id)}
            disabled={!fielders.includes(p.id) && fielders.length >= 4}
            style={{
              ...styles.lineupChip,
              ...(fielders.includes(p.id) ? styles.lineupChipActive : {}),
              ...(!fielders.includes(p.id) && fielders.length >= 4 ? styles.lineupChipDisabled : {}),
            }}>
            {p.name}
          </button>
        ))}
      </div>

      <button style={styles.primaryBtn} onClick={save} disabled={saving}>
        {saving ? "Opslaan…" : "Opstelling opslaan"}
      </button>
    </div>
  );
}

function MatchResultEditor({ match, players, goals, reloadAll }) {
  const [ownScore, setOwnScore] = useState(match.own_score ?? "");
  const [opponentScore, setOpponentScore] = useState(match.opponent_score ?? "");
  const [savingScore, setSavingScore] = useState(false);
  const [newGoal, setNewGoal] = useState({ scorerId: "", assistId: "" });
  const [savingGoal, setSavingGoal] = useState(false);

  const saveScore = async () => {
    if (ownScore === "" || opponentScore === "") return;
    setSavingScore(true);
    try {
      await db.updateMatchScore(match.id, Number(ownScore), Number(opponentScore));
      await reloadAll();
    } finally { setSavingScore(false); }
  };

  const addGoalNow = async () => {
    if (!newGoal.scorerId) return;
    setSavingGoal(true);
    try {
      await db.addGoal(match.id, newGoal.scorerId, newGoal.assistId || null);
      await reloadAll();
      setNewGoal({ scorerId: "", assistId: "" });
    } finally { setSavingGoal(false); }
  };

  const removeGoal = async (id) => {
    setSavingGoal(true);
    try { await db.deleteGoal(id); await reloadAll(); } finally { setSavingGoal(false); }
  };

  return (
    <div style={styles.lineupEditor}>
      <div style={styles.lineupLabel}>Eindstand</div>
      <div style={styles.scoreInputRow}>
        <span style={styles.scoreInputTeam}>FC TOTT</span>
        <input style={styles.scoreInput} type="number" min="0" value={ownScore}
          onChange={(e) => setOwnScore(e.target.value)} />
        <span style={styles.scoreInputDash}>—</span>
        <input style={styles.scoreInput} type="number" min="0" value={opponentScore}
          onChange={(e) => setOpponentScore(e.target.value)} />
        <span style={styles.scoreInputTeam}>{match.opponent}</span>
      </div>
      <button style={styles.primaryBtn} onClick={saveScore} disabled={savingScore}>
        {savingScore ? "Opslaan…" : "Uitslag opslaan"}
      </button>

      <div style={{ ...styles.lineupLabel, marginTop: 18 }}>Doelpunten</div>
      {goals.length === 0 && <div style={styles.lineupEmpty}>Nog geen doelpunten ingevoerd.</div>}
      {goals.length > 0 && (
        <div style={styles.goalsListLight}>
          {goals.map((g) => {
            const scorer = players.find((p) => p.id === g.scorer_id)?.name || "Onbekend";
            const assist = players.find((p) => p.id === g.assist_id)?.name;
            return (
              <div key={g.id} style={styles.goalsListRow}>
                <Goal size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={styles.goalsListText}>{scorer}{assist ? ` — assist: ${assist}` : ""}</span>
                <button style={styles.iconBtnGhost} onClick={() => removeGoal(g.id)} aria-label="Verwijderen" disabled={savingGoal}>
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.formRow} className="tott-formrow">
        <select style={styles.input} value={newGoal.scorerId} onChange={(e) => setNewGoal({ ...newGoal, scorerId: e.target.value })}>
          <option value="">Doelpunt door…</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={styles.input} value={newGoal.assistId} onChange={(e) => setNewGoal({ ...newGoal, assistId: e.target.value })}>
          <option value="">Assist door… (optioneel)</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <button style={styles.primaryBtn} onClick={addGoalNow} disabled={savingGoal || !newGoal.scorerId}>
        <Plus size={15} /> Doelpunt toevoegen
      </button>
    </div>
  );
}


// ============================================================
// Updates / clubfeed zonder Supabase-wijzigingen
// ============================================================
function UpdatesTab({ posts, setPosts, me, players, isAdmin }) {
  const [showComposer, setShowComposer] = useState(posts.length === 0);
  const [draft, setDraft] = useState({ category: "Team", title: "", body: "", imageUrls: "", pinned: false });
  const [localImages, setLocalImages] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const sortedPosts = [...posts].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return Number(b.pinned) - Number(a.pinned);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const readFiles = (files) => {
    const selected = Array.from(files || []).slice(0, 6 - localImages.length);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setLocalImages((cur) => normalizeImages([...cur, reader.result]));
      };
      reader.readAsDataURL(file);
    });
  };

  const addPost = () => {
    const title = draft.title.trim();
    const body = draft.body.trim();
    const urls = draft.imageUrls.split(/[\n,]/).map((url) => url.trim()).filter(Boolean);
    const images = normalizeImages([...localImages, ...urls]);
    if (!title && !body && images.length === 0) return;

    const post = {
      id: makePostId(),
      author_id: me.id,
      author_name: me.name,
      author_photo: me.photo || "",
      category: draft.category || "Team",
      title: title || "Clubupdate",
      body,
      images,
      pinned: isAdmin ? !!draft.pinned : false,
      created_at: new Date().toISOString(),
    };

    setPosts([post, ...posts]);
    setDraft({ category: "Team", title: "", body: "", imageUrls: "", pinned: false });
    setLocalImages([]);
    setShowComposer(false);
  };

  const removePost = (postId) => {
    setPosts(posts.filter((post) => post.id !== postId));
  };

  const togglePinned = (postId) => {
    if (!isAdmin) return;
    setPosts(posts.map((post) => post.id === postId ? { ...post, pinned: !post.pinned } : post));
  };

  return (
    <section className="dreelio-updates-page">
      <div style={styles.sectionHead} className="tott-sectionhead">
        <div>
          <div style={styles.eyebrow}>Clubfeed</div>
          <h2 style={styles.h2} className="tott-h2">Updates</h2>
        </div>
        <button style={styles.addBtn} onClick={() => setShowComposer((open) => !open)} type="button">
          <Plus size={15} /> {showComposer ? "Sluiten" : "Post maken"}
        </button>
      </div>

      <div className="dreelio-muted-note dreelio-updates-note">
        Zonder Supabase-aanpassing worden posts en geüploade afbeeldingen lokaal in deze browser opgeslagen. Afbeelding-URL's werken het lichtst.
      </div>

      {showComposer && (
        <div className="dreelio-panel dreelio-post-composer">
          <div className="dreelio-composer-head">
            <div className="dreelio-post-avatar">
              {me.photo ? <img src={me.photo} alt={me.name} /> : me.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{me.name}</strong>
              <span>Deel iets met het team</span>
            </div>
          </div>

          <div style={styles.formRow} className="tott-formrow">
            <select style={styles.input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              <option>Team</option>
              <option>Wedstrijd</option>
              <option>Foto's</option>
              <option>Mededeling</option>
              <option>Betaling</option>
            </select>
            <input style={styles.input} placeholder="Titel" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>

          <textarea
            style={styles.textarea}
            rows={4}
            placeholder="Schrijf een korte update…"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />

          <textarea
            style={styles.textarea}
            rows={2}
            placeholder="Afbeelding URL's, gescheiden door komma of nieuwe regel"
            value={draft.imageUrls}
            onChange={(e) => setDraft({ ...draft, imageUrls: e.target.value })}
          />

          <div className="dreelio-upload-row">
            <label className="dreelio-file-button">
              <Camera size={15} /> Afbeeldingen kiezen
              <input type="file" accept="image/*" multiple onChange={(e) => readFiles(e.target.files)} />
            </label>
            <span>Maximaal 6 afbeeldingen per post</span>
          </div>

          {localImages.length > 0 && (
            <div className="dreelio-image-preview-row">
              {localImages.map((img, i) => (
                <button key={i} type="button" onClick={() => setLocalImages(localImages.filter((_, idx) => idx !== i))} title="Verwijderen">
                  <img src={img} alt={`Preview ${i + 1}`} />
                  <X size={13} />
                </button>
              ))}
            </div>
          )}

          {isAdmin && (
            <label className="dreelio-pin-toggle">
              <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
              Vastzetten bovenaan
            </label>
          )}

          <button style={styles.primaryBtn} onClick={addPost} type="button"><Plus size={15} /> Publiceren</button>
        </div>
      )}

      <div className="dreelio-post-list">
        {sortedPosts.length === 0 && <EmptyState text="Nog geen updates. Maak de eerste post voor het team." />}
        {sortedPosts.map((post) => {
          const author = players.find((p) => p.id === post.author_id);
          const canRemove = isAdmin || post.author_id === me.id;
          return (
            <article key={post.id} className={`dreelio-post-card ${post.pinned ? "is-pinned" : ""}`}>
              <div className="dreelio-post-head">
                <div className="dreelio-post-avatar">
                  {(author?.photo || post.author_photo) ? <img src={author?.photo || post.author_photo} alt={author?.name || post.author_name} /> : (post.author_name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="dreelio-post-meta">
                  <strong>{author?.name || post.author_name || "Team"}</strong>
                  <span>{new Date(post.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <span className="dreelio-post-category">{post.category}</span>
                {post.pinned && <span className="dreelio-post-category pinned"><Pin size={11} /> Vast</span>}
              </div>

              <div className="dreelio-post-body">
                <h3>{post.title}</h3>
                {post.body && <p>{post.body}</p>}
              </div>

              {post.images?.length > 0 && (
                <div className={`dreelio-post-images count-${Math.min(post.images.length, 4)}`}>
                  {post.images.map((img, i) => (
                    <button key={`${post.id}-${i}`} type="button" onClick={() => setPreviewImage(img)}>
                      <img src={img} alt={`${post.title || "Update"} afbeelding ${i + 1}`} />
                    </button>
                  ))}
                </div>
              )}

              <div className="dreelio-post-actions">
                {isAdmin && <button type="button" onClick={() => togglePinned(post.id)}><Pin size={13} /> {post.pinned ? "Losmaken" : "Vastzetten"}</button>}
                {canRemove && <button type="button" onClick={() => removePost(post.id)}><Trash2 size={13} /> Verwijderen</button>}
              </div>
            </article>
          );
        })}
      </div>

      {previewImage && (
        <div className="dreelio-lightbox" onClick={() => setPreviewImage(null)}>
          <button type="button" aria-label="Sluiten"><X size={18} /></button>
          <img src={previewImage} alt="Vergrote update" />
        </div>
      )}
    </section>
  );
}

// ============================================================
// Profiel
// ============================================================
function DonutChart({ pct, size = 76, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = pct === null ? 0 : pct;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: size * 0.24, color: "var(--text)",
      }}>
        {pct === null ? "—" : `${pct}%`}
      </div>
    </div>
  );
}

function ProfileTab({ me, players, attendanceByMatch, matches, statsByPlayer, isAdmin, reloadAll }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ photo: me.photo || "", position: me.position || "Allround", number: me.number || "" });
  const [busy, setBusy] = useState(false);

  const pastOrCurrentMatches = matches.filter((m) => attendanceByMatch[m.id]?.[me.id]?.status !== undefined);
  const totalRelevant = pastOrCurrentMatches.length;
  const presentCount = pastOrCurrentMatches.filter((m) => attendanceByMatch[m.id][me.id].status === "aanwezig").length;
  const pct = totalRelevant > 0 ? Math.round((presentCount / totalRelevant) * 100) : null;

  const myStats = statsByPlayer[me.id] || { goals: 0, assists: 0 };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await db.updatePlayer(me.id, { photo: form.photo, position: form.position, number: Number(form.number) || null });
      await reloadAll();
      setEditing(false);
    } finally { setBusy(false); }
  };

  return (
    <section>
      <div style={styles.profileCard} className="dreelio-panel dreelio-profile-main">
        <div style={styles.profileTop}>
          <div style={styles.profilePhoto}>
            {me.photo ? <img src={me.photo} alt={me.name} style={styles.profilePhotoImg} /> : <Users size={28} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.profileName}>{me.name}</div>
            <div style={styles.profileMeta}>
              #{me.number || "—"} · {me.position || "Onbekend"} · Lid sinds {me.member_since ? formatDateShort(me.member_since) : "—"}
            </div>
          </div>
          {isAdmin ? (
            <button style={styles.editBtn} onClick={() => setEditing((e) => !e)}>
              <Camera size={14} /> {editing ? "Sluiten" : "Bewerken"}
            </button>
          ) : (
            <span className="dreelio-admin-only-note">Foto via admin</span>
          )}
        </div>

        {editing && (
          <div style={styles.profileEditForm}>
            <label style={styles.loginLabel}>Profielfoto (URL)</label>
            <input style={styles.input} placeholder="https://…" value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} />
            <label style={styles.loginLabel}>Positie</label>
            <select style={styles.input} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
              {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
            </select>
            <label style={styles.loginLabel}>Rugnummer</label>
            <input style={styles.input} type="number" min="1" max="99" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            <button style={styles.primaryBtn} onClick={saveProfile} disabled={busy}>Opslaan</button>
          </div>
        )}

        <div style={styles.statGridRow} className="tott-statgridrow">
          <div style={styles.donutCard}>
            <DonutChart pct={pct} />
            <div style={styles.statLabel}>Aanwezigheid</div>
          </div>
          <div style={styles.statGrid}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{myStats.goals}</div>
              <div style={styles.statLabel}><Goal size={11} style={{ verticalAlign: "-1px" }} /> Goals</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{myStats.assists}</div>
              <div style={styles.statLabel}><Handshake size={11} style={{ verticalAlign: "-1px" }} /> Assists</div>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div style={styles.statsHint}>Goals en assists worden bijgehouden via de uitslag van elke wedstrijd, in het Wedstrijden-tabblad.</div>
        )}
      </div>

      {isAdmin && (
        <div style={styles.teamStatsCard} className="dreelio-panel dreelio-team-stats">
          <div style={{ ...styles.h2, marginBottom: 12, color: "var(--text)" }}>Hele team — statistieken</div>
          {players.map((p) => {
            const pStats = statsByPlayer[p.id] || { goals: 0, assists: 0 };
            const pMatches = matches.filter((m) => attendanceByMatch[m.id]?.[p.id]?.status !== undefined);
            const pPresent = pMatches.filter((m) => attendanceByMatch[m.id][p.id].status === "aanwezig").length;
            const pPct = pMatches.length > 0 ? Math.round((pPresent / pMatches.length) * 100) : null;
            return (
              <div key={p.id} style={styles.teamStatRow}>
                <span style={styles.teamStatName}>{p.name}</span>
                <span style={styles.teamStatVal}>{pPct === null ? "—" : `${pPct}%`}</span>
                <span style={styles.teamStatVal}><Goal size={12} /> {pStats.goals}</span>
                <span style={styles.teamStatVal}><Handshake size={12} /> {pStats.assists}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Boetepot
// ============================================================
function FinePotTab({ fineRules, fines, players, isAdmin, reloadAll }) {
  const [newRule, setNewRule] = useState({ label: "", amount: "" });
  const [assign, setAssign] = useState({ playerId: "", ruleId: "" });
  const [busy, setBusy] = useState(false);

  const potTotal = fines.reduce((sum, f) => sum + Number(f.amount), 0);

  const addRule = async () => {
    if (!newRule.label.trim() || !newRule.amount) return;
    setBusy(true);
    try {
      await db.addFineRule(newRule.label.trim(), Number(newRule.amount));
      await reloadAll();
      setNewRule({ label: "", amount: "" });
    } finally { setBusy(false); }
  };

  const removeRule = async (id) => {
    setBusy(true);
    try { await db.deleteFineRule(id); await reloadAll(); } finally { setBusy(false); }
  };

  const assignFineNow = async () => {
    const rule = fineRules.find((r) => r.id === assign.ruleId);
    if (!assign.playerId || !rule) return;
    setBusy(true);
    try {
      await db.assignFine(assign.playerId, rule.id, rule.label, rule.amount);
      await reloadAll();
      setAssign({ playerId: "", ruleId: "" });
    } finally { setBusy(false); }
  };

  const removeFine = async (id) => {
    setBusy(true);
    try { await db.deleteFine(id); await reloadAll(); } finally { setBusy(false); }
  };

  const totalsByPlayer = players.map((p) => ({
    player: p,
    total: fines.filter((f) => f.player_id === p.id).reduce((s, f) => s + Number(f.amount), 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  return (
    <section>
      <div style={styles.sectionHead} className="tott-sectionhead">
        <div>
          <div style={styles.eyebrow}>Team</div>
          <h2 style={styles.h2} className="tott-h2">Boetepot</h2>
        </div>
      </div>

      <div style={styles.potCard} className="dreelio-panel dreelio-pot-card">
        <Coins size={26} style={{ opacity: 0.85 }} />
        <div>
          <div style={styles.potAmount}>€{potTotal}</div>
          <div style={styles.potSub}>Gaat naar iets gezamenlijks aan het einde van elk half seizoen.</div>
        </div>
      </div>

      <div style={styles.h3}>Regels &amp; bedragen</div>
      <div style={styles.rulesCard} className="dreelio-panel dreelio-rules-card">
        {fineRules.map((r) => (
          <div key={r.id} style={styles.ruleRow}>
            <Gavel size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span style={styles.ruleText}>{r.label}</span>
            <span style={styles.fineAmount}>€{r.amount}</span>
            {isAdmin && (
              <button style={styles.iconBtnGhost} onClick={() => removeRule(r.id)} aria-label="Verwijderen"><X size={14} /></button>
            )}
          </div>
        ))}
        {fineRules.length === 0 && <EmptyState text="Nog geen boeteregels." dark />}
      </div>

      {isAdmin && (
        <>
          <div style={styles.formCard} className="dreelio-panel dreelio-form-card">
            <div style={styles.formRow} className="tott-formrow">
              <input style={styles.input} placeholder="Omschrijving regel" value={newRule.label}
                onChange={(e) => setNewRule({ ...newRule, label: e.target.value })} />
              <input style={styles.input} type="number" placeholder="Bedrag €" value={newRule.amount}
                onChange={(e) => setNewRule({ ...newRule, amount: e.target.value })} />
            </div>
            <button style={styles.primaryBtn} onClick={addRule} disabled={busy}><Plus size={15} /> Regel toevoegen</button>
          </div>

          <div style={styles.h3}>Boete toekennen</div>
          <div style={styles.formCard} className="dreelio-panel dreelio-form-card">
            <div style={styles.formRow} className="tott-formrow">
              <select style={styles.input} value={assign.playerId} onChange={(e) => setAssign({ ...assign, playerId: e.target.value })}>
                <option value="">Kies speler…</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select style={styles.input} value={assign.ruleId} onChange={(e) => setAssign({ ...assign, ruleId: e.target.value })}>
                <option value="">Kies regel…</option>
                {fineRules.map((r) => <option key={r.id} value={r.id}>{r.label} (€{r.amount})</option>)}
              </select>
            </div>
            <button style={styles.primaryBtn} onClick={assignFineNow} disabled={busy}>Boete toekennen</button>
          </div>
        </>
      )}

      {totalsByPlayer.length > 0 && (
        <>
          <div style={styles.h3}>Boetes per speler</div>
          <div style={styles.rulesCard} className="dreelio-panel dreelio-rules-card">
            {totalsByPlayer.map(({ player, total }) => (
              <div key={player.id} style={styles.ruleRow}>
                <span style={styles.ruleText}>{player.name}</span>
                <span style={styles.fineAmount}>€{total}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {isAdmin && fines.length > 0 && (
        <>
          <div style={styles.h3}>Boetegeschiedenis</div>
          <div style={styles.rulesCard} className="dreelio-panel dreelio-rules-card">
            {fines.map((f) => {
              const p = players.find((pl) => pl.id === f.player_id);
              return (
                <div key={f.id} style={styles.ruleRow}>
                  <span style={styles.ruleText}>{p?.name || "Onbekend"} — {f.label}</span>
                  <span style={styles.fineAmount}>€{f.amount}</span>
                  <button style={styles.iconBtnGhost} onClick={() => removeFine(f.id)} aria-label="Verwijderen"><X size={14} /></button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

// ============================================================
// Huisregels
// ============================================================
function RulesTab({ rules, isAdmin, reloadAll }) {
  const [newRule, setNewRule] = useState("");
  const [busy, setBusy] = useState(false);

  const addRule = async () => {
    if (!newRule.trim()) return;
    setBusy(true);
    try {
      await db.addRule(newRule.trim(), rules.length + 1);
      await reloadAll();
      setNewRule("");
    } finally { setBusy(false); }
  };
  const removeRule = async (id) => {
    setBusy(true);
    try { await db.deleteRule(id); await reloadAll(); } finally { setBusy(false); }
  };

  return (
    <section>
      <div style={styles.sectionHead} className="tott-sectionhead">
        <div>
          <div style={styles.eyebrow}>Afspraken</div>
          <h2 style={styles.h2} className="tott-h2">Huisregels</h2>
        </div>
      </div>
      <div style={styles.rulesCard} className="dreelio-panel dreelio-rules-card">
        {rules.map((r, i) => (
          <div key={r.id} style={styles.ruleRow}>
            <span style={styles.ruleNum}>{String(i + 1).padStart(2, "0")}</span>
            <span style={styles.ruleText}>{r.text}</span>
            {isAdmin && (
              <button style={styles.iconBtnGhost} onClick={() => removeRule(r.id)} aria-label="Verwijderen"><X size={14} /></button>
            )}
          </div>
        ))}
        {rules.length === 0 && <EmptyState text="Nog geen huisregels toegevoegd." dark />}
      </div>
      {isAdmin && (
        <div style={styles.addRuleRow} className="tott-addrow dreelio-panel dreelio-add-row">
          <input style={styles.input} placeholder="Nieuwe huisregel toevoegen…" value={newRule}
            onChange={(e) => setNewRule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRule()} />
          <button style={styles.primaryBtn} onClick={addRule} disabled={busy}><Plus size={15} /> Toevoegen</button>
        </div>
      )}
    </section>
  );
}

// ============================================================
// Financiën
// ============================================================
function FinanceTab({ players, feeTypes, feesByPlayer, me, isAdmin, reloadAll }) {
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleFee = async (playerId, feeTypeId, current) => {
    if (!isAdmin) return;
    setBusy(true);
    try { await db.toggleFeePayment(playerId, feeTypeId, !current); await reloadAll(); } finally { setBusy(false); }
  };

  return (
    <section>
      <div style={styles.meCard} className="dreelio-panel dreelio-me-card">
        <div style={styles.meCardTitle}>Jouw betalingen, {me.name.split(" ")[0]}</div>
        <div style={styles.myFeeList}>
          {feeTypes.map((f) => {
            const Icon = FEE_ICONS[f.id] || Wallet;
            const paid = !!(feesByPlayer[me.id] || {})[f.id];
            return (
              <div key={f.id} style={styles.myFeeRow}>
                <span style={styles.myFeeName}><Icon size={16} /> {f.label} <span style={styles.legendAmount}>€{f.amount}</span></span>
                <span style={{ ...styles.statusPill, ...(paid ? styles.pillPaid : styles.pillOpen) }}>
                  {paid ? <Check size={13} /> : <X size={13} />}
                  {paid ? "Voldaan" : "Open"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.sectionHead} className="tott-sectionhead">
        <div>
          <div style={styles.eyebrow}>Betalingen</div>
          <h2 style={styles.h2} className="tott-h2">Financiën</h2>
        </div>
      </div>

      <button style={styles.attendanceToggle} onClick={() => setShowAll((s) => !s)}>
        <span style={styles.attendanceToggleLabel}>Iedereen bekijken {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {showAll && (
        <div style={styles.tableWrap} className="dreelio-panel dreelio-table-wrap">
          <table style={styles.table} className="tott-finance-table">
            <thead>
              <tr>
                <th style={styles.thName}>Speler</th>
                {feeTypes.map((f) => <th key={f.id} style={styles.th}>{f.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const pf = feesByPlayer[p.id] || {};
                const openForPlayer = feeTypes.filter((f) => !pf[f.id]).length;
                return (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.tdName} className="tott-finance-row-name">
                      {p.name}
                      {openForPlayer > 0 && <span style={styles.warnBadge}><AlertCircle size={11} /> {openForPlayer} open</span>}
                    </td>
                    {feeTypes.map((f) => {
                      const paid = !!pf[f.id];
                      return (
                        <td key={f.id} style={styles.td} className="tott-finance-cell" data-label={f.label}>
                          <button onClick={() => toggleFee(p.id, f.id, paid)} disabled={!isAdmin || busy}
                            style={{ ...styles.statusPill, ...(paid ? styles.pillPaid : styles.pillOpen), ...(isAdmin ? {} : { opacity: 0.85, cursor: "default" }) }}
                            className="tott-pill">
                            {paid ? <Check size={13} /> : <X size={13} />}
                            {paid ? "Voldaan" : "Open"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ============================================================
// Admin panel: user management
// ============================================================
function AdminPanel({ players, reloadAll, branding = DEFAULT_BRANDING, setBranding }) {
  const [open, setOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: "", username: "", password: "", role: "speler" });
  const [photoEdits, setPhotoEdits] = useState({});
  const [brandingDraft, setBrandingDraft] = useState(branding);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBrandingDraft(branding);
  }, [branding]);

  const toggleActive = async (id, active) => {
    setBusy(true);
    try { await db.setPlayerActive(id, !active); await reloadAll(); } finally { setBusy(false); }
  };

  const removePlayer = async (id) => {
    setBusy(true);
    try { await db.deletePlayer(id); await reloadAll(); } finally { setBusy(false); }
  };

  const savePlayerPhoto = async (player) => {
    setBusy(true);
    try {
      await db.updatePlayer(player.id, { photo: photoEdits[player.id] ?? player.photo ?? "" });
      await reloadAll();
    } finally { setBusy(false); }
  };

  const saveBranding = () => {
    setBranding?.({ ...DEFAULT_BRANDING, ...brandingDraft });
  };

  const addPlayer = async () => {
    if (!newPlayer.name.trim() || !newPlayer.username.trim() || !newPlayer.password.trim()) return;
    setBusy(true);
    try {
      const exists = await db.usernameExists(newPlayer.username);
      if (exists) { alert("Die gebruikersnaam bestaat al."); return; }
      await db.createPlayer({
        name: newPlayer.name.trim(), username: newPlayer.username.trim(),
        password: newPlayer.password, role: newPlayer.role,
      });
      await reloadAll();
      setNewPlayer({ name: "", username: "", password: "", role: "speler" });
    } finally { setBusy(false); }
  };

  return (
    <div style={styles.adminPanel} className="dreelio-panel dreelio-admin-panel">
      <button style={styles.beheerToggle} onClick={() => setOpen((o) => !o)}>
        <UserCog size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
        {open ? "Sluit beheerderspaneel" : "Beheerderspaneel — spelers, accounts & toegang"}
      </button>

      {open && (
        <div style={styles.adminBody}>
          <div style={styles.h3}>Spelers &amp; accounts</div>
          <div style={styles.rulesCard} className="dreelio-panel dreelio-rules-card">
            {players.map((p) => (
              <div key={p.id} style={styles.adminRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.adminRowName}>
                    {p.name} {p.role === "admin" && <Star size={11} style={{ color: "var(--accent)", marginLeft: 4 }} />}
                  </div>
                  <div style={styles.adminRowMeta}>@{p.username} · {p.role === "admin" ? "Admin" : "Speler"} · {p.active ? "Actief" : "Geblokkeerd"}</div>
                </div>
                <button disabled={busy}
                  style={{ ...styles.adminActionBtn, ...(p.active ? styles.adminActionBtnDanger : styles.adminActionBtnOk) }}
                  onClick={() => toggleActive(p.id, p.active)}>
                  {p.active ? <><UserMinus size={13} /> Eruit gooien</> : <><UserPlus size={13} /> Weer toelaten</>}
                </button>
                <button style={styles.iconBtnGhost} onClick={() => removePlayer(p.id)} aria-label="Verwijderen" disabled={busy}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={styles.h3}>Nieuw account aanmaken</div>
          <div style={styles.formCard} className="dreelio-panel dreelio-form-card">
            <div style={styles.formRow} className="tott-formrow">
              <input style={styles.input} placeholder="Volledige naam" value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })} />
              <input style={styles.input} placeholder="Gebruikersnaam" value={newPlayer.username}
                onChange={(e) => setNewPlayer({ ...newPlayer, username: e.target.value })} />
            </div>
            <div style={styles.formRow} className="tott-formrow">
              <input style={styles.input} placeholder="Wachtwoord" value={newPlayer.password}
                onChange={(e) => setNewPlayer({ ...newPlayer, password: e.target.value })} />
              <select style={styles.input} value={newPlayer.role} onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}>
                <option value="speler">Speler</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button style={styles.primaryBtn} onClick={addPlayer} disabled={busy}><UserPlus size={15} /> Account aanmaken</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, dark = false }) {
  return (
    <div style={{ ...styles.empty, ...(dark ? { color: "var(--text-dim)" } : {}) }}>
      <ChevronRight size={14} style={{ opacity: 0.5 }} />
      {text}
    </div>
  );
}

// ============================================================
// Styles
// ============================================================
const globalCss = `
  :root {
    --bg: #FAFAF8;
    --bg-soft: #F3F2EE;
    --card: #FFFFFF;
    --line: #EFEEE8;
    --accent: #4A5D23;
    --accent-soft: #EEF1E4;
    --warn: #B5651D;
    --warn-soft: #F6EEE3;
    --success: #4A5D23;
    --text: #1C1C1A;
    --text-dim: #7A7A72;
    --shadow-sm: 0 1px 2px rgba(20,20,18,0.04);
    --shadow: 0 1px 2px rgba(20,20,18,0.04), 0 4px 16px rgba(20,20,18,0.05);
    --shadow-lg: 0 2px 4px rgba(20,20,18,0.04), 0 12px 32px rgba(20,20,18,0.07);
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-soft); }
  button { font-family: inherit; cursor: pointer; }
  input, select, textarea { font-family: inherit; }
  input:focus, select:focus, textarea:focus, button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  button:disabled { cursor: not-allowed; opacity: 0.5; }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
  table { border-collapse: collapse; width: 100%; }

  .tott-header { padding: 16px 16px 14px; }
  .tott-crest { width: 38px; height: 38px; font-size: 10.5px; }
  .tott-clubname { font-size: 16.5px; }
  .tott-clubsub { font-size: 11.5px; }

  .tott-herowrap { padding: 12px 14px; flex-direction: column; gap: 10px; }
  .tott-hero { padding: 18px; }
  .tott-hero-title { font-size: 19px; }

  .tott-nav { padding: 8px 10px; gap: 2px; margin: 10px 14px 0; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; scroll-snap-type: x proximity; }
  .tott-nav::-webkit-scrollbar { display: none; }
  .tott-navbtn { padding: 9px 10px; font-size: 12.5px; white-space: nowrap; flex-shrink: 0; scroll-snap-align: start; }

  .tott-main { padding: 18px 14px 32px; }

  .tott-sectionhead { flex-wrap: wrap; gap: 10px; }
  .tott-h2 { font-size: 18px; }
  .tott-formrow { flex-direction: column; }
  .tott-formrow > * { min-width: 0; width: 100%; }

  .tott-matchtop { flex-wrap: wrap; }
  .tott-matchmeta { gap: 10px; }

  .tott-finance-table thead { display: none; }
  .tott-finance-table, .tott-finance-table tbody, .tott-finance-table tr, .tott-finance-table td {
    display: block; width: 100%;
  }
  .tott-finance-table tr { border-bottom: 1px solid var(--line); padding: 12px 14px 14px; }
  .tott-finance-table tr:last-child { border-bottom: none; }
  .tott-finance-table td { border-bottom: none !important; padding: 4px 0 !important; }
  .tott-finance-row-name { display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px !important; }
  .tott-finance-cell { display: flex; align-items: center; justify-content: space-between; padding: 6px 0 !important; }
  .tott-finance-cell::before { content: attr(data-label); font-size: 11.5px; color: var(--text-dim); font-weight: 600; }
  .tott-finance-cell .tott-pill { margin-left: auto; }

  .tott-addrow { flex-direction: column; }
  .tott-addrow > input { width: 100%; }
  .tott-addrow > button { width: 100%; }

  .tott-me-btnrow { grid-template-columns: 1fr; }
  .tott-statgridrow { flex-direction: column; align-items: stretch; }

  @media (min-width: 480px) {
    .tott-me-btnrow { grid-template-columns: repeat(3, 1fr); }
  }

  @media (min-width: 560px) {
    .tott-herowrap { flex-direction: row; }
  }

  @media (min-width: 720px) {
    .tott-header { padding: 20px 20px 16px; }
    .tott-crest { width: 44px; height: 44px; font-size: 12px; }
    .tott-clubname { font-size: 19px; }
    .tott-clubsub { font-size: 12.5px; }

    .tott-herowrap { padding: 16px 20px; }

    .tott-nav { padding: 12px 20px; margin: 12px 20px 0; gap: 6px; overflow-x: visible; }
    .tott-navbtn { padding: 10px 14px; font-size: 13.5px; }

    .tott-main { padding: 24px 20px 40px; }
    .tott-h2 { font-size: 21px; }
    .tott-formrow { flex-direction: row; }
    .tott-formrow > * { width: auto; }

    .tott-finance-table thead { display: table-header-group; }
    .tott-finance-table, .tott-finance-table tbody, .tott-finance-table tr, .tott-finance-table td {
      display: revert; width: revert;
    }
    .tott-finance-table tr { border-bottom: 1px solid var(--line); padding: 0; }
    .tott-finance-table td { padding: 12px 14px !important; border-bottom: 1px solid var(--line) !important; }
    .tott-finance-row-name { display: revert; padding-bottom: 12px !important; }
    .tott-finance-cell { display: revert; padding: 12px 14px !important; }
    .tott-finance-cell::before { content: none; }
    .tott-finance-cell .tott-pill { margin-left: 0; }

    .tott-addrow { flex-direction: row; }
    .tott-addrow > input { width: auto; }
    .tott-addrow > button { width: auto; }
  }
`;


const dreelioDashboardCss = `
  :root {
    --dreelio-bg: #f6f6f3;
    --dreelio-canvas: #fbfbf8;
    --dreelio-card: #ffffff;
    --dreelio-border: #e8e6df;
    --dreelio-border-strong: #dedbd2;
    --dreelio-text: #121410;
    --dreelio-muted: #76796f;
    --dreelio-soft: #f0efea;
    --dreelio-dark: #101511;
    --dreelio-dark-2: #171d18;
    --dreelio-accent: #365a31;
    --dreelio-accent-soft: #e6efe2;
    --dreelio-warning: #b85b2b;
    --dreelio-warning-soft: #fff1e8;
    --dreelio-radius: 22px;
    --dreelio-radius-lg: 30px;
    --dreelio-shadow: 0 1px 1px rgba(16, 21, 17, 0.03), 0 18px 45px rgba(16, 21, 17, 0.06);
  }

  html, body, #root { min-height: 100%; }
  body {
    margin: 0 !important;
    background: var(--dreelio-bg) !important;
    color: var(--dreelio-text) !important;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }

  .dreelio-app {
    background:
      radial-gradient(circle at 100% 0%, rgba(54,90,49,0.08), transparent 30%),
      linear-gradient(180deg, #fbfbf8 0%, #f6f6f3 100%) !important;
    color: var(--dreelio-text) !important;
  }

  .dreelio-shell {
    width: 100%;
    min-height: 100vh;
    padding: 18px;
    display: grid;
    grid-template-columns: 270px minmax(0, 1fr);
    gap: 18px;
  }

  .dreelio-sidebar {
    position: sticky;
    top: 18px;
    height: calc(100vh - 36px);
    border-radius: 28px;
    padding: 18px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%),
      var(--dreelio-dark);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 22px 70px rgba(16,21,17,0.18);
    color: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dreelio-sidebar::after {
    content: "";
    position: absolute;
    left: -70px;
    bottom: -90px;
    width: 220px;
    height: 220px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(87,118,65,0.32), transparent 65%);
    pointer-events: none;
  }

  .dreelio-sidebar-brand,
  .dreelio-profile-card,
  .dreelio-sidebar-card,
  .dreelio-sidebar-nav,
  .dreelio-sidebar-group-label {
    position: relative;
    z-index: 1;
  }

  .dreelio-sidebar-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 4px 20px;
  }

  .dreelio-sidebar-logo {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: #fff;
    color: var(--dreelio-dark);
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    font-weight: 800;
    box-shadow: inset 0 -8px 18px rgba(16,21,17,0.06);
  }

  .dreelio-sidebar-title {
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .dreelio-sidebar-sub {
    margin-top: 2px;
    color: rgba(255,255,255,0.56);
    font-size: 12px;
    font-weight: 600;
  }

  .dreelio-sidebar-group-label {
    padding: 14px 10px 9px;
    color: rgba(255,255,255,0.42);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .dreelio-sidebar-nav {
    display: grid;
    gap: 6px;
  }

  .dreelio-side-link {
    width: 100%;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: transparent;
    border: 1px solid transparent;
    color: rgba(255,255,255,0.68);
    font-size: 13.5px;
    font-weight: 720;
    text-align: left;
  }

  .dreelio-side-link:hover {
    background: rgba(255,255,255,0.06);
    color: #fff;
  }

  .dreelio-side-link.is-active {
    background: #fff;
    color: var(--dreelio-dark);
    border-color: rgba(255,255,255,0.14);
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
  }

  .dreelio-side-icon {
    width: 28px;
    height: 28px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.08);
    color: currentColor;
    flex: 0 0 auto;
  }

  .dreelio-side-link.is-active .dreelio-side-icon {
    background: var(--dreelio-soft);
    color: var(--dreelio-accent);
  }

  .dreelio-sidebar-card {
    margin-top: 18px;
    padding: 14px;
    border-radius: 18px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .dreelio-mini-label {
    color: rgba(255,255,255,0.45);
    font-size: 11px;
    font-weight: 780;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }

  .dreelio-mini-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 0;
    color: rgba(255,255,255,0.64);
    font-size: 12.5px;
    font-weight: 650;
  }

  .dreelio-mini-row strong {
    color: #fff;
    font-size: 13px;
  }

  .dreelio-sidebar-spacer { flex: 1; }

  .dreelio-profile-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 18px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .dreelio-profile-avatar {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    background: #fff;
    color: var(--dreelio-dark);
    font-size: 12px;
    font-weight: 850;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .dreelio-profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dreelio-profile-copy { min-width: 0; flex: 1; }
  .dreelio-profile-name { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dreelio-profile-role { margin-top: 2px; color: rgba(255,255,255,0.5); font-size: 11.5px; font-weight: 650; }

  .dreelio-logout {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.7);
  }

  .dreelio-content {
    min-width: 0;
    padding: 4px 2px 0;
  }

  .dreelio-mobile-topbar { display: none; }

  .dreelio-overview {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) repeat(2, minmax(210px, 0.7fr));
    gap: 16px;
    margin: 0 0 18px;
  }

  .dreelio-welcome-card,
  .dreelio-kpi-card,
  .dreelio-panel {
    background: var(--dreelio-card) !important;
    border: 1px solid var(--dreelio-border) !important;
    border-radius: var(--dreelio-radius-lg) !important;
    box-shadow: var(--dreelio-shadow) !important;
  }

  .dreelio-welcome-card {
    position: relative;
    overflow: hidden;
    min-height: 272px;
    grid-row: span 2;
    padding: 26px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 30px;
    background:
      radial-gradient(circle at 88% 16%, rgba(54,90,49,0.13), transparent 31%),
      linear-gradient(135deg, #ffffff 0%, #f8f8f4 100%) !important;
  }

  .dreelio-card-topline {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .dreelio-chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: var(--dreelio-dark);
    color: #fff;
    font-size: 12px;
    font-weight: 760;
  }

  .dreelio-chip.muted {
    background: var(--dreelio-accent-soft);
    color: var(--dreelio-accent);
  }

  .dreelio-kicker,
  .dreelio-kpi-label {
    color: var(--dreelio-muted);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .dreelio-welcome-card h1 {
    max-width: 560px;
    margin: 8px 0 12px;
    color: var(--dreelio-text);
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    font-size: clamp(32px, 4vw, 58px);
    line-height: 0.96;
    letter-spacing: -0.06em;
  }

  .dreelio-welcome-card p {
    max-width: 580px;
    margin: 0;
    color: var(--dreelio-muted);
    font-size: 14.5px;
    line-height: 1.6;
    font-weight: 550;
  }

  .dreelio-quick-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dreelio-quick-row > div {
    padding: 14px;
    border-radius: 18px;
    background: #f5f5f1;
    border: 1px solid var(--dreelio-border);
  }

  .dreelio-quick-row span {
    display: block;
    color: var(--dreelio-muted);
    font-size: 12px;
    font-weight: 720;
  }

  .dreelio-quick-row strong {
    display: block;
    margin-top: 4px;
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    color: var(--dreelio-text);
    font-size: 24px;
    letter-spacing: -0.04em;
  }

  .dreelio-kpi-card {
    min-height: 128px;
    padding: 18px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .dreelio-kpi-card.is-warning {
    background: linear-gradient(135deg, #ffffff 0%, var(--dreelio-warning-soft) 100%) !important;
    border-color: rgba(184,91,43,0.18) !important;
  }

  .dreelio-kpi-icon {
    width: 42px;
    height: 42px;
    border-radius: 15px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    background: var(--dreelio-soft);
    color: var(--dreelio-accent);
    border: 1px solid var(--dreelio-border);
  }

  .dreelio-kpi-card.is-warning .dreelio-kpi-icon {
    color: var(--dreelio-warning);
    background: var(--dreelio-warning-soft);
  }

  .dreelio-kpi-copy { min-width: 0; }
  .dreelio-kpi-title {
    margin-top: 8px;
    color: var(--dreelio-text);
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    font-size: 20px;
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.04em;
  }
  .dreelio-kpi-title span { color: #a8aaa2; font-weight: 700; }
  .dreelio-kpi-number {
    margin-top: 8px;
    color: var(--dreelio-text);
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    font-size: 34px;
    line-height: 1;
    font-weight: 850;
    letter-spacing: -0.06em;
  }
  .dreelio-kpi-meta {
    margin-top: 7px;
    color: var(--dreelio-muted);
    font-size: 12.5px;
    font-weight: 650;
    line-height: 1.35;
  }

  .dreelio-main {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 0 40px !important;
  }

  .dreelio-main section {
    display: block;
  }

  .dreelio-main .tott-sectionhead {
    margin: 24px 0 12px !important;
    padding: 0 2px !important;
  }

  .dreelio-main .tott-h2,
  .tott-h2 {
    color: var(--dreelio-text) !important;
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif !important;
    font-size: 25px !important;
    line-height: 1.08 !important;
    letter-spacing: -0.045em !important;
  }

  .dreelio-panel,
  .dreelio-login-card {
    overflow: hidden;
  }

  .dreelio-panel {
    padding: 22px !important;
    margin-bottom: 16px !important;
  }

  .dreelio-me-card {
    background:
      linear-gradient(135deg, #ffffff 0%, #f8f8f4 100%) !important;
  }

  .dreelio-match-list {
    display: grid !important;
    gap: 14px !important;
  }

  .dreelio-match-card-row {
    border-radius: var(--dreelio-radius) !important;
    padding: 18px !important;
    margin: 0 !important;
  }

  .dreelio-table-wrap,
  .dreelio-rules-card,
  .dreelio-form-card,
  .dreelio-admin-panel,
  .dreelio-profile-main,
  .dreelio-team-stats {
    border-radius: var(--dreelio-radius) !important;
  }

  .dreelio-pot-card {
    color: var(--dreelio-text) !important;
    background:
      radial-gradient(circle at 86% 20%, rgba(54,90,49,0.12), transparent 38%),
      #ffffff !important;
  }

  .dreelio-pot-card * { color: inherit; }

  .dreelio-main input,
  .dreelio-main select,
  .dreelio-main textarea,
  .dreelio-login-card input,
  .dreelio-login-card select,
  .dreelio-login-card textarea {
    min-height: 44px;
    border-radius: 14px !important;
    background: #fbfbf8 !important;
    border: 1px solid var(--dreelio-border) !important;
    color: var(--dreelio-text) !important;
    box-shadow: none !important;
  }

  .dreelio-main input:focus,
  .dreelio-main select:focus,
  .dreelio-main textarea:focus,
  .dreelio-login-card input:focus {
    border-color: rgba(54,90,49,0.42) !important;
    outline: 3px solid rgba(54,90,49,0.10) !important;
    outline-offset: 0 !important;
  }

  .dreelio-main button,
  .dreelio-login-card button {
    border-radius: 999px !important;
  }

  .dreelio-main button[style*="var(--text)"],
  .dreelio-login-card button[type="submit"] {
    background: var(--dreelio-dark) !important;
    border-color: var(--dreelio-dark) !important;
    color: #fff !important;
  }

  .dreelio-main .tott-formrow {
    gap: 12px !important;
  }

  .dreelio-footer {
    padding: 8px 0 22px !important;
    color: #989b91 !important;
  }

  .dreelio-mobile-topbar .tott-header { display: none; }

  .dreelio-welcome-card,
  .dreelio-kpi-card,
  .dreelio-panel,
  .dreelio-activity-strip {
    animation: dreelioFadeUp 520ms ease both;
  }

  .dreelio-kpi-card:nth-child(2) { animation-delay: 40ms; }
  .dreelio-kpi-card:nth-child(3) { animation-delay: 80ms; }
  .dreelio-kpi-card:nth-child(4) { animation-delay: 120ms; }
  .dreelio-kpi-card:nth-child(5) { animation-delay: 160ms; }

  @keyframes dreelioFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dreelio-live-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    display: inline-block;
    flex: 0 0 auto;
    background: #68a354;
    box-shadow: 0 0 0 0 rgba(104,163,84,0.42);
    animation: dreelioPulse 1800ms ease-out infinite;
  }

  @keyframes dreelioPulse {
    0% { box-shadow: 0 0 0 0 rgba(104,163,84,0.42); }
    70% { box-shadow: 0 0 0 9px rgba(104,163,84,0); }
    100% { box-shadow: 0 0 0 0 rgba(104,163,84,0); }
  }

  .dreelio-chip .dreelio-live-dot {
    margin-right: 7px;
  }

  .dreelio-quick-action {
    width: 100%;
    min-height: 70px;
    padding: 14px;
    border-radius: 18px !important;
    background: #f5f5f1;
    border: 1px solid var(--dreelio-border);
    text-align: left;
    color: var(--dreelio-text);
  }

  .dreelio-quick-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 32px rgba(16,21,17,0.08);
  }

  .dreelio-quick-action.needs-attention {
    background: linear-gradient(135deg, #fff, var(--dreelio-warning-soft));
    border-color: rgba(184,91,43,0.18);
  }

  .dreelio-quick-action span {
    display: block;
    color: var(--dreelio-muted);
    font-size: 12px;
    font-weight: 720;
  }

  .dreelio-quick-action strong {
    display: block;
    margin-top: 4px;
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    color: var(--dreelio-text);
    font-size: 21px;
    letter-spacing: -0.04em;
  }

  .dreelio-activity-strip {
    margin: -2px 0 18px;
    padding: 14px 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 14px;
    background: rgba(255,255,255,0.82);
    border: 1px solid var(--dreelio-border);
    border-radius: 22px;
    box-shadow: 0 1px 1px rgba(16,21,17,0.03), 0 10px 30px rgba(16,21,17,0.04);
  }

  .dreelio-activity-main {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .dreelio-activity-main strong,
  .dreelio-activity-main span {
    display: block;
  }

  .dreelio-activity-main strong {
    color: var(--dreelio-text);
    font-size: 13px;
    font-weight: 850;
  }

  .dreelio-activity-main span {
    margin-top: 2px;
    color: var(--dreelio-muted);
    font-size: 12.5px;
    font-weight: 650;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dreelio-activity-avatars {
    min-width: 118px;
  }

  .dreelio-activity-stat {
    min-width: 74px;
    padding: 10px 12px;
    border-radius: 16px;
    background: #f6f6f3;
    border: 1px solid var(--dreelio-border);
  }

  .dreelio-activity-stat strong,
  .dreelio-activity-stat span {
    display: block;
  }

  .dreelio-activity-stat strong {
    font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
    font-size: 21px;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .dreelio-activity-stat span {
    margin-top: 4px;
    color: var(--dreelio-muted);
    font-size: 11px;
    font-weight: 760;
  }

  @media (prefers-reduced-motion: reduce) {
    .dreelio-welcome-card,
    .dreelio-kpi-card,
    .dreelio-panel,
    .dreelio-activity-strip,
    .dreelio-live-dot {
      animation: none !important;
    }
  }



  /* Club branding, badges and calm social layer */
  .tott-crest-img,
  .dreelio-sidebar-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: inherit;
  }

  .dreelio-sidebar-logo {
    overflow: hidden;
  }

  .dreelio-nav-badge {
    position: absolute;
    right: 10px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f3c86b;
    color: #17140b;
    font-size: 10px;
    font-weight: 850;
    box-shadow: 0 8px 20px rgba(0,0,0,0.20);
  }

  .dreelio-bell-button {
    position: relative;
    margin-left: auto;
    height: 34px;
    border: 1px solid var(--dreelio-border);
    background: #fff;
    color: var(--dreelio-text);
    border-radius: 999px;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 8px 22px rgba(16,21,17,0.06);
  }

  .dreelio-bell-button span {
    min-width: 17px;
    height: 17px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--dreelio-warning);
    color: #fff;
    font-size: 10px;
    font-weight: 850;
  }

  .dreelio-notification-popover {
    position: absolute;
    top: 48px;
    right: 18px;
    z-index: 15;
    width: min(310px, calc(100vw - 40px));
    padding: 10px;
    border-radius: 20px;
    background: rgba(255,255,255,0.96);
    border: 1px solid var(--dreelio-border);
    box-shadow: 0 22px 60px rgba(16,21,17,0.15);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .dreelio-popover-title {
    padding: 6px 8px 10px;
    font-size: 12px;
    font-weight: 850;
    color: var(--dreelio-text);
  }

  .dreelio-popover-empty,
  .dreelio-notification-popover button {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 10px;
    border-radius: 14px;
    border: 0;
    background: transparent;
    color: var(--dreelio-muted);
    font-size: 12.5px;
    line-height: 1.35;
    text-align: left;
  }

  .dreelio-notification-popover button:hover {
    background: var(--dreelio-soft);
    color: var(--dreelio-text);
  }

  .dreelio-dashboard-banner {
    height: 112px;
    border-radius: 22px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.62);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
  }

  .dreelio-dashboard-banner img,
  .dreelio-login-banner {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .dreelio-login-banner {
    height: 116px;
    margin: -8px -8px 16px;
    border-radius: 22px;
    border: 1px solid var(--dreelio-border);
  }

  .dreelio-home-updates {
    margin: 0 0 16px;
    padding: 14px;
    border-radius: 24px;
    background: #fff;
    border: 1px solid var(--dreelio-border);
    box-shadow: var(--dreelio-shadow);
  }

  .dreelio-home-updates-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .dreelio-home-updates-head strong,
  .dreelio-home-update-item strong {
    display: block;
    color: var(--dreelio-text);
    font-size: 13.5px;
  }

  .dreelio-home-updates-head span,
  .dreelio-home-update-item small {
    display: block;
    color: var(--dreelio-muted);
    font-size: 11.5px;
    margin-top: 2px;
  }

  .dreelio-home-updates-head button,
  .dreelio-post-actions button {
    border: 1px solid var(--dreelio-border);
    background: var(--dreelio-soft);
    color: var(--dreelio-text);
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11.5px;
    font-weight: 760;
  }

  .dreelio-home-updates-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dreelio-home-update-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px;
    border-radius: 16px;
    border: 1px solid var(--dreelio-border);
    background: #fbfbf8;
    text-align: left;
    min-width: 0;
  }

  .dreelio-home-update-item img,
  .dreelio-home-update-item > span {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    object-fit: cover;
    flex: 0 0 auto;
  }

  .dreelio-home-update-item > span {
    display: grid;
    place-items: center;
    background: var(--dreelio-accent-soft);
    color: var(--dreelio-accent);
  }

  .dreelio-updates-note {
    margin: -6px 0 14px;
  }

  .dreelio-muted-note {
    color: var(--dreelio-muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .dreelio-post-composer {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dreelio-composer-head,
  .dreelio-post-head,
  .dreelio-photo-admin-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dreelio-composer-head span,
  .dreelio-post-meta span {
    display: block;
    color: var(--dreelio-muted);
    font-size: 12px;
    margin-top: 2px;
  }

  .dreelio-post-avatar,
  .dreelio-photo-admin-avatar {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    border-radius: 15px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: var(--dreelio-soft);
    color: var(--dreelio-accent);
    border: 1px solid var(--dreelio-border);
    font-size: 12px;
    font-weight: 850;
  }

  .dreelio-post-avatar img,
  .dreelio-photo-admin-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dreelio-upload-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dreelio-upload-row span {
    color: var(--dreelio-muted);
    font-size: 12px;
  }

  .dreelio-file-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 12px;
    border-radius: 999px;
    border: 1px solid var(--dreelio-border);
    background: var(--dreelio-soft);
    color: var(--dreelio-text);
    font-size: 12px;
    font-weight: 780;
    cursor: pointer;
  }

  .dreelio-file-button input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .dreelio-image-preview-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dreelio-image-preview-row button {
    position: relative;
    width: 78px;
    height: 64px;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid var(--dreelio-border);
    padding: 0;
    background: var(--dreelio-soft);
  }

  .dreelio-image-preview-row img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .dreelio-image-preview-row svg {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(0,0,0,0.64);
    color: #fff;
    border-radius: 999px;
    padding: 2px;
  }

  .dreelio-pin-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--dreelio-muted);
    font-size: 12.5px;
    font-weight: 650;
  }

  .dreelio-post-list {
    display: grid;
    gap: 14px;
  }

  .dreelio-post-card {
    background: #fff;
    border: 1px solid var(--dreelio-border);
    border-radius: 24px;
    padding: 16px;
    box-shadow: var(--dreelio-shadow);
  }

  .dreelio-post-card.is-pinned {
    border-color: rgba(54,90,49,0.24);
    background: linear-gradient(180deg, #fff 0%, #f8fbf5 100%);
  }

  .dreelio-post-meta {
    min-width: 0;
    flex: 1;
  }

  .dreelio-post-category {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 6px 9px;
    color: var(--dreelio-accent);
    background: var(--dreelio-accent-soft);
    font-size: 11px;
    font-weight: 780;
    white-space: nowrap;
  }

  .dreelio-post-category.pinned {
    color: #7a5411;
    background: #fff2cc;
  }

  .dreelio-post-body h3 {
    margin: 14px 0 5px;
    color: var(--dreelio-text);
    font-size: 18px;
    letter-spacing: -0.03em;
  }

  .dreelio-post-body p {
    margin: 0;
    color: var(--dreelio-muted);
    font-size: 14px;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  .dreelio-post-images {
    display: grid;
    gap: 8px;
    margin-top: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dreelio-post-images.count-1 {
    grid-template-columns: 1fr;
  }

  .dreelio-post-images button {
    min-height: 170px;
    border: 0;
    border-radius: 18px;
    overflow: hidden;
    padding: 0;
    background: var(--dreelio-soft);
  }

  .dreelio-post-images img {
    width: 100%;
    height: 100%;
    min-height: inherit;
    object-fit: cover;
    display: block;
    transition: transform 180ms ease;
  }

  .dreelio-post-images button:hover img {
    transform: scale(1.025);
  }

  .dreelio-post-actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .dreelio-post-actions button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dreelio-lightbox {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(16,21,17,0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .dreelio-lightbox img {
    max-width: min(980px, 94vw);
    max-height: 88vh;
    border-radius: 24px;
    box-shadow: 0 30px 90px rgba(0,0,0,0.36);
  }

  .dreelio-lightbox button {
    position: fixed;
    top: 18px;
    right: 18px;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.16);
    color: #fff;
  }

  .dreelio-route-link {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 3px 9px;
    color: var(--dreelio-accent);
    background: var(--dreelio-accent-soft);
    text-decoration: none;
    font-size: 11.5px;
    font-weight: 760;
  }

  .dreelio-admin-only-note {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 7px 10px;
    color: var(--dreelio-muted);
    background: var(--dreelio-soft);
    font-size: 11.5px;
    font-weight: 720;
    white-space: nowrap;
  }

  .dreelio-branding-admin,
  .dreelio-photo-admin-list {
    margin-bottom: 16px;
  }

  .dreelio-photo-admin-list {
    padding: 8px !important;
  }

  .dreelio-photo-admin-row {
    padding: 10px;
    border-bottom: 1px solid var(--dreelio-border);
  }

  .dreelio-photo-admin-row:last-child {
    border-bottom: 0;
  }

  .dreelio-photo-admin-main {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 7px;
  }

  .dreelio-photo-admin-main strong {
    font-size: 13px;
    color: var(--dreelio-text);
  }

  @media (max-width: 1080px) {
    .dreelio-shell {
      grid-template-columns: 232px minmax(0, 1fr);
      gap: 14px;
      padding: 14px;
    }
    .dreelio-sidebar { top: 14px; height: calc(100vh - 28px); padding: 14px; }
    .dreelio-overview { grid-template-columns: 1fr 1fr; }
    .dreelio-welcome-card { grid-column: 1 / -1; grid-row: auto; min-height: auto; }
  }

  @media (max-width: 820px) {
    .dreelio-shell {
      display: block;
      padding: 10px 10px 92px;
    }

    .dreelio-content {
      padding: 0;
    }

    .dreelio-sidebar {
      position: fixed;
      left: max(10px, env(safe-area-inset-left));
      right: max(10px, env(safe-area-inset-right));
      bottom: max(10px, env(safe-area-inset-bottom));
      top: auto;
      z-index: 80;
      height: 68px;
      margin: 0;
      padding: 8px;
      border-radius: 24px;
      box-shadow: 0 18px 60px rgba(16,21,17,0.22);
    }

    .dreelio-sidebar::after,
    .dreelio-sidebar-brand,
    .dreelio-sidebar-card,
    .dreelio-sidebar-spacer,
    .dreelio-profile-card,
    .dreelio-sidebar-group-label {
      display: none;
    }

    .dreelio-sidebar-nav {
      height: 100%;
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 5px;
      overflow: visible;
      padding: 0;
    }

    .dreelio-side-link {
      width: 100%;
      min-width: 0;
      min-height: 0;
      height: 52px;
      padding: 5px 3px;
      border-radius: 17px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      font-size: 10.5px;
      line-height: 1.05;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
    }

    .dreelio-side-link span:last-child {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dreelio-side-icon {
      width: 25px;
      height: 25px;
      border-radius: 10px;
    }

    .dreelio-mobile-topbar {
      display: block;
      position: sticky;
      top: 8px;
      z-index: 40;
    }

    .dreelio-mobile-topbar .tott-header {
      display: flex;
      margin-bottom: 10px;
      border-radius: 22px !important;
      background: rgba(255,255,255,0.92) !important;
      border: 1px solid var(--dreelio-border) !important;
      box-shadow: 0 12px 36px rgba(16,21,17,0.08) !important;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    .dreelio-overview {
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }

    .dreelio-welcome-card {
      min-height: auto;
      padding: 18px;
      border-radius: 22px !important;
      gap: 14px;
    }

    .dreelio-card-topline {
      display: flex;
      gap: 6px;
    }

    .dreelio-card-topline .dreelio-chip.muted {
      display: none;
    }

    .dreelio-bell-button {
      height: 31px;
      padding: 0 9px;
    }

    .dreelio-dashboard-banner {
      height: 86px;
      border-radius: 17px;
    }

    .dreelio-welcome-card h1 {
      margin: 5px 0 0;
      font-size: clamp(25px, 8vw, 34px);
      line-height: 1.02;
    }

    .dreelio-welcome-card p {
      display: none;
    }

    .dreelio-quick-row {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .dreelio-quick-action {
      min-height: 58px;
      padding: 11px;
      border-radius: 15px !important;
    }

    .dreelio-quick-action strong {
      font-size: 17px;
    }

    .dreelio-kpi-card {
      min-height: auto;
      padding: 15px;
      border-radius: 20px !important;
    }

    .dreelio-countdown-card {
      display: none;
    }

    .dreelio-activity-strip {
      grid-template-columns: 1fr auto;
      gap: 10px;
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 18px;
    }

    .dreelio-activity-avatars {
      min-width: 96px;
      justify-self: end;
    }

    .dreelio-activity-stat {
      display: none;
    }

    .dreelio-main {
      scroll-margin-top: 88px;
    }

    .dreelio-home-updates-list,
    .dreelio-post-images {
      grid-template-columns: 1fr;
    }

    .dreelio-post-images button {
      min-height: 190px;
    }

    .dreelio-post-card,
    .dreelio-post-composer,
    .dreelio-home-updates {
      border-radius: 19px;
      padding: 14px;
    }

    .dreelio-post-head {
      gap: 9px;
    }

    .dreelio-post-category {
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dreelio-photo-admin-row {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .dreelio-photo-admin-row button {
      margin-left: 54px;
    }
  }

  @media (max-width: 560px) {
    .dreelio-shell { padding: 8px 8px 90px; }
    .dreelio-sidebar { height: 66px; border-radius: 22px; padding: 7px; }
    .dreelio-side-link { font-size: 9.8px; height: 52px; }
    .dreelio-side-icon { width: 24px; height: 24px; }
    .dreelio-welcome-card,
    .dreelio-kpi-card,
    .dreelio-panel {
      border-radius: 19px !important;
    }
    .dreelio-panel { padding: 16px !important; }
    .dreelio-main .tott-h2, .tott-h2 { font-size: 22px !important; }
    .dreelio-kpi-number { font-size: 28px; }
    .dreelio-kpi-title { font-size: 18px; }
    .dreelio-kpi-icon { width: 38px; height: 38px; border-radius: 13px; }
    .dreelio-activity-main span { max-width: 185px; }
    .tott-main { padding-left: 0 !important; padding-right: 0 !important; }
  }
`;

const styles = {
  app: {
    minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column",
  },
  loadingScreen: { padding: 60, textAlign: "center", color: "var(--text-dim)" },

  loginWrap: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  loginCard: {
    width: "100%", maxWidth: 360, background: "var(--card)", border: "1px solid var(--line)",
    borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 4, boxShadow: "var(--shadow)",
  },
  loginIcon: {
    width: 38, height: 38, borderRadius: 12, background: "var(--text)", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 10,
  },
  loginTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 4 },
  loginSub: { fontSize: 12.5, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.5 },
  loginLabel: { fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600, marginTop: 10, marginBottom: 6 },
  pwRow: { display: "flex", gap: 6 },
  pwToggle: {
    background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 999,
    padding: "0 12px", color: "var(--text-dim)",
  },
  loginError: {
    display: "flex", alignItems: "center", gap: 6, color: "var(--warn)",
    fontSize: 12.5, marginTop: 12, lineHeight: 1.4,
  },
  primaryBtnFull: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: "var(--text)", border: "none", color: "#fff",
    padding: "13px 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, marginTop: 18, width: "100%",
  },

  header: { display: "flex", alignItems: "center", gap: 14, padding: "20px 20px 16px", borderBottom: "1px solid var(--line)" },
  crest: {
    width: 44, height: 44, borderRadius: 12, background: "var(--text)",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700, fontSize: 12, letterSpacing: "0.5px", flexShrink: 0, color: "#fff",
  },
  clubName: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: "-0.2px" },
  clubSub: { fontSize: 12.5, color: "var(--text-dim)", marginTop: 2 },
  logoutBtn: {
    background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 999,
    padding: "8px 10px", color: "var(--text-dim)", flexShrink: 0,
  },

  heroWrap: { display: "flex", gap: 14, padding: "20px 20px 0" },
  heroCard: {
    flex: "1.4", minWidth: 0, background: "var(--card)",
    borderRadius: 28, padding: "24px 26px", color: "var(--text)", display: "flex", flexDirection: "column",
    gap: 6, boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", position: "relative", overflow: "hidden",
  },
  heroTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  heroDateBadge: {
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
    background: "var(--bg-soft)", color: "var(--text-dim)", borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap",
  },
  heroPillBadge: {
    fontSize: 10.5, fontWeight: 700, background: "var(--accent-soft)", color: "var(--accent)",
    borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap",
  },
  heroLabel: { fontSize: 11.5, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" },
  heroTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 23, fontWeight: 700, lineHeight: 1.25, marginTop: 3, color: "var(--text)" },
  heroCountdown: {
    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
    marginTop: 12, color: "var(--accent)",
  },

  heroSideCol: { flex: "1", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 },
  heroStatCard: {
    flex: 1, display: "flex", alignItems: "center", gap: 11, background: "var(--card)", color: "var(--text)",
    border: "1px solid var(--line)", borderRadius: 20, padding: "14px 16px", boxShadow: "var(--shadow)",
  },
  heroStatCardWarn: { background: "var(--warn-soft)", border: "1px solid var(--warn-soft)" },
  heroStatIconWrap: {
    width: 32, height: 32, borderRadius: "50%", background: "var(--bg-soft)", display: "flex",
    alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0,
  },
  heroStatValue: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, lineHeight: 1.15, color: "var(--text)" },
  heroStatLabel: { fontSize: 10.5, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.25 },

  nav: {
    display: "flex", gap: 4, padding: "12px 20px", margin: "12px 20px 0",
    background: "var(--bg-soft)", borderRadius: 999, border: "1px solid var(--line)",
  },
  navBtn: {
    display: "flex", alignItems: "center", gap: 7, padding: "9px 15px", background: "transparent",
    border: "none", color: "var(--text-dim)", fontSize: 13.5, fontWeight: 600,
    borderRadius: 999, whiteSpace: "nowrap",
  },
  navBtnActive: { color: "var(--text)", background: "var(--card)", boxShadow: "var(--shadow-sm)" },
  main: { flex: 1, padding: "24px 20px 40px", maxWidth: 880, width: "100%", margin: "0 auto" },

  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 3 },
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, margin: 0, fontWeight: 700 },
  h3: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, margin: "22px 0 10px" },

  addBtn: {
    display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", border: "1px solid var(--line)",
    color: "var(--text)", padding: "8px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600,
  },
  primaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--accent)",
    border: "none", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap",
  },
  secondaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent",
    border: "1px solid var(--line)", color: "var(--text)", padding: "10px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 600,
  },
  formCard: {
    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--shadow)",
    padding: 16, marginBottom: 18, display: "flex", flexDirection: "column", gap: 10,
  },
  formRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: {
    flex: 1, minWidth: 140, background: "var(--bg-soft)", border: "1px solid var(--line)",
    borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 13.5,
  },
  textarea: {
    width: "100%", background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 10,
    padding: "10px 12px", color: "var(--text)", fontSize: 13.5, resize: "vertical", marginTop: 10,
  },

  matchList: { display: "flex", flexDirection: "column", gap: 12 },
  matchCard: {
    display: "flex", alignItems: "center", gap: 14,
    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 22, padding: "18px 20px", boxShadow: "var(--shadow)",
    color: "var(--text)",
  },
  matchCardCol: { flexDirection: "column", alignItems: "stretch", gap: 0 },
  matchCardTop: { display: "flex", alignItems: "center", gap: 14, paddingBottom: 12 },
  matchTypeTag: {
    display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700,
    letterSpacing: "0.2px", borderRadius: 999, padding: "5px 10px", flexShrink: 0,
  },
  matchMain: { flex: 1, minWidth: 0 },
  matchOpponent: { fontWeight: 700, fontSize: 14.5, marginBottom: 4, color: "var(--text)" },
  matchMeta: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-dim)" },
  metaItem: { display: "flex", alignItems: "center", gap: 5 },
  iconBtn: { background: "transparent", border: "none", color: "var(--text-dim)", padding: 6 },
  iconBtnGhost: { background: "transparent", border: "none", color: "var(--text-dim)", padding: 4 },

  lineupPreviewWrap: { display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12 },
  lineupPreview: {
    fontSize: 12, color: "var(--text-dim)", padding: 0, display: "flex",
    alignItems: "flex-start", gap: 6, lineHeight: 1.5,
  },
  avatarStack: { display: "flex", alignItems: "center" },
  avatarStackItem: {
    width: 26, height: 26, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)",
    border: "2px solid var(--card)", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: 700, overflow: "hidden", flexShrink: 0,
  },
  avatarStackImg: { width: "100%", height: "100%", objectFit: "cover" },
  avatarStackMore: { background: "var(--bg-soft)", color: "var(--text-dim)" },

  scoreBadge: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700,
    color: "var(--text)", background: "var(--bg)", border: "1px solid var(--line)",
    borderRadius: 7, padding: "4px 10px", flexShrink: 0,
  },
  scoreInputRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  scoreInputTeam: { fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" },
  scoreInputDash: { color: "var(--text-dim)" },
  scoreInput: {
    width: 56, textAlign: "center", background: "var(--bg)", border: "1px solid var(--line)",
    borderRadius: 7, padding: "8px 6px", color: "var(--text)", fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
  },
  statsHint: { fontSize: 11.5, color: "var(--text-dim)", marginTop: 14, lineHeight: 1.4 },

  unsureWarning: {
    display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11.5, color: "#A6790A",
    background: "rgba(166,121,10,0.08)", borderRadius: 12, padding: "8px 10px", marginBottom: 10, lineHeight: 1.4,
  },

  attendanceToggle: {
    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
    background: "transparent", border: "none", borderTop: "1px solid var(--line)",
    color: "var(--text-dim)", padding: "10px 0 2px", fontSize: 12.5, fontWeight: 600,
  },
  attendanceSummary: { display: "flex", alignItems: "center", gap: 4 },
  attendanceToggleLabel: { display: "flex", alignItems: "center", gap: 5 },
  attendanceList: { display: "flex", flexDirection: "column", gap: 10, padding: "10px 0 4px" },
  attendanceFullRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  attendanceName: { fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 100, color: "var(--text)" },
  attendanceStatusWrap: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  statusPillStatic: {
    display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid var(--line)",
    borderRadius: 999, padding: "4px 10px", fontSize: 11.5, fontWeight: 600, color: "var(--text-dim)",
  },
  adminReason: {
    display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--text-dim)",
    fontStyle: "italic", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },

  lineupSection: { marginTop: 4 },
  lineupEditor: { padding: "10px 0 4px" },
  lineupLabel: { fontSize: 11.5, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 },
  lineupGrid: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 },
  lineupChip: {
    border: "1px solid var(--line)", borderRadius: 7, padding: "7px 11px", fontSize: 12.5,
    fontWeight: 600, background: "transparent", color: "var(--text-dim)",
  },
  lineupChipActive: { borderColor: "var(--success)", color: "var(--success)", background: "var(--accent-soft)" },
  lineupChipActiveKeeper: { borderColor: "var(--text)", color: "var(--text)", background: "var(--bg-soft)" },
  lineupChipDisabled: { opacity: 0.35 },
  lineupEmpty: { fontSize: 12.5, color: "var(--text-dim)", padding: "10px 0" },
  goalsListLight: { background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", marginBottom: 4 },
  goalsListRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid var(--line)" },
  goalsListText: { flex: 1, fontSize: 13.5, color: "var(--text)" },

  meCard: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 16, marginBottom: 20, boxShadow: "var(--shadow)" },
  meCardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  meCardTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16.5, fontWeight: 700 },
  catTag: {
    fontSize: 10.5, fontWeight: 700, color: "var(--accent)", border: "1px solid var(--accent)",
    borderRadius: 999, padding: "3px 9px", flexShrink: 0, whiteSpace: "nowrap", background: "var(--accent-soft)",
  },
  meCardMatch: { fontSize: 13, color: "var(--text-dim)", marginBottom: 14 },
  meBtnRow: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },
  meBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    border: "1px solid var(--line)", borderRadius: 14, padding: "14px 8px",
    background: "var(--bg-soft)", color: "var(--text)", fontSize: 13, fontWeight: 700,
  },
  deadlineNote: { fontSize: 11.5, color: "var(--text-dim)", marginTop: 10 },
  deadlinePassed: {
    display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--warn)",
    background: "var(--warn-soft)", borderRadius: 12, padding: "10px 12px",
  },
  myReason: { fontSize: 12, color: "var(--text-dim)", marginTop: 10, fontStyle: "italic" },

  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(24,24,21,0.45)", display: "flex",
    alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50,
  },
  modalCard: { width: "100%", maxWidth: 380, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 18, boxShadow: "var(--shadow)" },
  modalTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 15.5, fontWeight: 700, marginBottom: 4 },
  modalSub: { fontSize: 12, color: "var(--text-dim)" },
  modalActions: { display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" },

  rulesCard: { background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 22, overflow: "hidden", marginBottom: 14, boxShadow: "var(--shadow)" },
  ruleRow: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid var(--line)" },
  ruleNum: { fontFamily: "'JetBrains Mono', monospace", color: "var(--accent-soft)", fontSize: 12.5, flexShrink: 0 },
  ruleText: { flex: 1, fontSize: 14, lineHeight: 1.5, color: "var(--text)" },
  fineAmount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 700, color: "var(--accent)", flexShrink: 0 },
  addRuleRow: { display: "flex", gap: 10, marginTop: 16 },

  potCard: {
    display: "flex", alignItems: "center", gap: 16, background: "var(--card)", color: "var(--text)",
    border: "1px solid var(--line)", borderRadius: 22, padding: 18, marginBottom: 8, boxShadow: "var(--shadow)",
  },
  potAmount: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)" },
  potSub: { fontSize: 12.5, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 },

  legend: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, fontSize: 12.5, color: "var(--text-dim)" },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  legendAmount: { fontFamily: "'JetBrains Mono', monospace", color: "var(--text)" },
  tableWrap: { background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 22, overflow: "auto", marginBottom: 16, boxShadow: "var(--shadow)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left", padding: "12px 14px", fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.4px", color: "var(--text-dim)", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap",
  },
  thName: {
    textAlign: "left", padding: "12px 14px", fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.4px", color: "var(--text-dim)", borderBottom: "1px solid var(--line)",
  },
  tr: {},
  td: { padding: "12px 14px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap", color: "var(--text)" },
  tdName: { padding: "12px 14px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 13.5, color: "var(--text)" },
  warnBadge: { display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 10, fontSize: 10.5, color: "var(--warn)", fontWeight: 600 },
  statusPill: {
    display: "flex", alignItems: "center", gap: 5, border: "1px solid var(--line)",
    borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "transparent",
  },
  pillPaid: { color: "var(--accent)", borderColor: "var(--accent-soft)", background: "var(--accent-soft)" },
  pillOpen: { color: "var(--warn)", borderColor: "var(--warn-soft)", background: "var(--warn-soft)" },
  myFeeList: { display: "flex", flexDirection: "column", gap: 8 },
  myFeeRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  myFeeName: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 },

  profileCard: { background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, marginBottom: 16, boxShadow: "var(--shadow)" },
  profileTop: { display: "flex", alignItems: "center", gap: 14 },
  profilePhoto: {
    width: 56, height: 56, borderRadius: "50%", background: "var(--bg-soft)", border: "1px solid var(--line)",
    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", flexShrink: 0, overflow: "hidden",
  },
  profilePhotoImg: { width: "100%", height: "100%", objectFit: "cover" },
  profileName: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)" },
  profileMeta: { fontSize: 12, color: "var(--text-dim)", marginTop: 3 },
  editBtn: {
    display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", border: "1px solid var(--line)",
    color: "var(--text)", padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, flexShrink: 0,
  },
  profileEditForm: { display: "flex", flexDirection: "column", gap: 4, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" },
  statGridRow: { display: "flex", gap: 14, marginTop: 18, alignItems: "stretch" },
  donutCard: {
    flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    justifyContent: "center", background: "var(--bg-soft)", border: "1px solid var(--line)",
    borderRadius: 18, padding: "14px 18px",
  },
  statGrid: { flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  statBox: { background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 18, padding: "12px 8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" },
  statValue: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" },
  statLabel: { fontSize: 10.5, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.3px" },

  teamStatsCard: { background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 22, padding: 20, boxShadow: "var(--shadow)" },
  teamStatRow: { display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--line)" },
  teamStatName: { flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--text)" },
  teamStatVal: { display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace", minWidth: 46, justifyContent: "flex-end" },

  adminPanel: { marginTop: 28 },
  beheerToggle: {
    display: "block", width: "100%", background: "transparent", border: "1px dashed var(--line)",
    borderRadius: 14, padding: "10px 14px", color: "var(--text-dim)", fontSize: 12.5, fontWeight: 600, textAlign: "center",
  },
  adminBody: { marginTop: 16 },
  adminRow: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)" },
  adminRowName: { fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", color: "var(--text)" },
  adminRowMeta: { fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 },
  adminActionBtn: {
    display: "flex", alignItems: "center", gap: 5, border: "1px solid var(--line)", borderRadius: 999,
    padding: "6px 10px", fontSize: 11.5, fontWeight: 600, background: "transparent", flexShrink: 0, whiteSpace: "nowrap",
  },
  adminActionBtnDanger: { color: "var(--warn)", borderColor: "var(--warn)" },
  adminActionBtnOk: { color: "var(--accent)", borderColor: "var(--accent)" },

  empty: { display: "flex", alignItems: "center", gap: 8, color: "var(--text-dim)", fontSize: 13.5, padding: "20px 4px" },
  footer: { textAlign: "center", padding: "18px 0 28px", fontSize: 11.5, color: "var(--text-dim)", borderTop: "1px solid var(--line)" },
};
