# The Mo You Know

Ten phone-friendly questions for the Oliver Wyman Germany Movember lunch & learn. About 3–5 minutes,
with explanations, source links and the fundraiser at https://movember.com/t/ow-germany?mc=1.

## Run and build

Use Node **24.12+ within Node 24**. From the repository root, run `npm run dev` and open
http://127.0.0.1:8765. Run `npm run build:quiz` to create the runnable Node artifact in
`dist/apps/movember-quiz`. From inside that artifact, `npm start` launches the app. No production
dependencies are installed.

For production configuration, health probes and persistent storage requirements, see the
[root README](../../README.md). The current deployment path is Node.js; the
[older Cloudflare instructions](docs/original-cloudflare-guide.md) and archived ZIP are retained
only for reference.

## Files

- `quiz/questions.js`: questions, answers, explanations and sources.
- `quiz/app.js`, `leaderboard.js`, `styles.css`: quiz, optional score sharing and visual design.
- `quiz/assets/oliver-wyman.svg`: original logo from the supplied PowerPoint.
- `quiz/assets/nick-offerman.jpg`: CC BY 2.0 portrait used for the celebrity Mo question.
- `server/src/main.ts`: configurable HTTP server and graceful shutdown.
- `server/src/application.ts`: public assets, API routing and health checks.
- `server/src/config.ts`: validated non-sensitive runtime settings.
- `server/src/database.ts`: SQLite adapter with atomic transactions.
- `server/worker.mjs`: shared leaderboard handler template. Despite its legacy name, it runs on Node
  without any Cloudflare service.
- `server/schema.sql`: schema initialized automatically when the server starts.
- `scripts/package.mjs`: generates the shared handler and matching quiz version.
- `scripts/build.ts`: creates the runnable Node artifact.
- `test/integration`: Node application and persistence integration tests.

Run `npm run build:quiz` after editing questions or the handler so the browser and server use
matching quiz versions. The original browser JavaScript is preserved; new server modules are
TypeScript.

The build includes the app, schema and public assets, not handouts, the original PowerPoint,
archived ZIPs, test databases or test suites. The HTTP server also restricts public access to an
explicit asset list; it never serves the backend handler or database.

## Optional leaderboard

Results stay private unless a player enters a first name or nickname and presses **Share my score**.
Anyone who can access the quiz can view published names and scores without joining. The form
explains the visibility before sharing.

Selected answers are sent only to calculate the shared score, then discarded. The store contains the
name, score, quiz version, time, entry ID and hashed removal receipt. Repeated requests with the
same receipt do not add duplicate entries. Equal scores share ranks (1, 1, 3); top 50 entries are
displayed and a player's own rank is shown even outside that list. Refresh is manual.

**Remove my entry** works while the results page remains open. If the page has been closed, the
organizer can remove the row from storage. Cancellation receipts prevent a delayed submission from
restoring a withdrawn entry. New quiz versions start a fresh visible list; old rows remain for
organizer cleanup.

This is a friendly awareness activity. New attempts can be shared separately, names do not prove
identity, and answers are available in the client for learning. Platform access logs and privacy
practices are separate from this application's data store.

## QR and content

Open `/organizer.html` to make a QR poster after the final quiz URL is known. The QR is generated
locally and uses no subscription service. Donations are optional and never depend on score sharing.

The supplied handouts are retained in `01 Input` as source material. See
[branding and question sources](docs/question-sources.md).
