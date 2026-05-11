import express from "express";
import axios from "axios";

import {
  generateDailyParlay,
  getAutoParlayStatus
} from "../helpers/auto-parlay.js";

import {
  isAllowedPredictionLeague,
  leaguePriority,
  normalizePrediction,
  sortPredictionMatches,
  footballApiBaseUrl,
  footballHeaders,
  hasFootballApiKey
} from "../helpers/football-api.js";

const router = express.Router();

/* =========================
   CONFIG
========================= */

const API =
  footballApiBaseUrl();

const API_HEADERS =
  footballHeaders();

const CACHE_TTL =
  Number(
    process.env.CACHE_TTL ||
    300
  );

/* =========================
   CACHE
========================= */

const cache =
  new Map();

function getCache(key){

  const row =
    cache.get(key);

  if(!row){
    return null;
  }

  if(
    Date.now() >
    row.exp
  ){

    cache.delete(key);

    return null;

  }

  return row.val;

}

function setCache(
  key,
  val,
  ttl=CACHE_TTL
){

  cache.set(
    key,
    {
      val,
      exp:
        Date.now() +
        ttl * 1000
    }
  );

}

/* =========================
   AUTH
========================= */

function canRunAutoParlay(req){

  if(
    req.session?.isAdmin
  ){
    return true;
  }

  const secret =
    process.env.AUTO_PARLAY_SECRET ||

    process.env.ADMIN_PASSWORD ||

    "";

  const given =
    req.headers[
      "x-auto-parlay-secret"
    ] ||

    req.query.secret ||

    "";

  return Boolean(
    secret &&
    given &&
    String(secret) ===
    String(given)
  );

}

/* =========================
   API GET
========================= */

async function apiGet(
  path,
  params={}
){

  const cacheKey =
    `${path}:${JSON.stringify(params)}`;

  const cached =
    getCache(cacheKey);

  if(cached){
    return cached;
  }

  const { data } =
    await axios.get(
      `${API}${path}`,
      {
        headers:
          API_HEADERS,
        params,
        timeout:15000
      }
    );

  const response =
    Array.isArray(
      data?.response
    )
      ? data.response
      : [];

  setCache(
    cacheKey,
    response
  );

  return response;

}

/* =========================
   AUTO PARLAY
========================= */

router.get(
  "/api/auto-parlay/status",
  async (_req,res)=>{

    const status =
      await getAutoParlayStatus();

    res.json(status);

  }
);

router.post(
  "/api/auto-parlay/run",
  async (req,res)=>{

    if(
      !canRunAutoParlay(req)
    ){

      return res
        .status(403)
        .json({
          ok:false,
          error:"Forbidden"
        });

    }

    const result =
      await generateDailyParlay({

        force:
          req.query.force === "true" ||
          req.body?.force === true,

        date:
          req.query.date ||
          req.body?.date ||
          null

      });

    res
      .status(
        result.ok
          ? 200
          : 500
      )
      .json(result);

  }
);

router.get(
  "/api/auto-parlay/run",
  async (req,res)=>{

    if(
      !canRunAutoParlay(req)
    ){

      return res
        .status(403)
        .json({
          ok:false,
          error:"Forbidden"
        });

    }

    const result =
      await generateDailyParlay({

        force:
          req.query.force === "true",

        date:
          req.query.date ||
          null

      });

    res
      .status(
        result.ok
          ? 200
          : 500
      )
      .json(result);

  }
);

/* =========================
   FIXTURES
========================= */

