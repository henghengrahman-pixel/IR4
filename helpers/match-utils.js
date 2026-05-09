import { slugify } from './slug.js';

export const HOT_TEAMS = [
  // Indonesia
  'Persib','Persija','Persebaya','Arema','Bali United','PSM','Borneo FC','Madura United','Persis','Dewa United','Persita','PSIS','PSS','Semen Padang','Bhayangkara','PSIM',
  // England
  'Manchester United','Manchester City','Liverpool','Arsenal','Chelsea','Tottenham','Newcastle','Aston Villa','West Ham','Everton',
  // Spain
  'Real Madrid','Barcelona','Atletico Madrid','Sevilla','Valencia','Villarreal','Athletic Bilbao','Real Sociedad',
  // Italy
  'Inter','Inter Milan','AC Milan','Juventus','Roma','Lazio','Napoli','Atalanta','Fiorentina',
  // Germany
  'Bayern Munich','Borussia Dortmund','Leverkusen','RB Leipzig','Schalke',
  // France
  'PSG','Paris Saint Germain','Marseille','Lyon','Monaco','Lille',
  // Other popular
  'Al Nassr','Al Hilal','Al Ittihad','Al Ahli','LA Galaxy','Inter Miami','River Plate','Boca Juniors','Flamengo','Palmeiras'
];

export function cleanTeamName(value = ''){
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitMatchName(matchName = ''){
  const raw = cleanTeamName(matchName);
  const parts = raw.split(/\s+vs\s+|\s+v\s+|\s+-\s+/i).map(cleanTeamName).filter(Boolean);
  if (parts.length >= 2) return { home: parts[0], away: parts.slice(1).join(' vs ') };
  return { home: raw, away: '' };
}

export function makeMatchTitle(home = '', away = ''){
  const h = cleanTeamName(home);
  const a = cleanTeamName(away);
  return a ? `${h} vs ${a}` : h;
}

export function matchSlugFromTeams(home = '', away = ''){
  return slugify(makeMatchTitle(home, away));
}

export function matchSlugFromName(matchName = ''){
  const { home, away } = splitMatchName(matchName);
  return matchSlugFromTeams(home, away);
}

export function isHotMatch(home = '', away = '', league = ''){
  const text = `${home} ${away}`.toLowerCase();
  const leagueText = String(league || '').toLowerCase();
  const hotTeamCount = HOT_TEAMS.filter(team => text.includes(team.toLowerCase())).length;
  if (hotTeamCount >= 1) return true;
  if (leagueText.includes('champions league') || leagueText.includes('premier league') || leagueText.includes('liga 1') || leagueText.includes('indonesia')) return true;
  return false;
}

export function deterministicPercent(seedText = ''){
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) hash = ((hash << 5) - hash) + seedText.charCodeAt(i) | 0;
  const base = Math.abs(hash);
  const home = 38 + (base % 31);      // 38-68
  const draw = 16 + ((base >> 3) % 17); // 16-32
  let away = 100 - home - draw;
  if (away < 8) away = 8;
  const total = home + draw + away;
  return {
    home: Math.round(home * 100 / total),
    draw: Math.round(draw * 100 / total),
    away: Math.round(away * 100 / total)
  };
}

export function normalizeMatchItem(match = {}, league = '', post = {}){
  const title = match.match || makeMatchTitle(match.home, match.away);
  const teams = splitMatchName(title);
  const home = cleanTeamName(match.home || teams.home);
  const away = cleanTeamName(match.away || teams.away);
  const slug = match.slug || matchSlugFromTeams(home, away);
  const hot = Boolean(match.hotMatch ?? isHotMatch(home, away, league));
  const percent = match.percent || deterministicPercent(`${slug}-${match.pick || ''}-${match.score || ''}`);
  return {
    ...match,
    match: makeMatchTitle(home, away),
    home,
    away,
    slug,
    league,
    hotMatch: hot,
    percent,
    postTitle: post.title || '',
    postSlug: post.slug || '',
    postDate: post.createdAt || '',
    postThumbnail: post.thumbnail || ''
  };
}

export function buildMatchIndex(posts = []){
  const rows = [];
  for (const post of posts) {
    for (const group of (post.predictions || [])) {
      const league = group.league || 'Liga';
      for (const match of (group.matches || [])) {
        rows.push(normalizeMatchItem(match, league, post));
      }
    }
  }
  return rows;
}
