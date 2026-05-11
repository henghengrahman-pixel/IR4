/* =========================
   HELPERS
========================= */

const $ =
  s => document.querySelector(s);

const el = html => {

  const d =
    document.createElement("div");

  d.innerHTML =
    html.trim();

  return d.firstChild;

};

const ymd = d =>
  d.toISOString().slice(0, 10);

const fmtID = d =>
  d.toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );

/* =========================
   SAFE ELEMENT
========================= */

function safe(id) {

  return document.getElementById(id);

}

/* =========================
   LOGO BUTTON
========================= */

const logoBtn =
  safe("logoBtn");

if (logoBtn) {

  logoBtn.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      location.reload();

    }
  );

}

/* =========================
   SLIDER
========================= */

(function initSlider() {

  const track =
    safe("track");

  const slider =
    safe("slider");

  const dots =
    safe("dots");

  const nextBtn =
    safe("next");

  const prevBtn =
    safe("prev");

  if (
    !track ||
    !slider ||
    !dots
  ) {
    return;
  }

  const slides =
    track.children.length;

  if (!slides)
    return;

  let idx = 0;

  let timer = null;

  let startX = 0;

  let deltaX = 0;

  for (
    let i = 0;
    i < slides;
    i++
  ) {

    const dot =
      document.createElement("div");

    dot.className =
      `dot${i === 0 ? " active" : ""}`;

    dot.addEventListener(
      "click",
      () => go(i, true)
    );

    dots.appendChild(dot);

  }

  const setDots = () => {

    [...dots.children]
      .forEach((d, i) => {

        d.classList.toggle(
          "active",
          i === idx
        );

      });

  };

  const go = (
    n,
    hold = false
  ) => {

    idx =
      (n + slides) %
      slides;

    track.style.transform =
      `translateX(-${idx * 100}%)`;

    setDots();

    if (hold)
      reset();

  };

  const next =
    () => go(idx + 1);

  const prev =
    () => go(idx - 1);

  const reset = () => {

    if (timer)
      clearInterval(timer);

    timer =
      setInterval(
        next,
        3500
      );

  };

  if (nextBtn) {
    nextBtn.onclick =
      () => go(idx + 1, true);
  }

  if (prevBtn) {
    prevBtn.onclick =
      () => go(idx - 1, true);
  }

  slider.addEventListener(
    "mouseenter",
    () => {
      if (timer)
        clearInterval(timer);
    }
  );

  slider.addEventListener(
    "mouseleave",
    reset
  );

  slider.addEventListener(
    "touchstart",
    e => {

      startX =
        e.touches[0].clientX;

      deltaX = 0;

      if (timer)
        clearInterval(timer);

    }
  );

  slider.addEventListener(
    "touchmove",
    e => {

      deltaX =
        e.touches[0].clientX -
        startX;

    }
  );

  slider.addEventListener(
    "touchend",
    () => {

      if (
        Math.abs(deltaX) > 40
      ) {

        deltaX > 0
          ? prev()
          : next();

      }

      reset();

    }
  );

  reset();

})();

/* =========================
   PRIORITY
========================= */

const MAJOR_LEAGUES = [

  "UEFA CHAMPIONS LEAGUE",
  "UEFA EUROPA LEAGUE",
  "UEFA EUROPA CONFERENCE LEAGUE",

  "ENGLAND - PREMIER LEAGUE",
  "SPAIN - LA LIGA",
  "ITALY - SERIE A",
  "GERMANY - BUNDESLIGA",
  "FRANCE - LIGUE 1",

  "INDONESIA - LIGA 1"

];

const BIG_TEAMS = [

  "Real Madrid",
  "Barcelona",
  "Manchester City",
  "Liverpool",
  "Arsenal",
  "Chelsea",
  "Manchester United",
  "Tottenham",
  "Bayern",
  "Dortmund",
  "PSG",
  "Inter",
  "AC Milan",
  "Juventus",
  "Napoli",

  "Persib",
  "Persija",
  "Persebaya",
  "Arema",
  "PSM",
  "Bali United"

];

function groupPriority(
  title = ""
) {

  const T =
    title
      .toUpperCase()
      .trim();

  const idx =
    MAJOR_LEAGUES.findIndex(
      x => T.includes(x)
    );

  if (idx !== -1)
    return idx;

  return 999;

}

function matchPriority(
  row = {}
) {

  const text =
    (
      row.match ||
      ""
    ).toLowerCase();

  let score = 0;

  BIG_TEAMS.forEach(team => {

    if (
      text.includes(
        team.toLowerCase()
      )
    ) {
      score += 10;
    }

  });

  if (
    text.includes("derby")
  ) {
    score += 5;
  }

  return score;

}

/* =========================
   SCORE
========================= */

function estimateScore(r) {

  if (
    r.predictedScore
  ) {
    return r.predictedScore;
  }

  return "1 - 0";

}

/* =========================
   PANEL
========================= */