router.get(
  "/api/fixtures",
  async (req,res)=>{

    try{

      if(
        !hasFootballApiKey()
      ){

        return res
          .status(500)
          .json({
            ok:false,
            error:"FOOTBALL_API_KEY belum diisi"
          });

      }

      const date =
        req.query.date ||

        new Date()
          .toISOString()
          .slice(0,10);

      const fixtures =
        await apiGet(
          "/fixtures",
          { date }
        );

      const normalized =
        fixtures

          .filter(row=>{

            return isAllowedPredictionLeague({

              leagueName:
                row?.league?.name ||

                "",

              country:
                row?.league?.country ||

                ""

            });

          })

          .map(row=>{

            const p =
              normalizePrediction(row);

            return {

              priority:
                p.priority || 999,

              fixtureId:
                p.fixtureId,

              leagueId:
                p.leagueId,

              season:
                p.season,

              homeId:
                p.homeId,

              awayId:
                p.awayId,

              homeName:
                p.homeName,

              awayName:
                p.awayName,

              homeLogo:
                p.homeLogo,

              awayLogo:
                p.awayLogo,

              leagueName:
                p.leagueName,

              leagueLogo:
                p.leagueLogo,

              leagueFlag:
                p.leagueFlag,

              country:
                p.country,

              kickoffIso:
                p.kickoffIso,

              kickoffWib:
                p.kickoffWib,

              status:
                p.status,

              match:
                p.match,

              prediction:
                p.prediction,

              tip:
                p.tip,

              pick:
                p.pick,

              confidence:
                p.confidence,

              predictedScore:
                p.predictedScore,

              score:
                p.score,

              currentScore:
                p.currentScore,

              overUnder:
                p.overUnder,

              ou:
                p.ou,

              odds:
                p.odds,

              form:
                p.form,

              stats:
                p.stats,

              h2h:
                p.h2h

            };

          });

      const sorted =
        sortPredictionMatches(
          normalized
        );

      const grouped =
        new Map();

      for(const item of sorted){

        const key =
          item.leagueName;

        if(
          !grouped.has(key)
        ){

          grouped.set(
            key,
            {

              league:
                item.leagueName,

              leagueLogo:
                item.leagueLogo,

              flag:
                item.leagueFlag,

              country:
                item.country,

              priority:
                leaguePriority({

                  leagueName:
                    item.leagueName,

                  country:
                    item.country

                }),

              rows:[]

            }
          );

        }

        grouped
          .get(key)
          .rows
          .push(item);

      }

      const groups =
        [...grouped.values()]

          .sort((a,b)=>{

            if(
              a.priority !==
              b.priority
            ){

              return (
                a.priority -
                b.priority
              );

            }

            return (
              a.league ||
              ""
            ).localeCompare(
              b.league ||
              ""
            );

          })

          .map(row=>({

            title:
              `${(
                row.country ||
                ""
              ).toUpperCase()} - ${(
                row.league ||
                ""
              ).toUpperCase()}`,

            league:
              row.league,

            country:
              row.country,

            leagueLogo:
              row.leagueLogo,

            flag:
              row.flag,

            rows:
              row.rows

          }));

      res.set(
        "Cache-Control",
        `public, max-age=${CACHE_TTL}`
      );

      res.json({

        ok:true,

        date,

        groups,

        total:
          sorted.length

      });

    }catch(err){

      res
        .status(
          err?.response?.status ||
          500
        )
        .json({

          ok:false,

          error:
            err?.response?.data ||
            err.message

        });

    }

  }
);

/* =========================
   LIVE
========================= */

router.get(
  "/api/live",
  async (_req,res)=>{

    try{

      const fixtures =
        await apiGet(
          "/fixtures",
          { live:"all" }
        );

      const rows =
        fixtures

          .filter(row=>

            isAllowedPredictionLeague({

              leagueName:
                row?.league?.name ||

                "",

              country:
                row?.league?.country ||

                ""

            })

          )

          .map(row=>{

            const p =
              normalizePrediction(row);

            return {

              fixtureId:
                p.fixtureId,

              league:
                `${(
                  p.country ||
                  ""
                ).toUpperCase()} - ${(
                  p.leagueName ||
                  ""
                ).toUpperCase()}`,

              home:
                p.homeName,

              away:
                p.awayName,

              homeLogo:
                p.homeLogo,

              awayLogo:
                p.awayLogo,

              score:
                p.currentScore,

              kickoffWib:
                p.kickoffWib,

              predictedScore:
                p.predictedScore,

              prediction:
                p.prediction,

              confidence:
                p.confidence,

              status:
                p.status

            };

          })

          .sort((a,b)=>{

            return (

              leaguePriority({
                leagueName:
                  a.league
              })

              -

              leaguePriority({
                leagueName:
                  b.league
              })

            );

          });

      res.json({

        ok:true,

        rows

      });

    }catch(err){

      res
        .status(
          err?.response?.status ||
          500
        )
        .json({

          ok:false,

          error:
            err?.response?.data ||
            err.message

        });

    }

  }
);

/* =========================
   FINISHED
========================= */

