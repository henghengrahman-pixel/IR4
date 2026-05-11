import axios from "axios";

const DEFAULT_BASE_URL = "https://v3.football.api-sports.io";
const SEASON = process.env.SEASON || "2025";

const BLOCKED_KEYWORDS = [
  "women", "woman", "female", "feminine", "u17", "u18", "u19", "u20", "u21", "u22", "u23",
  "youth", "reserve", "reserves", "friendly", "friendlies", "amateur", "2nd", "second", "third",
  "liga 2", "serie b", "bundesliga 2", "ligue 2", "championship", "league one", "league two",
  "superettan", "obos", "ykkosliiga", "national league"
];

const DEFAULT_ALLOWED_LEAGUES = [
  "UEFA Champions League",
  "Champions League",
  "UEFA Europa League",
  "Europa League",
  "UEFA Europa Conference League",
  "Conference League",
  "England Premier League",
  "Premier League",
  "Spain La Liga",
  "La Liga",
  "Italy Serie A",
  "Serie A",
  "Germany Bundesliga",
  "Bundesliga",
  "France Ligue 1",
  "Ligue 1",
  "Indonesia Liga 1",
  "BRI Liga 1",
  "BRI Super League",
  "Liga 1",
  "Indonesia Super League"
];

const PRIORITY_LABELS = [
  "UEFA Champions League",
  "Champions League",
  "UEFA Europa League",
  "Europa League",
  "UEFA Europa Conference League",
  "Conference League",
  "England Premier League",
  "Premier League",
  "Spain La Liga",
  "La Liga",
  "Italy Serie A",
  "Serie A",
  "Germany Bundesliga",
  "Bundesliga",
  "France Ligue 1",
  "Ligue 1",
  "Indonesia Liga 1",
  "BRI Liga 1",
  "BRI Super League",
  "Liga 1",
  "Indonesia Super League"
];

