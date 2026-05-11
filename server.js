import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import session from "express-session";
import methodOverride from "method-override";
import expressLayouts from "express-ejs-layouts";
import fs from "fs";
import FileStoreFactory from "session-file-store";

import siteRoutes from "./routes/site.js";
import adminRoutes from "./routes/admin.js";
import apiRoutes from "./routes/api.js";

import { getViewData } from "./helpers/view-data.js";
import { uploadDir } from "./helpers/json-db.js";

import {
  startAutoParlayScheduler,
  generateDailyParlay
} from "./helpers/auto-parlay.js";

/* =========================
   APP
========================= */

const app = express();

const PORT =
  Number(
    process.env.PORT ||
    8080
  );

const isProduction =
  process.env.NODE_ENV ===
  "production";

/* =========================
   DATA DIR
========================= */

const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(
    process.cwd(),
    "data"
  );

if (
  !fs.existsSync(DATA_DIR)
) {

  fs.mkdirSync(
    DATA_DIR,
    { recursive: true }
  );

}

/* =========================
   SESSION STORE
========================= */

const FileStore =
  FileStoreFactory(session);

const sessionStore =
  new FileStore({

    path:
      path.join(
        DATA_DIR,
        "sessions"
      ),

    ttl:
      60 * 60 * 8,

    retries: 1,

    reapInterval:
      60 * 60

  });

/* =========================
   TRUST PROXY
========================= */

app.set(
  "trust proxy",
  1
);

/* =========================
   VIEW ENGINE
========================= */

app.set(
  "view engine",
  "ejs"
);

app.set(
  "views",
  path.join(
    process.cwd(),
    "views"
  )
);

app.set(
  "layout",
  "layouts/main"
);

/* =========================
   MIDDLEWARE
========================= */

app.use(expressLayouts);

app.use(
  cors({

    origin: true,

    credentials: true

  })
);

app.use(
  express.urlencoded({

    extended: true,

    limit:
      process.env
        .MAX_BODY_SIZE ||
      "10mb"

  })
);

app.use(
  express.json({

    limit:
      process.env
        .MAX_BODY_SIZE ||
      "10mb"

  })
);

app.use(
  methodOverride(
    "_method"
  )
);

/* =========================
   STATIC
========================= */

app.use(
  express.static(
    path.join(
      process.cwd(),
      "public"
    ),
    {
      maxAge:
        isProduction
          ? "7d"
          : 0
    }
  )
);

app.use(
  "/uploads",
  express.static(
    uploadDir,
    {
      maxAge:
        isProduction
          ? "30d"
          : 0
    }
  )
);

/* =========================
   SESSION
========================= */

app.use(
  session({

    name:
      process.env
        .SESSION_NAME ||

      "bandartoto.sid",

    store:
      sessionStore,

    secret:
      process.env
        .SESSION_SECRET ||

      "change-me-please",

    resave: false,

    saveUninitialized: false,

    proxy: true,

    rolling: true,

    cookie: {

      httpOnly: true,

      secure:
        isProduction,

      sameSite:
        "lax",

      maxAge:
        1000 *
        60 *
        60 *
        8

    }

  })
);

/* =========================
   GLOBAL VIEW DATA
========================= */

app.use(
  async (
    req,
    res,
    next
  ) => {

    try {

      const viewData =
        await getViewData();

      res.locals.settings =
        viewData?.settings ||
        {};

      res.locals.slides =
        viewData?.slides ||
        [];

      res.locals.quickActions =
        viewData?.quickActions ||
        [];

      res.locals.ads =
        viewData?.ads ||
        [];

      res.locals.latestPosts =
        viewData?.latestPosts ||
        [];

      res.locals.baseUrl =
        process.env.BASE_URL ||

        `${req.protocol}://${req.get("host")}`;

      res.locals.path =
        req.path;

      res.locals.query =
        req.query || {};

      res.locals.isAdmin =
        Boolean(
          req.session?.isAdmin
        );

      next();

    } catch (err) {

      console.error(
        "[VIEW DATA ERROR]",
        err
      );

      res.locals.settings =
        {};

      res.locals.slides =
        [];

      res.locals.quickActions =
        [];

      res.locals.ads =
        [];

      res.locals.latestPosts =
        [];

      res.locals.baseUrl =
        process.env.BASE_URL ||

        `${req.protocol}://${req.get("host")}`;

      res.locals.path =
        req.path;

      res.locals.query =
        req.query || {};

      res.locals.isAdmin =
        false;

      next();

    }

  }
);

/* =========================
   HEALTHCHECK
========================= */

app.get(
  "/health",
  (_req, res) => {

    res.json({

      ok: true,

      uptime:
        process.uptime(),

      timestamp:
        Date.now(),

      env:
        process.env
          .NODE_ENV ||

        "development"

    });

  }
);

/* =========================
   ROUTES
========================= */

app.use(
  "/admin",
  adminRoutes
);

app.use(
  apiRoutes
);

app.use(
  siteRoutes
);

/* =========================
   TEST ROUTE
========================= */

app.get(
  "/test",
  async (
    _req,
    res
  ) => {

    try {

      const result =
        await generateDailyParlay({

          force: true

        });

      res.json(result);

    } catch (err) {

      console.error(err);

      res.status(500).json({

        ok: false,

        error:
          err.message

      });

    }

  }
);

/* =========================
   MANUAL GENERATE
========================= */

app.get(
  "/generate-parlay",
  async (
    _req,
    res
  ) => {

    try {

      const result =
        await generateDailyParlay({

          force: true

        });

      res.json(result);

    } catch (err) {

      console.error(err);

      res.status(500).json({

        ok: false,

        error:
          err.message

      });

    }

  }
);

/* =========================
   404
========================= */

app.use(
  (
    req,
    res
  ) => {

    res.status(404).render(
      "pages/404",
      {

        pageTitle:
          "404 • Halaman Tidak Ditemukan",

        pageDescription:
          "Halaman tidak ditemukan.",

        activePage:
          "404",

        styles: [
          "/assets/css/styles.css"
        ],

        scripts: [],

        bodyClass:
          "body-404"

      }
    );

  }
);

/* =========================
   ERROR HANDLER
========================= */

process.on(
  "uncaughtException",
  err => {

    console.error(
      "[UNCAUGHT EXCEPTION]",
      err
    );

  }
);

process.on(
  "unhandledRejection",
  err => {

    console.error(
      "[UNHANDLED REJECTION]",
      err
    );

  }
);

/* =========================
   SERVER
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  async () => {

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Environment: ${process.env.NODE_ENV}`
    );

    console.log(
      `Base URL: ${process.env.BASE_URL}`
    );

    console.log(
      `DATA_DIR: ${DATA_DIR}`
    );

    console.log(
      `[SESSION] FileStore active`
    );

    /* =========================
       AUTO PARLAY
    ========================= */

    startAutoParlayScheduler();

    if (
      process.env
        .AUTO_PARLAY_RUN_ON_START ===
      "true"
    ) {

      try {

        console.log(
          "[AUTO PARLAY] GENERATE START"
        );

        await generateDailyParlay();

      } catch (err) {

        console.error(
          "[AUTO PARLAY ERROR]",
          err
        );

      }

    }

  }
);