function panelSkor(
  title,
  rows,
  flag
) {

  return `
<section
  class="panel"
  data-title="${title}"
>

  <div class="head">

    ${flag
      ? `
      <img
        src="${flag}"
        alt=""
        loading="lazy"
        onerror="this.style.display='none'"
        style="
          height:14px;
          vertical-align:-2px;
          margin-right:8px;
          border-radius:2px
        "
      />
      `
      : ""
    }

    ${title.toUpperCase()}

  </div>

  <div class="twrap">

    <table class="t">

      <thead>

        <tr>

          <th style="width:170px">
            Tanggal & Waktu
          </th>

          <th>
            PERTANDINGAN
          </th>

          <th style="width:110px">
            PREDIKSI
          </th>

        </tr>

      </thead>

      <tbody>

        ${rows.map((r, i) => `

<tr
  class="${i % 2 ? "alt" : ""}"
  data-row="${(r.match || "").toLowerCase()}"
>

  <td class="time">
    ${r.kickoffWib || "-"}
  </td>

  <td>

    <div class="match-row">

      <div class="team">

        ${r.homeLogo
          ? `
<img
  src="${r.homeLogo}"
  alt="${r.homeName}"
  loading="lazy"
  onerror="this.style.display='none'"
/>
`
          : ""
        }

        <span>
          ${r.homeName || ""}
        </span>

      </div>

      <div class="vs">
        VS
      </div>

      <div class="team">

        ${r.awayLogo
          ? `
<img
  src="${r.awayLogo}"
  alt="${r.awayName}"
  loading="lazy"
  onerror="this.style.display='none'"
/>
`
          : ""
        }

        <span>
          ${r.awayName || ""}
        </span>

      </div>

    </div>

  </td>

  <td class="score">

    <div class="pick">
      ${estimateScore(r)}
    </div>

    <small>
      ${r.prediction || r.tip || ""}
    </small>

  </td>

</tr>

`).join("")}

      </tbody>

    </table>

  </div>

</section>
`;

}

/* =========================
   RENDER
========================= */

function render(data) {

  const root =
    $("#content");

  if (!root)
    return;

  root.innerHTML = "";

  const groups =
    [...(
      data.groups || []
    )]

      .sort(
        (a, b) =>
          groupPriority(a.title) -
          groupPriority(b.title)
      );

  groups.forEach(g => {

    const rows =
      [...(
        g.rows || []
      )]

        .sort(
          (r1, r2) =>
            matchPriority(r2) -
            matchPriority(r1)
        );

    root.appendChild(
      el(
        panelSkor(
          g.title,
          rows,
          g.flag
        )
      )
    );

  });

  const q =
    safe("q");

  applyFilter(
    q
      ? q.value
          .trim()
          .toLowerCase()
      : ""
  );

}

/* =========================
   FETCH
========================= */

async function fetchData(
  dateStr
) {

  const r =
    await fetch(
      `/api/fixtures?date=${encodeURIComponent(dateStr)}`
    );

  if (!r.ok) {
    throw new Error(
      `HTTP ${r.status}`
    );
  }

  return r.json();

}

/* =========================
   DEMO
========================= */

function demo(dateStr) {

  return {

    date:
      dateStr,

    groups: []

  };

}

/* =========================
   LOAD
========================= */

async function load(d) {

  const ds =
    ymd(d);

  const line =
    safe("dateLine");

  if (line) {
    line.textContent =
      fmtID(d);
  }

  const loader =
    $("#loader");

  if (loader) {
    loader.classList.add("show");
  }

  try {

    const data =
      await fetchData(ds);

    render(data);

  } catch (err) {

    render(
      demo(ds)
    );

  } finally {

    if (loader) {
      loader.classList.remove("show");
    }

  }

}

/* =========================
   FILTER
========================= */

function applyFilter(q) {

  const panels =
    document.querySelectorAll(
      ".panel"
    );

  panels.forEach(p => {

    const ttl =
      (
        p.dataset.title ||
        ""
      ).toLowerCase();

    let visibleAny =
      false;

    p.querySelectorAll(
      "tbody tr"
    ).forEach(tr => {

      const row =
        tr.getAttribute(
          "data-row"
        ) || "";

      const show =
        !q ||

        row.includes(q) ||

        ttl.includes(q);

      tr.style.display =
        show
          ? ""
          : "none";

      if (show)
        visibleAny = true;

    });

    p.style.display =
      visibleAny
        ? ""
        : "none";

  });

}

const searchInput =
  safe("q");

if (searchInput) {

  searchInput.addEventListener(
    "input",
    e => {

      applyFilter(
        e.target.value
          .trim()
          .toLowerCase()
      );

    }
  );

}

/* =========================
   BOOT
========================= */

const year =
  safe("y");

if (year) {

  year.textContent =
    new Date().getFullYear();

}

load(new Date());

/* =========================
   QUICK MENU
========================= */

(function () {

  const fab =
    safe("mcFab");

  const sheet =
    safe("mcSheet");

  const closeBtn =
    safe("mcClose");

  if (
    !fab ||
    !sheet ||
    !closeBtn
  ) {
    return;
  }

  const open = () => {

    sheet.classList.add(
      "show"
    );

    fab.setAttribute(
      "aria-expanded",
      "true"
    );

    sheet.setAttribute(
      "aria-hidden",
      "false"
    );

  };

  const close = () => {

    sheet.classList.remove(
      "show"
    );

    fab.setAttribute(
      "aria-expanded",
      "false"
    );

    sheet.setAttribute(
      "aria-hidden",
      "true"
    );

  };

  const toggle = () => {

    sheet.classList.contains(
      "show"
    )
      ? close()
      : open();

  };

  fab.addEventListener(
    "click",
    toggle
  );

  closeBtn.addEventListener(
    "click",
    close
  );

  document.addEventListener(
    "keydown",
    e => {

      if (
        e.key === "Escape"
      ) {
        close();
      }

    }
  );

  document.addEventListener(
    "click",
    e => {

      if (
        !sheet.classList.contains(
          "show"
        )
      ) {
        return;
      }

      const within =
        sheet.contains(
          e.target
        ) ||

        fab.contains(
          e.target
        );

      if (!within) {
        close();
      }

    }
  );

})();
