import crypto from "crypto";

export const PRIORITY_LEAGUES = [
  "Liga 1 Indonesia","Liga 2 Indonesia","AFC Champions League","UEFA Champions League","UEFA Europa League","Premier League","FA Cup","EFL Cup","Serie A","Coppa Italia","La Liga","Copa del Rey","Bundesliga","DFB Pokal","Ligue 1","Eredivisie","Liga Portugal","Turkish Super Lig","Saudi Pro League","MLS","Japan J League","Korea K League","World Cup","Euro","Copa America"
];
const BLOCKED = ["women","female","feminine","u17","u18","u19","u20","u21","u22","u23","youth","reserve","reserves","friendly","friendlies","amateur","development","academy"];
const ALIASES = [
  ["liga 1 indonesia", ["liga 1","bri liga 1","indonesia super league"]],
  ["liga 2 indonesia", ["liga 2","indonesia liga 2"]],
  ["premier league", ["english premier league","england premier league"]],
  ["la liga", ["spain la liga","primera division"]],
  ["serie a", ["italy serie a","italian serie a"]],
  ["bundesliga", ["germany bundesliga"]],
  ["ligue 1", ["france ligue 1"]],
  ["eredivisie", ["netherlands eredivisie"]],
  ["liga portugal", ["portugal primeira liga"]],
  ["turkish super lig", ["turkiye super lig","super lig"]],
  ["saudi pro league", ["saudi arabia pro league"]],
  ["mls", ["major league soccer","usa major league soccer"]],
  ["japan j league", ["j1 league","j-league","j league"]],
  ["korea k league", ["k league 1","k-league 1"]]
];
const norm = (v="") => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const first = (...items) => items.find(v => v !== undefined && v !== null && String(v).trim() !== "");
const httpsUrl = (url="") => { const u=String(url||"").trim(); if(!u) return ""; if(u.startsWith("//")) return `https:${u}`; return u.replace(/^http:\/\//i,"https://"); };
const safeNum = (v, d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
function hashNum(text){ return parseInt(crypto.createHash("sha256").update(String(text)).digest("hex").slice(0,8),16); }
function formatWib(date){ if(!date) return ""; const d=new Date(date); if(Number.isNaN(d.getTime())) return String(date); return new Intl.DateTimeFormat("id-ID",{ timeZone:"Asia/Jakarta", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false }).format(d).replace(",","") + " WIB"; }
function team(row, side){
  const t = side === "home" ? row?.teams?.home : row?.teams?.away;
  const legacy = row?.[side] || row?.[`${side}Team`];
  return {
    name:first(legacy?.name, t?.name, row?.fixture?.[side]?.name, side === "home" ? row?.home_name : row?.away_name, side === "home" ? row?.homeName : row?.awayName, side === "home" ? "Home" : "Away"),
    logo:httpsUrl(first(legacy?.logo, t?.logo, legacy?.team?.logo, t?.team?.logo, row?.fixture?.[side]?.logo, side === "home" ? row?.homeLogo : row?.awayLogo))
  };
}
function leagueRank(name="", country=""){
  const hay = norm(`${country} ${name}`);
  if(BLOCKED.some(b => hay.includes(b))) return -1;
  for(let i=0;i<PRIORITY_LEAGUES.length;i++){
    const p=norm(PRIORITY_LEAGUES[i]);
    if(hay.includes(p)) return i;
    const alias = ALIASES.find(([key]) => key === p);
    if(alias && alias[1].some(a => hay.includes(norm(a)))) return i;
  }
  return -1;
}
export function isAllowedLeague(rowOrName){
  if(typeof rowOrName === "string") return leagueRank(rowOrName) >= 0;
  return leagueRank(rowOrName?.league?.name || rowOrName?.leagueName || rowOrName?.league, rowOrName?.league?.country || rowOrName?.country) >= 0;
}
export function getLeaguePriority(rowOrName){
  if(typeof rowOrName === "string") return leagueRank(rowOrName);
  const r=leagueRank(rowOrName?.league?.name || rowOrName?.leagueName || rowOrName?.league, rowOrName?.league?.country || rowOrName?.country);
  return r < 0 ? 9999 : r;
}
export function hasStablePrediction(p){
  return Boolean(p?.homeName && p?.awayName && p?.leagueName && p?.homeLogo && p?.awayLogo && p?.prediction && p?.predictedScore && p?.odds);
}
export function normalizePrediction(match={}){
  const home = team(match,"home"); const away = team(match,"away");
  const leagueName = first(match?.league?.name, match?.leagueName, match?.league, "Liga");
  const leagueLogo = httpsUrl(first(match?.league?.logo, match?.leagueLogo));
  const date = first(match?.fixture?.date, match?.date, match?.kickoff, match?.time);
  const status = first(match?.fixture?.status?.short, match?.status?.short, match?.status, "NS");
  const scoreHome = first(match?.goals?.home, match?.score?.fulltime?.home, match?.score?.home, match?.homeScore);
  const scoreAway = first(match?.goals?.away, match?.score?.fulltime?.away, match?.score?.away, match?.awayScore);
  const score = scoreHome !== undefined && scoreAway !== undefined ? `${scoreHome} - ${scoreAway}` : first(match?.scoreText, match?.score, "-");
  const seed = hashNum(`${match?.fixture?.id || match?.id || ""}-${home.name}-${away.name}-${date}`);
  const hg0 = 1 + (seed % 3); const ag0 = ((seed >> 3) % 3);
  let confidence = safeNum(first(match?.confidence, match?.prediction?.confidence), 58 + (seed % 28));
  confidence = Math.max(50, Math.min(92, confidence));
  let pick = first(match?.prediction?.pick, match?.pick, match?.prediction);
  let predictedScore = first(match?.predictedScore, match?.prediction?.predictedScore, match?.scorePrediction);
  if(!pick || !predictedScore){
    let hg=hg0, ag=ag0;
    const diff = (hashNum(home.name)%100) + 8 - (hashNum(away.name)%100);
    pick = diff > 8 ? "1" : diff < -8 ? "2" : "X";
    if(pick === "1" && hg <= ag) hg = ag + 1;
    if(pick === "2" && ag <= hg) ag = hg + 1;
    if(pick === "X") { hg = 1 + (seed % 2); ag = hg; }
    hg=Math.min(hg,4); ag=Math.min(ag,4);
    predictedScore = `${hg} - ${ag}`;
  }
  const nums = String(predictedScore).match(/\d+/g)?.map(Number) || [1,1];
  const overUnder = first(match?.overUnder, match?.ou, match?.prediction?.overUnder, (nums[0]+nums[1] >= 3 ? "OVER" : "UNDER"));
  const odds = first(match?.odds, match?.prediction?.odds, pick === "X" ? "3.10" : (1.65 + (seed % 80) / 100).toFixed(2));
  const form = match?.form || { home:["W","D","W"], away:["D","W","L"] };
  const stats = match?.stats || match?.statistics || { possession:"-", shots:"-", attacks:"-" };
  const h2h = match?.h2h || [];
  return {
    id:first(match?.fixture?.id, match?.id, `${home.name}-${away.name}`), homeName:home.name, awayName:away.name, homeLogo:home.logo, awayLogo:away.logo,
    leagueName, leagueLogo, kickoffWib:formatWib(date), rawDate:date || "", status, score,
    prediction:String(pick).toUpperCase(), predictedScore:String(predictedScore), overUnder:String(overUnder).toUpperCase(), confidence, odds:String(odds), form, stats, h2h
  };
}
export function predictionToLegacyRow(p){
  return { match:`${p.homeName} vs ${p.awayName}`, pick:p.prediction, ou:p.overUnder, score:p.predictedScore, odds:p.odds, confidence:p.confidence, kickoff:p.kickoffWib, homeLogo:p.homeLogo, awayLogo:p.awayLogo, leagueLogo:p.leagueLogo, stats:p.stats, form:p.form, h2h:p.h2h, normalized:p };
}
