# Eng Lessons — Miro App

Wraps the static English-lesson HTML pages (drag-drop / fill-in / choice / image-match exercises) into a Miro App. Students solve tasks inside a Miro side panel; the teacher sees a class-wide progress dashboard. No backend — progress is stored in Miro's board `appData`.

## Files

| File | Role |
| --- | --- |
| `lead-in.html` | The actual lesson (copy of `Eng/lead-in.html` + one extra `<script>` tag for `tracker.js`). Works standalone in a plain browser, too. |
| `tracker.js` | Injected into the lesson. Hooks `markComplete`, `handleDrop`, `checkInput`. Sends progress events to the parent (panel) via `postMessage`. Silent unless URL has `?embed=miro`. |
| `panel.html` | Side-panel UI Miro opens. Two tabs: **Lesson** (iframe of the lesson) and **Dashboard** (class progress). |
| `panel.js` | Panel logic — receives events from the iframe, persists to `appData`, renders the dashboard. |
| `sdk-bridge.js` | Thin wrapper over `miro.board.getUserInfo`, `getInfo`, `getAppData`, `setAppData`. |
| `app.js` | Root Miro App entrypoint. Registered as the SDK URI. Handles `icon:click` and `app_card:open` to open the panel. |
| `dashboard.css` | Styles for the panel + dashboard table. |
| `lessons.json` | Catalogue of available lessons (currently only `lead-in`). Add new lessons here as new files appear. |
| `manifest.json` | Reference values to copy into the Miro developer dashboard form. Not loaded at runtime. |
| `assets/audio/*`, `assets/img/*` | Lesson media (copied from the source project). |

## Data model (per board)

Keys written to `miro.board.setAppData`:

```
eng:progress:{lessonId}:{userId}   → { name, tasks: { [taskId]: "done"|"attempted" }, completed, total, updatedAt }
eng:settings                       → { teacherIds: [], shareProgressWithStudents: bool }
```

Each student writes only to their own key — no write conflicts. The teacher writes `eng:settings`.

The teacher role is auto-detected from `miro.board.getInfo().owner.id`. Additional teacher IDs can be added to `eng:settings.teacherIds` later (no UI for that yet).

## Hosting & wiring

The Miro Web SDK is loaded only inside a Miro panel — opening `panel.html` directly in a plain browser will look broken (SDK timeout). That's expected; the lesson itself (`lead-in.html`) still works standalone.

### Path A — straight to GitHub Pages (recommended)

For the end-user setup, no local server and no tunnel are needed.

1. **Push this folder to a public GitHub repo** (e.g. `eng-miro`). In repo settings, enable **Pages → Deploy from branch → `main` → `/ (root)`**. After a minute you'll have `https://<user>.github.io/eng-miro/`.
2. **Register the app** at <https://developers.miro.com> → *Create new app* in your **Dev team** (free, every Miro account has one). Fill:
   - **App URL** / **SDK URI**: `https://<user>.github.io/eng-miro/app.js`
   - **Redirect URI for OAuth**: `https://<user>.github.io/eng-miro/`
   - **Permissions / Scopes**: `boards:read`, `boards:write`
   - **Where to install**: enable for **Boards**
3. **Install on a board.** From the app page, *Install app and get OAuth token* → pick a team/board. The install URL on that page is the one you share with students/teachers for private distribution (no marketplace needed).
4. **Open the board.** The Eng Lessons icon appears in the right-hand toolbar. Click → panel opens. As the board owner (= teacher), the Lesson tab shows a **picker**: select a lesson → an App Card appears on the board. Students click that card → lesson opens for them.

After a code change: `git push` → wait ~10–60 s for Pages to redeploy → reload the panel in Miro (Ctrl/Cmd-R inside the panel works).

### Path B — local with a tunnel (for tight iteration)

Useful only when you're actively editing files and don't want to commit after each tweak. Skip this whole section if you're just using the app.

1. `python -m http.server 4000` from this folder.
2. `cloudflared tunnel --url http://localhost:4000` → gives a random `https://*.trycloudflare.com` URL.
3. In the Miro dev dashboard, point **SDK URI** at the tunnel URL instead of GitHub Pages.
4. Edit → save → reload panel. No commit needed.

When you're done iterating, point the SDK URI back at Pages and forget about the tunnel.

## Verification checklist

After Path A is wired:

1. Open the board as the owner → click app icon → panel opens with the Lesson picker.
2. Pick **Lead-in** → an App Card "Lead-in" appears on the board.
3. Click that App Card → panel reopens with the lesson loaded inside.
4. Solve one task. In devtools console:
   ```js
   await miro.board.getAppData()
   ```
   should show `eng:progress:lead-in:<your-user-id>` with `completed: 1`.
5. Switch to the **Dashboard** tab → your row appears.
6. Open the same board in another Miro account (incognito window or a second account, given editor access on the board). Solve a task. Back in the owner window → click *Refresh* in the dashboard → the new student row appears.
7. Toggle *Show progress to students* off (teacher only) → in the student window the table now only shows their own row.
8. **Standalone regression**: open `lead-in.html` directly in a browser (no Miro). All tasks work; console has no errors related to tracker.

## Known limits / follow-ups

- **Miro Free plan caps the team at 3 editor seats** (see <https://miro.com/pricing/>). Beyond editors, additional participants become viewers on individual boards, and viewers cannot write `appData` — so for a class larger than ~3 students, either upgrade the teacher's plan to one that allows more editors, or move progress storage to a backend (Phase 2). For 1-on-1 or tiny groups the free plan is enough.
- **Mobile Miro app**: drag-drop inside the iframe may misbehave on touch. Recommend desktop.
- **Duplicate boards** (template copy): `appData` is copied with the board, so a clone inherits "ghost" progress. Detection (`tracker.js` reading `localStorage.lastSeenBoardId` and resetting on mismatch) is not implemented yet.
- **Single-source-of-truth for the lesson**: `lead-in.html` here is a manual copy of the source. A small sync script is on the Phase 2 list.
- **Phase 2** (not done): CSV export, per-task drill-down, backend (Cloudflare Worker + D1), LMS / LTI integration, gamification.

## Updating the lesson source

The lesson file here is a **copy** of `C:\Users\PC\Documents\Projects\Eng\lead-in.html`. When the source updates, re-copy it and re-add the one tracker line:

```
<script defer src="tracker.js"></script>
```

right before `</body>`. (A small sync script could automate this — flagged in Phase 2.)
