import axios from "axios";
import { normalizePrediction } from "./prediction-normalizer.js";

const DEFAULT_BASE_URL = "https://v3.football.api-sports.io";

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

  // Support 2 model API:
  // 1) API-Sports direct: x-apisports-key
  // 2) RapidAPI: X-RapidAPI-Key + X-RapidAPI-Host
  if (/rapidapi/i.test(base) || process.env.FOOTBALL_API_PROVIDER === "rapidapi") {
    return {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": apiHost()
    };
  }

  return {
    "x-apisports-key": key
  };
}

export function hasFootballApiKey(){
  return Boolean(apiKey());
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
    const res = await axios.get(`${apiBaseUrl().replace(/\/+$/, "")}/fixtures`, {
      headers: headers(),
      params: { date },
      timeout: Number(process.env.FOOTBALL_API_TIMEOUT || 15000)
    });

    return {
      ok:true,
      error:null,
      fixtures: Array.isArray(res.data?.response) ? res.data.response : []
    };
  } catch (err) {
    return {
      ok:false,
      error: err?.response?.data?.message || err?.response?.data || err.message,
      fixtures:[]
    };
  }
}

export function normalizeFixture(row){
  const p = normalizePrediction(row);
  return {
    id: p.id,
    date: p.rawDate || row?.fixture?.date || "",
    timestamp: row?.fixture?.timestamp || 0,
    status: p.status || "",
    league: p.leagueName || "Liga",
    country: row?.league?.country || "",
    home: p.homeName || "Home",
    away: p.awayName || "Away",
    normalized: p
  };
}
