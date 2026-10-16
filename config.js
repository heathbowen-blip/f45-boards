// ============================================================
// F45 LIVE BOARDS – SETTINGS
// This is the only file you should need to edit.
// ============================================================

window.F45_CONFIG = {

  // Paste the "Publish to web" CSV link for the Upcoming Events
  // sheet tab between the quotes. (See README, step 3.)
  eventsCsvUrl: "",

  // How often the screen checks for new events (minutes).
  refreshMinutes: 5,

  // Most events shown on the board at once.
  maxEvents: 5,

  // Studio link name -> display name + time zone.
  // Arizona has no daylight saving; Colorado does. Keep these as-is.
  studios: {
    "uptown-phoenix":     { name: "Uptown Phoenix",        tz: "America/Phoenix" },
    "santan-village":     { name: "Santan Village",        tz: "America/Phoenix" },
    "chandler-north":     { name: "Chandler North",        tz: "America/Phoenix" },
    "gilbert-202":        { name: "Gilbert & the 202",     tz: "America/Phoenix" },
    "pecans-queen-creek": { name: "Pecans of Queen Creek", tz: "America/Phoenix" },
    "belmar":             { name: "Belmar",                tz: "America/Denver" },
    "golden-triangle":    { name: "Golden Triangle",       tz: "America/Denver" },
    "north-thornton":     { name: "North Thornton",        tz: "America/Denver" },
    "parker":             { name: "Parker",                tz: "America/Denver" },
    "uptown-denver":      { name: "Uptown Denver",         tz: "America/Denver" },
    "west-highland":      { name: "West Highland",         tz: "America/Denver" }
  }
};
