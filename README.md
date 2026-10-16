# F45 Live Boards

Always-on OptiSigns slides that update themselves from a Google Sheet.

- **Upcoming Events** (`/events.html?studio=...`) – live now.
- **Member of the Month / Business of the Month** – coming next, same repo.

## How Upcoming Events works

Studio manager fills in the Jotform → Jotform adds a row to the Google Sheet →
each studio's screen checks the sheet every 5 minutes, shows that studio's next
5 events in date order, and drops any event the day after its end date
(Arizona and Colorado time handled separately).

To pull an event early, type anything in the sheet's **Hide** column for that row
(or delete the row). To fix a typo, edit the cell.

## One-time setup

### 1. Put these files on GitHub Pages
1. Sign in at github.com → **+** (top right) → **New repository**.
   Name: `f45-boards`. Set it to **Public**. Click **Create repository**.
2. On the new repo page click **uploading an existing file**.
   Unzip `f45-boards.zip` on your Mac, open the folder, select **everything inside it**
   (all files, no folders) and drag it into the browser.
   Click **Commit changes**.
3. Repo **Settings** → **Pages** (left sidebar) → Source: **Deploy from a branch**,
   Branch: **main**, folder **/ (root)** → **Save**.
4. After 1–2 minutes the page shows your site address:
   `https://heathbowen-blip.github.io/f45-boards/`
   Open it – you'll see one link per studio. Add `&demo` to any studio link to preview.

### 2. Connect the Jotform to a Google Sheet
1. Jotform → open the form → **Settings** → **Integrations** → search **Google Sheets**.
2. Authenticate with your Google account → **Create a new spreadsheet**
   (name it `F45 Upcoming Events – Live`) → **Save Integration**.
3. Open the new sheet and add a column header **Hide** in the first empty column on the right.

### 3. Publish the sheet and paste the link
1. In the sheet: **File → Share → Publish to web**.
2. Under **Link**, choose the sheet tab (not "Entire document") and **Comma-separated values (.csv)** → **Publish**.
3. Copy the link it gives you.
4. On GitHub open `js/config.js` → pencil icon (Edit) → paste the link between the
   quotes on the `eventsCsvUrl:` line → **Commit changes**.

Google refreshes published sheets roughly every 5 minutes, so a new event can take
up to ~10 minutes to reach the screen.

### 4. Add each studio to OptiSigns
1. OptiSigns → **Files/Assets** → **Add Asset** → **Website** (under Apps).
2. URL: `https://heathbowen-blip.github.io/f45-boards/events.html?studio=uptown-phoenix`
   (swap the studio name – the list is on the site's home page).
3. Set the auto-refresh to **5 minutes** if the option is shown.
4. Add it to that studio's playlist. Done – no further edits in OptiSigns.

## Studio link names
uptown-phoenix, santan-village, chandler-north, gilbert-202, pecans-queen-creek,
belmar, golden-triangle, north-thornton, parker, uptown-denver, west-highland

## Troubleshooting
Add `&debug` to a studio link in a normal browser to see whether the sheet loaded
and how many rows it read. If the sheet can't be reached, screens keep showing the
last list they loaded.

## Good to know
- The site and the published sheet tab are public to anyone with the link. Only
  event details should live in that tab.
- Anyone with the Jotform link can add an event straight to the screens – share it
  only with studio managers.
- Fonts: Bebas Neue and Montserrat, bundled under the SIL Open Font License (see the OFL files).