router.get(
  "/api/finished",
  async (req,res)=>{

    try{

      const date =
        req.query.date ||

        new Date()
          .toISOString()
          .slice(0,10);

      const fixtures =
        await apiGet(
          "/fixtures",
          { date }
        );

      const rows =
        fixtures

          .filter(row=>{

            const st =
              String(
                row?.fixture?.status?.short ||
                ""
              )
                .toUpperCase();

            return [
              "FT",
              "AET",
              "PEN"
            ].includes(st);

          })

          .map(row=>{

            const p =
              normalizePrediction(row);

            return {

              fixtureId:
                p.fixtureId,

              league:
                `${(
                  p.country ||
                  ""
                ).toUpperCase()} - ${(
                  p.leagueName ||
                  ""
                ).toUpperCase()}`,

              home:
                p.homeName,

              away:
                p.awayName,

              homeLogo:
                p.homeLogo,

              awayLogo:
                p.awayLogo,

              score:
                p.currentScore,

              kickoffWib:
                p.kickoffWib,

              predictedScore:
                p.predictedScore,

              prediction:
                p.prediction,

              confidence:
                p.confidence,

              status:
                p.status

            };

          });

      res.json({

        ok:true,

        date,

        rows

      });

    }catch(err){

      res
        .status(
          err?.response?.status ||
          500
        )
        .json({

          ok:false,

          error:
            err?.response?.data ||
            err.message

        });

    }

  }
);

/* =========================
   UPCOMING
========================= */

router.get(
  "/api/upcoming",
  async (req,res)=>{

    try{

      const hours =
        Math.max(
          1,
          Math.min(
            48,
            Number(
              req.query.hours ||
              12
            )
          )
        );

      const fixtures =
        await apiGet(
          "/fixtures",
          {
            next:
              Math.max(
                10,
                hours * 4
              )
          }
        );

      const rows =
        fixtures

          .filter(row=>

            isAllowedPredictionLeague({

              leagueName:
                row?.league?.name ||

                "",

              country:
                row?.league?.country ||

                ""

            })

          )

          .map(row=>{

            const p =
              normalizePrediction(row);

            return {

              fixtureId:
                p.fixtureId,

              league:
                `${(
                  p.country ||
                  ""
                ).toUpperCase()} - ${(
                  p.leagueName ||
                  ""
                ).toUpperCase()}`,

              home:
                p.homeName,

              away:
                p.awayName,

              homeLogo:
                p.homeLogo,

              awayLogo:
                p.awayLogo,

              kickoffWib:
                p.kickoffWib,

              prediction:
                p.prediction,

              confidence:
                p.confidence,

              predictedScore:
                p.predictedScore,

              status:
                p.status

            };

          });

      res.json({

        ok:true,

        hours,

        rows:
          sortPredictionMatches(rows)

      });

    }catch(err){

      res
        .status(
          err?.response?.status ||
          500
        )
        .json({

          ok:false,

          error:
            err?.response?.data ||
            err.message

        });

    }

  }
);

/* =========================
   H2H
========================= */

router.get(
  "/api/h2h",
  async (req,res)=>{

    try{

      const home =
        Number(
          req.query.home
        );

      const away =
        Number(
          req.query.away
        );

      const last =
        Math.max(
          1,
          Math.min(
            10,
            Number(
              req.query.last ||
              5
            )
          )
        );

      if(
        !home ||
        !away
      ){

        return res
          .status(400)
          .json({

            ok:false,
            error:"missing home/away"

          });

      }

      const rows =
        await apiGet(
          "/fixtures/headtohead",
          {
            h2h:
              `${home}-${away}`,
            last
          }
        );

      const result =
        rows.map(row=>{

          const homeName =
            row?.teams?.home?.name ||
            "Home";

          const awayName =
            row?.teams?.away?.name ||
            "Away";

          return {

            fixtureId:
              row?.fixture?.id,

            league:
              `${(
                row?.league?.country ||
                ""
              ).toUpperCase()} - ${(
                row?.league?.name ||
                ""
              ).toUpperCase()}`,

            home:
              homeName,

            away:
              awayName,

            score:
              `${row?.goals?.home ?? 0} - ${row?.goals?.away ?? 0}`,

            winner:
              row?.teams?.home?.winner
                ? "HOME"
                : row?.teams?.away?.winner
                ? "AWAY"
                : "DRAW"

          };

        });

      res.json({

        ok:true,

        home,
        away,
        last,

        rows:
          result

      });

    }catch(err){

      res
        .status(
          err?.response?.status ||
          500
        )
        .json({

          ok:false,

          error:
            err?.response?.data ||
            err.message

        });

    }

  }
);

export default router;
