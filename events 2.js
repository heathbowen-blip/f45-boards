// F45 Upcoming Events – live board.
// Reads the published Google Sheet, keeps this studio's events,
// drops anything that ended before today, sorts by date.
(function () {
  "use strict";
  var CFG = window.F45_CONFIG || {};
  var params = new URLSearchParams(location.search);
  var slug = (params.get("studio") || "").toLowerCase();
  var demo = params.has("demo");
  var debug = params.has("debug");
  var studio = (CFG.studios || {})[slug];
  var TZ = studio ? studio.tz : "America/Phoenix";
  var CACHE_KEY = "f45-events-" + slug;
  var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  var MONTH_NAMES = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

  // ---------- scale the 1920x1080 stage to any screen ----------
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.getElementById("stage").style.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", fit);
  fit();

  function notice(msg) {
    var n = document.getElementById("notice");
    n.textContent = msg; n.hidden = !msg;
  }

  // ---------- helpers ----------
  function norm(s) {
    return String(s || "").toLowerCase().replace(/^\s*f45\s*/, "").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  }
  function todayISO() {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(y, m, d) { return y + "-" + pad(m + 1) + "-" + pad(d); }

  // Accepts 2026-10-20, 10/20/2026, 10-20-2026, Oct 20, 2026, October 20 2026 (time ignored)
  function parseDate(raw) {
    var s = String(raw || "").trim();
    if (!s) return null;
    var m;
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return iso(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) return iso(+m[3], +m[1] - 1, +m[2]);
    if ((m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/))) {
      var mi = MONTH_NAMES[m[1].toLowerCase().slice(0, 3)];
      if (mi !== undefined) return iso(+m[3], mi, +m[2]);
    }
    return null;
  }

  // Accepts 6:00 PM, 06:00 PM, 6 PM, 18:00. Returns {label:"6:00 PM", min:1080} or null
  function parseTime(raw) {
    var m = String(raw || "").trim().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])?\.?m?\.?$/i);
    if (!m) return null;
    var h = +m[1], mi = +(m[2] || 0), ap = m[3] ? m[3].toLowerCase() : null;
    if (h > 23 || mi > 59) return null;
    if (ap === "p" && h < 12) h += 12;
    if (ap === "a" && h === 12) h = 0;
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return { label: h12 + ":" + pad(mi) + " " + (h < 12 ? "AM" : "PM"), min: h * 60 + mi };
  }

  // RFC 4180 CSV parser (handles quotes, commas and line breaks inside cells)
  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // Find columns by header text, so column order in the sheet doesn't matter
  function toEvents(rows) {
    if (!rows.length) return [];
    var h = rows[0].map(function (x) { return String(x).toLowerCase().trim(); });
    function find(test) { for (var i = 0; i < h.length; i++) if (test(h[i])) return i; return -1; }
    var c = {
      studio: find(function (x) { return x.indexOf("studio") === 0; }),
      name:   find(function (x) { return /\bname\b/.test(x) && x.indexOf("studio") < 0; }),
      start:  find(function (x) { return x.indexOf("start date") > -1; }),
      end:    find(function (x) { return x.indexOf("end date") > -1; }),
      time:   find(function (x) { return x.indexOf("time") > -1 && x.indexOf("end") < 0; }),
      detail: find(function (x) { return x.indexOf("detail") > -1; }),
      loc:    find(function (x) { return x === "location"; }),
      addr:   find(function (x) { return x.indexOf("off-site") > -1 || x.indexOf("address") > -1; }),
      hide:   find(function (x) { return x === "hide"; })
    };
    if (c.start < 0) c.start = find(function (x) { return /\bdate\b/.test(x) && !/end|submission/.test(x); });
    if (c.studio < 0 || c.name < 0 || c.start < 0) throw new Error("Sheet is missing a Studio, Event name or Start date column.");
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var v = rows[r];
      function g(i) { return i > -1 && v[i] != null ? String(v[i]).trim() : ""; }
      var start = parseDate(g(c.start));
      if (!g(c.name) || !start) continue;
      if (g(c.hide)) continue; // anything typed in a "Hide" column removes the event
      var end = parseDate(g(c.end));
      if (!end || end < start) end = start;
      var detail = g(c.detail), addr = g(c.addr), t = parseTime(g(c.time));
      if (/off/i.test(g(c.loc)) && addr && detail.indexOf(addr) < 0) detail = detail ? detail + " · " + addr : addr;
      if (t && detail.indexOf(t.label) < 0) detail = detail ? t.label + " · " + detail : t.label;
      out.push({ studio: g(c.studio), name: g(c.name), start: start, end: end, detail: detail, min: t ? t.min : -1 });
    }
    return out;
  }

  function forThisStudio(all) {
    var key = norm(studio.name), today = todayISO();
    return all
      .filter(function (e) { var s = norm(e.studio); return s === key || s === norm(slug); })
      .filter(function (e) { return e.end >= today; })   // drops off the day after it ends
      .sort(function (a, b) {
        if (a.start !== b.start) return a.start < b.start ? -1 : 1;
        if ((a.min || -1) !== (b.min || -1)) return (a.min || -1) - (b.min || -1);
        return a.name.localeCompare(b.name);
      })
      .slice(0, CFG.maxEvents || 5);
  }

  // ---------- render ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function ticket(name, detail, mon, day) {
    var t = el("div", "ticket"), b = el("div", "body"), s = el("div", "stub");
    b.appendChild(el("div", "name", name));
    if (detail) b.appendChild(el("div", "detail", detail));
    s.appendChild(el("div", "mon", mon));
    s.appendChild(el("div", "day" + (String(day).length > 2 ? " range" : ""), day));
    t.appendChild(b); t.appendChild(s);
    return t;
  }
  function stubFor(e) {
    var sm = +e.start.slice(5, 7) - 1, sd = +e.start.slice(8), em = +e.end.slice(5, 7) - 1, ed = +e.end.slice(8);
    if (e.start === e.end) return [MONTHS[sm], String(sd)];
    if (sm === em) return [MONTHS[sm], sd + "–" + ed];
    return [MONTHS[sm] + "–" + MONTHS[em], sd + "–" + ed];
  }
  function render(events) {
    var now = new Date();
    document.getElementById("month").textContent =
      new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long" }).format(now);
    document.getElementById("studio").textContent = "F45 " + studio.name;
    var list = document.getElementById("list");
    list.innerHTML = "";
    if (!events.length) {
      var m = MONTHS[+todayISO().slice(5, 7) - 1];
      var t = ticket("New events coming soon", "Ask the front desk what's next", m, "Soon");
      t.className += " empty";
      list.appendChild(t);
      return;
    }
    events.forEach(function (e) {
      var st = stubFor(e);
      list.appendChild(ticket(e.name, e.detail, st[0], st[1]));
    });
  }

  // ---------- data ----------
  var lastAll = null;
  function save(all) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(all)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { return null; } }

  function demoEvents() {
    function add(days) { var d = new Date(Date.now() + days * 864e5); return iso(d.getFullYear(), d.getMonth(), d.getDate()); }
    var n = studio.name;
    return [
      { studio: n, name: "Ended yesterday (hidden)", start: add(-1), end: add(-1), detail: "Should not appear" },
      { studio: n, name: "Deka Mile", start: add(4), end: add(4), detail: "7:00 AM · Sign up at the front desk" },
      { studio: n, name: "Bring a Friend Week", start: add(1), end: add(7), detail: "Every class · Friends train free" },
      { studio: n, name: "Booty Building Clinic", start: add(10), end: add(10), detail: "9:30 AM · 45 min · All levels" },
      { studio: n, name: "Halloween Costume Workout", start: add(14), end: add(14), detail: "Costumes encouraged · Prizes" },
      { studio: n, name: "Community Run Club", start: add(18), end: add(18), detail: "6:00 AM · Meet in the lot" },
      { studio: n, name: "Sixth event (over the limit)", start: add(25), end: add(25), detail: "Should not appear" }
    ];
  }

  function refresh() {
    if (demo) { render(forThisStudio(demoEvents())); notice("Demo mode – sample events, not your sheet."); return; }
    var url = CFG.eventsCsvUrl;
    fetch(url + (url.indexOf("?") > -1 ? "&" : "?") + "cb=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("Sheet returned " + r.status); return r.text(); })
      .then(function (text) {
        lastAll = toEvents(parseCSV(text));
        save(lastAll);
        render(forThisStudio(lastAll));
        if (debug) notice("Loaded " + lastAll.length + " rows at " + new Date().toLocaleTimeString());
      })
      .catch(function (err) {
        // Keep showing the last good list rather than going blank
        if (lastAll) render(forThisStudio(lastAll));
        if (debug) notice("Could not load the sheet: " + err.message);
      });
  }

  // ---------- start ----------
  if (!studio) {
    var keys = Object.keys(CFG.studios || {});
    document.getElementById("list").innerHTML = "";
    notice('Add ?studio= to the link. Options: ' + keys.join(", "));
    return;
  }
  if (!demo && !CFG.eventsCsvUrl) {
    notice("No sheet connected yet. Paste the CSV link into js/config.js, or add &demo to the link to preview.");
  }
  lastAll = load();
  if (lastAll) render(forThisStudio(lastAll)); else render([]);
  if (demo || CFG.eventsCsvUrl) refresh();
  setInterval(function () { if (demo || CFG.eventsCsvUrl) refresh(); }, (CFG.refreshMinutes || 5) * 60000);
  // Re-check the date every 10 minutes so past events drop off right after midnight even if the sheet is unreachable
  setInterval(function () { if (lastAll && !demo) render(forThisStudio(lastAll)); }, 10 * 60000);
  // Full reload every 6 hours to pick up any design/code updates
  setTimeout(function () { location.reload(); }, 6 * 3600000);
})();
