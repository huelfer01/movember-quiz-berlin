# Previous Cloudflare deployment guide

The main application now uses Node.js. This document preserves the earlier Cloudflare instructions for reference. See the app README for current commands.

# The Mo You Know — Movember lunch & learn quiz

A phone-friendly, self-paced English quiz for the OW Germany lunch & learn. Ten questions, with short explanations and a final link to https://movember.com/t/ow-germany?mc=1. Designed for about 3–5 minutes; there is no forced timer. Reading every source or the optional recap takes longer.

## Preview now

Open `quiz/index.html` for the quiz design. When opened as a local file, the shared leaderboard explains that it needs hosting; it does not pretend to be a shared browser-only list.

To try a real leaderboard locally, use **Node.js 24 or later**, then run:

```sh
npm run dev
```

Open `http://127.0.0.1:8765` in two different browser tabs. Share a score in one tab and refresh the leaderboard in the other. This uses an actual SQLite database at `.data/leaderboard.sqlite`, which is excluded from Git and the hosting ZIP. No package installation is required. This preview server listens only on this computer; it is not the office deployment.

## Publish for free, including shared scores

Use **Cloudflare Pages + D1** on the Free plan. The ready-made `movember-quiz.zip` includes a standalone Pages worker, so you can still use dashboard drag-and-drop without a GitHub repository or a build service. Players need no accounts.

1. Create/sign into a Cloudflare account and choose the Free plan.
2. Create a Pages project under **Workers & Pages**, choose Direct Upload, and upload `movember-quiz.zip`. Ensure `index.html`, `_worker.js`, and `_routes.json` are at the site root.
3. Under **Storage & databases → D1**, create a database named `movember-office`. Dashboard wording can vary.
4. Open that database's **Console**. Paste and run the contents of `server/schema.sql`. It creates the score table and the cancellation-receipt table; it is safe to run again.
5. Open your **Pages project → Settings → Bindings → Add → D1 database**. Set the variable name to **`LEADERBOARD_DB`**, exactly, and select the new database for the production environment.
6. **Redeploy the same ZIP** so the database binding takes effect. A binding is configuration, not a password or a public API key; no secret belongs in the frontend.
7. Open the resulting HTTPS `pages.dev` URL in a private browser tab on a phone. Finish once without sharing: no name or score should appear in the list. Finish again, share a name, and confirm its rank from a second device after pressing **Refresh scores**. Test **Remove my entry** too.
8. Open `organizer.html` (locally or at `https://YOUR-SITE.pages.dev/organizer.html`), paste the public quiz homepage URL, and generate the QR poster. Scan the final printed/displayed QR on another phone before the event.

The free tiers include Workers/Pages function requests and D1 database allowances suitable for a small office event. Only `/api/*` invokes the worker; static quiz assets are excluded by `_routes.json`. Free-plan limits still apply. Your company network may block a hosting domain, so test the actual URL in the office.

Official guidance, checked 9 November 2026:

- [Direct Upload supports standalone `_worker.js`](https://developers.cloudflare.com/pages/get-started/direct-upload/#functions)
- [Pages advanced-mode workers and static assets](https://developers.cloudflare.com/pages/functions/advanced-mode/)
- [D1 database bindings and redeployment](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases)
- [D1 Free pricing and allowances](https://developers.cloudflare.com/d1/platform/pricing/)

**The site and database have not been deployed or connected.** The quiz, donation link and QR generator still work without a database. The shared leaderboard becomes available only after the steps above. Deploying the files to a plain static host such as Netlify Drop does not run this Cloudflare backend.

The fundraising QR in `01 Input` is a separate destination and should not be used as the quiz QR.

## Change the quiz

- `quiz/questions.js`: all ten questions, choices, correct answers, explanations and source links. `answer: 0` means the first option, `1` the second, etc.
- `quiz/app.js`: quiz flow, private scoring and fundraiser URL.
- `quiz/leaderboard.js`: optional sharing form, score list, rank, refresh and withdrawal.
- `server/worker.mjs`: backend source; `server/schema.sql`: database setup.
- `quiz/_worker.js` and `quiz/quiz-version.js`: generated backend and matching quiz version. Run `npm run build` after editing questions or backend source, then re-ZIP the **contents** of `quiz` if deploying a ZIP. No installed dependencies are needed.
- `quiz/_routes.json`: routes only API requests through the worker.
- `quiz/styles.css`: colours, layout and print styling.
- `quiz/organizer.html` and `organizer.js`: local QR generator and printable poster.
- `quiz/vendor/qrcode.js`: locally bundled MIT-licensed QR generator. Keep this file when publishing; its licence notice is in the file and `vendor/QR-LICENSE.txt`.

Upload only `quiz` or its ZIP, not `01 Input` or this whole workspace. After edits, upload a new deployment to the same hosting project and rebuild the ZIP if using it. Keep the same public URL so printed QR codes continue to work.

## What players see and what is shared

Start → ten questions → immediate explanations → score and fundraising link → optional office leaderboard → optional answer review or replay. One point per correct answer; choices lock after selection. The leaderboard never blocks donations, answer review or replay.

The default is private: no name or answers are submitted. To join, a player deliberately enters a first name or nickname and presses **Share my score**. Their selected answers are sent solely to calculate the score on the server; individual answers are not stored. The database stores the chosen name, calculated score, quiz version, submission time, an entry ID and a hashed private withdrawal receipt. It does not store email addresses, IP addresses or individual answers. Cloudflare has its own request handling/logging practices.

Published names and scores are visible to **anyone with the quiz link**, without an account. “Office leaderboard” describes the intended audience, not verified office membership. The form explains this before sharing. Colleagues can view the list without joining, or choose **Keep my score private**. First names need not be unique: two colleagues called Alex remain separate entries.

Higher scores rank first. Equal scores share competition ranks (1, 1, 3), with no speed penalty. The top 50 entries are displayed; a player's own rank is shown even outside that list. Refresh is manual. Repeating the same submission after a network failure does not create duplicates. An entirely new quiz attempt can create a new entry if shared; without accounts, this remains a friendly awareness leaderboard rather than a controlled competition.

After sharing, **Remove my entry** withdraws the score while the current results page remains open. A private random receipt in memory authorizes removal. It is never exposed in the list; the server retains only its hash. If the page is closed or reloaded, the player can ask the organizer to remove an entry. The cancellation-receipt table prevents a delayed network submission from restoring a withdrawn score.

The backend calculates scores instead of trusting a submitted score. The questions and correct answers are available in the client for learning, so this does not prevent someone deliberately cheating. No sign-in, tracking cookies or analytics were added.

After changing the questions and running `npm run build`, a new quiz version starts a fresh list; old rows remain in D1 for organizer cleanup. After the event, clear the tables in the D1 console or delete the dedicated database. To remove a single entry, find its ID in D1 and delete that row using the dashboard. Do not expose an organizer deletion endpoint on the public website.

## Branding and question sources

The quiz and printable QR poster use the original Oliver Wyman SVG logo extracted from `01 Input/MovemberTemplate.pptx`. Its proportions are preserved. Theme colours come from that deck: navy `#000F47`, blue `#82BAFF`, light blue `#CEECFF`, and warm grey `#EBE7E2`. The typography uses Marsh Serif and Noto Sans when installed, with local Georgia/Arial fallbacks; no remote fonts or proprietary font files are distributed.

There are ten questions, each with four plausible choices and a brief explanation:

1. Age to discuss PSA-based prostate screening in Germany: **45** for average risk. This asks about informed discussion, rather than mandatory testing. Specific inherited risks may justify starting earlier; symptoms need assessment at any age.
2. An elevated PSA result: **needs assessment and is not a cancer diagnosis**.
3. The age range in which most testicular cancer cases occur in Germany: **25–45**. Cases also occur outside that range.
4. A new painless testicular lump: **arrange a medical check promptly**.
5. The male share of suicide deaths in Germany in 2025: **69.2%**, so “about 70%”. This is deaths, not attempts, and is not a global percentage.
6. Start a private conversation about a change you have noticed.
7. Listen and acknowledge before offering solutions.
8. Encourage professional help for persistent distress and offer practical support.
9. Ask directly about suicidal thoughts when concerned; this does not increase suicidal thoughts. In immediate danger, stay with the person and contact emergency services.
10. Agree a follow-up and keep that commitment.

Sources checked 9 November 2026; each explanation contains a direct link:

- [DKFZ: PSA-based prostate screening](https://www.krebsinformationsdienst.de/prostatakrebs/frueherkennung)
- [Movember: prostate cancer and PSA](https://movember.com/articles/about-prostate-cancer)
- [RKI: Cancer in Germany 2021–2023, testicular cancer chapter](https://edoc.rki.de/bitstream/handle/176904/13155/krebs_in_deutschland_2025.pdf)
- [DKFZ: testicular cancer and symptoms](https://www.krebsinformationsdienst.de/hodenkrebs)
- [Destatis: suicide deaths in Germany, 2025](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Gesundheit/Todesursachen/Tabellen/suizide.html)
- [Movember: ALEC and supporting someone](https://us.movember.com/mens-health/give-support)
- [WHO: talking about suicide and helping someone](https://www.who.int/news-room/questions-and-answers/item/suicide)
- [Movember Conversations: Check in](https://conversations.movember.com/en/ALEC/check%20In/)

The original handouts informed the topics. German guidance and dated national statistics replace the handouts' older numerical claims. This is why the age ranges may differ from a generic Movember poster. All question wording is newly written.

## Validation

Run `npm run build`, then `npm test` (Node.js 24+). The automated tests use real SQLite with a D1-compatible adapter and exercise the actual backend handler plus browser interaction logic in a small DOM stub. They cover optional/private play, server scoring, ties, duplicate names, retry safety, individual rank outside the top 50, validation, escaped names, withdrawals, delayed submissions and failure handling. These are not browser layout tests or a deployed Cloudflare integration test.

JavaScript syntax, question records, original logo integrity and deployment ZIP contents were also checked. Browser rendering and phone QR scanning still need verification; an earlier attempt to launch Chromium was blocked by the sandbox and outside-sandbox permission was declined.
