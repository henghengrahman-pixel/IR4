
export function calcOdds(pick = "1", ou = "OVER"){
  let base = pick === "X" ? 3.10 : 1.82;
  if (ou === "UNDER") base += 0.08;
  return Number(base.toFixed(2));
}

export function flattenPredictions(predictions = []){
  const rows = [];
  for (const league of predictions || []) {
    for (const match of league.matches || []) {
      rows.push({
        league: league.league,
        ...match,
        odds: match.odds || calcOdds(match.pick, match.ou),
        confidence: match.confidence || (
          match.pick === "X" ? 62 : match.ou === "OVER" ? 74 : 69
        )
      });
    }
  }
  return rows;
}

export function buildParlayInsights(predictions = []){
  const rows = flattenPredictions(predictions);

  const safePick = [...rows]
    .sort((a,b)=> (b.confidence || 0) - (a.confidence || 0))[0] || null;

  const bigMatchKeywords = [
    "Manchester", "Liverpool", "Arsenal", "Chelsea", "Tottenham",
    "Real Madrid", "Barcelona", "Atletico", "Inter", "Milan",
    "Juventus", "Bayern", "Dortmund", "PSG", "Persib", "Persija"
  ];

  const bigMatches = rows.filter(row =>
    bigMatchKeywords.some(k =>
      String(row.match || "").toLowerCase().includes(k.toLowerCase())
    )
  ).slice(0, 5);

  const parlay3 = [...rows]
    .filter(r => r.pick !== "X")
    .sort((a,b)=> (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 3);

  const estimatedOdds = parlay3
    .reduce((acc,row)=> acc * Number(row.odds || 1.8), 1);

  const winRate = rows.length
    ? Math.min(86, Math.max(61, Math.round(rows.reduce((s,r)=>s+(r.confidence||65),0)/rows.length)))
    : 0;

  return {
    rows,
    safePick,
    bigMatches,
    parlay3,
    estimatedOdds: Number(estimatedOdds.toFixed(2)),
    winRate
  };
}