function envList(name){
  return String(process.env[name] || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

export function normText(value = ""){
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanLogo(url){
  if (!url) return "";
  const src = String(url).trim();
  if (!src) return "";
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("http://")) return src.replace(/^http:\/\//i, "https://");
  return src;
}

function apiKey(){
  return process.env.FOOTBALL_API_KEY || process.env.API_FOOTBALL_KEY || "";
}

function apiHost(){
  return process.env.FOOTBALL_API_HOST || "api-football-v1.p.rapidapi.com";
}

function apiBaseUrl(){
  return process.env.FOOTBALL_API_BASE_URL || process.env.API_FOOTBALL_BASE_URL || DEFAULT_BASE_URL;
}

function headers(){
  const key = apiKey();
  const base = apiBaseUrl();
  if (!key) return {};

  if (/rapidapi/i.test(base) || process.env.FOOTBALL_API_PROVIDER === "rapidapi") {
    return {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": apiHost()
    };
  }

  return { "x-apisports-key": key };
}

export function footballHeaders(){
  return headers();
}

export function footballApiBaseUrl(){
  return apiBaseUrl().replace(/\/+$/, "");
}

export function hasFootballApiKey(){
  return Boolean(apiKey());
}

export async function footballApiGet(pathUrl, params = {}){
  const res = await axios.get(`${footballApiBaseUrl()}${pathUrl}`, {
    headers: headers(),
    params,
    timeout: Number(process.env.FOOTBALL_API_TIMEOUT || 15000)
  });
  return Array.isArray(res.data?.response) ? res.data.response : [];
}

export async function getFixturesByDate(date){
  if (!hasFootballApiKey()) {
    return {
      ok:false,
      error:"FOOTBALL_API_KEY/API_FOOTBALL_KEY belum diisi di Railway Variables.",
      fixtures:[]
    };
  }

  try {
    const fixtures = await footballApiGet("/fixtures", { date });
    return { ok:true, error:null, fixtures };
  } catch (err) {
    return {
      ok:false,
      error: err?.response?.data?.message || err?.response?.data || err.message,
      fixtures:[]
    };
  }
}

export function isAllowedPredictionLeague(input = {}){
  const leagueName = input.leagueName || input.league || input.name || "";
  const country = input.country || "";
  const combined = normText(`${country} ${leagueName}`);
  const leagueOnly = normText(leagueName);

  if (!leagueOnly) return false;
  if (BLOCKED_KEYWORDS.some(word => combined.includes(normText(word)))) return false;

  const allow = envList("PREDICTION_ALLOWED_LEAGUES").length
    ? envList("PREDICTION_ALLOWED_LEAGUES")
    : DEFAULT_ALLOWED_LEAGUES;

  return allow.some(label => {
    const wanted = normText(label);
    return combined.includes(wanted) || leagueOnly.includes(wanted) || wanted.includes(leagueOnly);
  });
}

export function leaguePriority(input = {}){
  const leagueName = input.leagueName || input.league || input.name || input.rawTitle || input.title || "";
  const country = input.country || "";
  const combined = normText(`${country} ${leagueName}`);
  const leagueOnly = normText(leagueName);

  for (let i = 0; i < PRIORITY_LABELS.length; i++) {
    const label = normText(PRIORITY_LABELS[i]);
    if (combined.includes(label) || leagueOnly.includes(label) || label.includes(leagueOnly)) return i;
  }

  return 999;
}

export function formatKickoffWib(iso){
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const hm = new Intl.DateTimeFormat("id-ID", { timeZone:"Asia/Jakarta", hour:"2-digit", minute:"2-digit", hour12:false }).format(d);
    const dm = new Intl.DateTimeFormat("id-ID", { timeZone:"Asia/Jakarta", day:"2-digit", month:"2-digit" }).format(d);
    return `${dm} ${hm} WIB`;
  } catch {
    return "-";
  }
}

function hashNum(text){
  let h = 2166136261;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function estimateBySeed(raw){
  const home = raw.homeName || "Home";
  const away = raw.awayName || "Away";
  const seed = hashNum(`${raw.fixtureId}-${home}-${away}-${raw.kickoffIso}`);
  const homePower = 45 + (hashNum(`${home}-home`) % 55);
  const awayPower = 45 + (hashNum(`${away}-away`) % 55);
  const diff = (homePower + 8 + (seed % 7)) - awayPower;

  let pickCode = "X";
  let tip = "Draw";
  if (diff > 9) { pickCode = "1"; tip = home; }
  if (diff < -6) { pickCode = "2"; tip = away; }

  let homeGoals = 1 + (seed % 3);
  let awayGoals = 1 + ((seed >> 3) % 3);
  if (pickCode === "1" && homeGoals <= awayGoals) homeGoals = awayGoals + 1;
  if (pickCode === "2" && awayGoals <= homeGoals) awayGoals = homeGoals + 1;
  if (pickCode === "X") {
    const g = (seed % 2) + 1;
    homeGoals = g;
    awayGoals = g;
  }

  homeGoals = Math.min(homeGoals, 4);
  awayGoals = Math.min(awayGoals, 4);

  const confidence = Math.max(55, Math.min(88, Math.round(58 + Math.abs(diff) * 1.15)));
  const totalGoals = homeGoals + awayGoals;
  const overUnder = totalGoals >= 3 ? "Over 2.5" : "Under 2.5";

  return {
    tip,
    pick: pickCode,
    confidence,
    predictedScore: `${homeGoals} - ${awayGoals}`,
    score: `${homeGoals} - ${awayGoals}`,
    overUnder,
    ou: totalGoals >= 3 ? "OVER" : "UNDER",
    odds: pickCode === "X" ? "Draw" : pickCode === "1" ? "Home" : "Away"
  };
}

export function normalizeFixture(row = {}){
  const homeObj = row?.teams?.home || row?.home || row?.homeTeam || {};
  const awayObj = row?.teams?.away || row?.away || row?.awayTeam || {};
  const leagueObj = row?.league || {};
  const fixtureObj = row?.fixture || {};
  const statusObj = fixtureObj?.status || row?.status || {};

  return {
    id: fixtureObj?.id || row?.fixtureId || row?.id || `${homeObj?.name || "home"}-${awayObj?.name || "away"}`,
    fixtureId: fixtureObj?.id || row?.fixtureId || row?.id || null,
    date: fixtureObj?.date || row?.date || row?.kickoffIso || "",
    timestamp: fixtureObj?.timestamp || row?.timestamp || 0,
    status: statusObj?.short || statusObj || "",
    league: leagueObj?.name || row?.leagueName || row?.league || "Liga",
    country: leagueObj?.country || row?.country || "",
    leagueLogo: cleanLogo(leagueObj?.logo || row?.leagueLogo || ""),
    leagueFlag: cleanLogo(leagueObj?.flag || row?.flag || ""),
    leagueId: leagueObj?.id || row?.leagueId || null,
    season: leagueObj?.season || row?.season || SEASON,
    home: homeObj?.name || row?.homeName || row?.home || "Home",
    away: awayObj?.name || row?.awayName || row?.away || "Away",
    homeId: homeObj?.id || row?.homeId || null,
    awayId: awayObj?.id || row?.awayId || null,
    homeLogo: cleanLogo(homeObj?.logo || row?.homeLogo || ""),
    awayLogo: cleanLogo(awayObj?.logo || row?.awayLogo || ""),
    goalsHome: row?.goals?.home ?? row?.score?.fulltime?.home ?? row?.homeGoals ?? null,
    goalsAway: row?.goals?.away ?? row?.score?.fulltime?.away ?? row?.awayGoals ?? null
  };
}

export function normalizePrediction(match = {}){
  const f = normalizeFixture(match);
  const base = {
    fixtureId: f.fixtureId,
    leagueId: f.leagueId,
    season: f.season,
    homeId: f.homeId,
    awayId: f.awayId,
    homeName: f.home,
    awayName: f.away,
    homeLogo: f.homeLogo,
    awayLogo: f.awayLogo,
    leagueName: f.league,
    leagueLogo: f.leagueLogo,
    leagueFlag: f.leagueFlag,
    country: f.country,
    kickoffIso: f.date,
    kickoffWib: formatKickoffWib(f.date),
    status: f.status,
    match: `${f.home} vs ${f.away}`
  };

  const estimated = estimateBySeed(base);
  const liveScore = f.goalsHome !== null || f.goalsAway !== null
    ? `${f.goalsHome ?? "-"} - ${f.goalsAway ?? "-"}`
    : "-";

  return {
    ...base,
    prediction: estimated.tip,
    tip: estimated.tip,
    pick: estimated.pick,
    confidence: estimated.confidence,
    predictedScore: estimated.predictedScore,
    score: estimated.score,
    currentScore: liveScore,
    overUnder: estimated.overUnder,
    ou: estimated.ou,
    odds: estimated.odds,
    form: match?.form || null,
    stats: match?.stats || null,
    h2h: match?.h2h || null
  };
}
