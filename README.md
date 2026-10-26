# 💍 Wedding Site

A wedding website with two parts:

- **Public page:** a single page with scroll animations. It covers the **date (with a live countdown)**, **location**, the **RSVP form** and the **IBAN for gifts**.
- **Private area** (`/area`): login, sign-up with **e-mail confirmation**, and **forgot / reset password**. The forms sit on a centered card surrounded by floating photos. After login, a placeholder page is shown.

The **super admin** (the bride and groom) edits the site's content, photos and **language (English or Italian)** from the site itself.

It is built with **React + TypeScript + Vite** and uses **[PocketBase](https://pocketbase.io)** (Go + SQLite in a single binary) as the Backend-as-a-Service.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Customising the content](#customising-the-content)
4. [Quick start: full stack with Docker](#quick-start-full-stack-with-docker)
5. [Local development (Node + PocketBase binary)](#local-development-node--pocketbase-binary)
6. [The private area](#the-private-area)
7. [PocketBase backend](#pocketbase-backend)
8. [Configuration reference](#configuration-reference)
9. [Deploying to production](#deploying-to-production)
10. [Scripts](#scripts)
11. [Architecture notes](#architecture-notes)

---

## Tech stack

| Concern         | Choice                                                      |
| --------------- | ----------------------------------------------------------- |
| UI              | React 19 + TypeScript                                       |
| Routing         | React Router (private area is lazy-loaded)                  |
| Build tool      | Vite                                                        |
| Animations      | framer-motion                                               |
| Styling         | CSS Modules + CSS custom properties (tokens)                |
| Backend / DB    | PocketBase (auth, RSVP collection, e-mails, rate limiting)  |
| Tests           | Vitest + Testing Library                                    |
| Lint            | oxlint                                                      |
| Containers      | Frontend: multi-stage → unprivileged nginx · Backend: PocketBase on Alpine |

## Project structure

```
.
├── public/images/                 # ← your photos
├── src/
│   ├── config/wedding.ts          # default content (until the super admin's is loaded)
│   ├── i18n/                      # languages: current language, typed dictionaries
│   ├── site/                      # site content provider (PocketBase + browser cache)
│   ├── config/runtimeConfig.ts    # env / runtime configuration loader
│   ├── router.tsx                 # routes: "/" and "/area/*"
│   ├── pages/HomePage.tsx         # the public single page
│   ├── sections/                  # public page sections (Date, Location, RSVP, Gift)
│   ├── components/                # shared UI (Hero, ScrollSection, Form fields, ...)
│   ├── features/private-area/     # private area: layout, guards, auth context, pages
│   ├── services/
│   │   ├── auth/                  # AuthService interface + PocketBase implementation
│   │   ├── site/                  # SiteRepository: content and photos of the public site
│   │   └── rsvp/                  # RsvpRepository interface + PocketBase implementation
│   ├── lib/pocketbase.ts          # shared PocketBase client
│   └── styles/global.css          # design tokens + gradient background
├── pocketbase/                    # backend
│   ├── Dockerfile                 # PocketBase image (pinned + checksum-verified)
│   ├── docker-entrypoint.sh
│   ├── pb_migrations/             # schema as code (rsvps, users hardening, card game)
│   └── pb_hooks/                  # settings-from-env, RSVP validation
├── docker/                        # nginx config + runtime env script (frontend)
├── Dockerfile                     # frontend image
└── docker-compose.yml             # frontend + PocketBase + Mailpit
```

## Customising the content

1. **Content, language and photos: from the site.** A **super admin** opens *Site settings* from the private area (see [Super admin](#super-admin-site-settings)). Changes are live for everybody, no release needed.
2. **Defaults:** [`src/config/wedding.ts`](src/config/wedding.ts) holds the content shown until the real one is loaded the first time, when no backend is configured, or if PocketBase cannot be reached. The default pictures are in `public/images/` (the SVG files are placeholders).
3. **Texts of the site** (labels, buttons, rules…) are in typed dictionaries, English and Italian, next to the code that uses them (see [Languages](#languages)).
4. **Colours & fonts**: change the CSS variables at the top of [`src/styles/global.css`](src/styles/global.css).

## Quick start: full stack with Docker

Prerequisites: Docker with Compose v2.

```bash
cp .env.example .env        # then change PB_ADMIN_PASSWORD at least
docker compose up --build
```

| URL                          | What                                          |
| ---------------------------- | --------------------------------------------- |
| http://localhost:8080        | Wedding site (`/area` = private area)         |
| http://localhost:8090/_/     | PocketBase admin dashboard (RSVPs, users)     |
| http://localhost:8025        | **Mailpit**: catches every e-mail sent locally |

Try it: open the private area, create an account, then open Mailpit and click the confirmation link. The same works for "Forgot password".

> Data lives in the `pb_data` Docker volume. `docker compose down -v` wipes it.

## Local development (Node + PocketBase binary)

Prerequisites: **Node.js ≥ 20**.

**1. Start the backend.** Either use Docker for the backend services only:

```bash
docker compose up --build pocketbase mailpit
```

…or download the [PocketBase binary](https://github.com/pocketbase/pocketbase/releases) (v0.40.x) and run:

```bash
cd pocketbase
FRONTEND_URL=http://localhost:5173 ./pocketbase serve \
  --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
# first run: create the admin user
./pocketbase superuser upsert admin@example.com 'a-strong-password'
```

Without SMTP, the binary cannot send e-mails. For local testing, either run Mailpit (`docker compose up mailpit`) and set `PB_SMTP_HOST=localhost PB_SMTP_PORT=1025`, or mark users as verified by hand in the admin UI.

**2. Start the frontend:**

```bash
npm install
cp .env.example .env         # VITE_POCKETBASE_URL=http://localhost:8090
npm run dev                  # http://localhost:5173
```

> 💡 Without `VITE_POCKETBASE_URL` the public page still works. RSVPs are then only logged to the console, and the private area shows "not available".

## The private area

| Route                        | Page                                    | Access          |
| ---------------------------- | --------------------------------------- | --------------- |
| `/area`                      | Game intro + collected cards per suit   | logged-in only  |
| `/area/suits/:suit`          | Suit page (`hearts`, `diamonds`, `spades`, `clubs`): flip cards + secret phrase (not spades) | logged-in only  |
| `/area/riddles/:code`        | Riddle opened from a poster's QR code: solve it to collect the card | logged-in only  |
| `/area` (organisers)         | The same game home, plus an *Organisers* section: the suits they edit (+ the site settings link for super admins) | organisers of those suits |
| `/area/admin/suits/:suit`    | Edit letters, clubs riddles/solutions, hearts scenes, diamonds quiz, spades people | organisers of that suit |
| `/area/site/:tab?`           | Site settings in tabs: general (language, names, date, places, gift), photos, organisers, sign-up code | super admins only |
| `/area/gallery`              | Photos of every player (hearts), newest first, auto-refreshing | logged-in only  |
| `/area/login`                | Login                                   | guests only     |
| `/area/signup`               | Sign up → "check your inbox"            | guests only     |
| `/area/forgot-password`      | Request a reset e-mail                  | guests only     |
| `/area/reset-password?token` | Choose a new password (link in e-mail)  | anyone          |
| `/area/verify-email?token`   | Confirms the e-mail (link in e-mail)    | anyone          |

Flows and security choices:

- **Sign up** requires the **secret code** given to the guests (default `#wedding`; capital letters and surrounding spaces do not matter). It is checked by the server (`pb_hooks/signup.pb.js`), never stored with the user, and super admins can change it in *Site settings* → *Sign-up code*.
- **Sign up** creates the user and sends a confirmation e-mail. **Only verified users can log in**: this is enforced by the server (`authRule = "verified = true"`), not just by the UI.
- Logging in **before confirming** shows "please confirm your e-mail", with a **resend** button (60 s cooldown).
- **Forgot password** always shows the same message, whether or not the account exists, so nobody can find out which e-mails are registered.
- Reset links work **only once**. Expired or reused links show a clear "request a new link" page.
- The session is stored by the PocketBase SDK (localStorage), stays in sync across tabs, and is **re-validated with the server** each time the private area opens.
- PocketBase's **rate limiter** is on (e.g. 2 auth attempts per 3 s per IP).
- The private area JavaScript is **code-split**: public visitors never download it.
- **Every new content page** goes under the `RequireAuth` route in [`src/router.tsx`](src/router.tsx): anonymous visitors are sent to the login page and brought back to the page they asked for.

### The card game ("find the joker")

The dashboard shows four cards (hearts, diamonds, spades, clubs) with the number of cards the guest collected out of the cards in the deck, e.g. `3/13`; the spades card also says whether the "guess who" person was found. Each card links to its suit page.

- Data comes from PocketBase through [`src/services/game`](src/services/game) (a `GameRepository` interface, like the RSVP and auth services). The totals are read from the deck too, so changing the deck needs no frontend release.
- **Suit pages** (one per suit, same behaviour): all 13 cards in rank order. Tap a card to flip it. Collected cards have a green border; their back shows the card's **secret letter** (Ace..10) or a **yellow star** (Jack, Queen, King). Above the cards, the **secret phrase** joins the collected letters in rank order, with a dash for each missing one (e.g. `-----A----`). Hearts, diamonds and clubs each have their own letters and phrase; **the spades have none** (they are the "guess who" game): every collected spade shows a star and there is no phrase (`hasLetters` in `src/services/game/cards.ts`; the server refuses spades letters).
- **Letters** are set per card in the admin UI (`cards` → `letter`, one character). The field is *hidden*: the server sends it only for cards the guest collected (`pb_hooks/cards.pb.js`), and guests cannot filter or sort on it, so letters cannot be guessed through the API.
- Card faces are static SVGs in [`public/cards/`](public/cards/CREDITS.md) (CC0 artwork by Adrian Kennard), loaded lazily and cached by nginx.
- **Riddles (collecting cards)**: each card has a secret `code`, a `riddle` and a `solution` (hidden fields, admin UI). A poster with the card and a QR code to `/area/riddles/<code>` is put up at the venue. The guest scans it (logging in first if needed, then coming straight back), reads the riddle and types the answer in one box per letter: the focus moves to the next box automatically, Backspace goes back, pasting fills all boxes. The answer is checked **on the server** (`pb_hooks/riddles.pb.js`, case-insensitive, letters and digits only) and a correct one collects the card. The solution never reaches the browser.
  - The clubs come with placeholder riddles. **Solutions are not seeded** (this repository is the source): set them in the admin UI. A riddle without a solution shows "not available yet".
  - Changing a card's `code` in the admin UI invalidates its printed poster.
- **Rules box** on every suit page ([`SuitRules`](src/features/private-area/components/SuitRules/SuitRules.tsx), edit the texts there): how that suit's cards are collected (QR codes around the venue for clubs, photos for hearts, the quiz for diamonds, "guess who" for spades), plus the road to the King for every suit but the spades: Ace–10 spell the Jack's name, the Jack's challenge reveals the Queen's name, the Queen's the King's.
- **Hearts are collected with photos** instead of riddles. Under each card, 📷 opens a window with a **scene to photograph**:
  - Numbered cards: the scene is drawn **at random on the server** from the card's own bucket (`photo_scenes`, edit them in the admin UI; higher cards get harder scenes). **Every press draws a new scene**, so photos cannot be prepared in advance.
  - Jack, Queen and King: the scene is told in person ("The King of hearts will tell you the scene…").
  - Uploading the photo **collects the card**. Once a photo exists, the scene is **locked**: pressing the button again shows the same scene and only lets the guest replace the photo.
  - **Only real photos are accepted.** In the browser: the file must be an image that decodes as a photo, at least 320 px on each side; it is then shrunk (max 2048 px, ~0.5 MB instead of 3–8 MB) and re-encoded as JPEG, which also **removes the EXIF metadata (GPS location, phone model)** before the photo is shared. On the server: the type is detected from the file **content** (JPEG, PNG or WebP only, so a renamed text, SVG or GIF file is refused), 10 KB–10 MB.
  - The **rules** box explains the draws and warns that the photos of whoever claims victory are checked against their assigned scenes, so fake pictures are useless.
  - Photos are **protected files**: a photo URL only works with a file token, which only logged-in guests get. Tokens last 1 hour (a leaked link stops working) and the gallery renews them automatically.
- **Diamonds are collected with a quiz** about the newlyweds (tastes, anecdotes). Under each card, ❓ opens the card's question with multiple choices:
  - The question is drawn **at random on the server** from the card's own bucket (`quiz_questions` / `quiz_answers`) and **stays the same until it is answered**, even if the guest closes it or comes back later.
  - Every player has **three lives** (three diamonds under the rules), shared by all the diamonds. A wrong answer costs a life and draws a **new question**, avoiding the ones already faced while there are others. With no lives left, every wrong answer adds a **penalty** (diamonds of another colour): penalties must be carried out before claiming the prize, as the bride and groom decide.
  - **Jack, Queen and King are asked in person**: the guest sees neither the question nor the answers, only "Question n° X" and the letters A, B, C… (one per answer). The person asking reads question n° X and its answers, in the same order, from the organisers' view, where face-card questions are numbered and their answers lettered.
  - A right answer collects the card. Which answer is correct never reaches the browser; lives and penalties are computed on the server.
- **Spades are a "guess who" game.** Each player is secretly given a person to find (`guess_people`, with 13 hints in `guess_hints`, one per card). The person is drawn **at random on the server** the first time the player opens the Ace (never the player themselves, when their name matches) and **kept for the whole game** (`guess_assignments`).
  - Under each card, 🔍 opens its hints: **every hint from the Ace up to that card**, the newest one highlighted. The guest finds someone matching all of them and uploads a **selfie** with them, which collects the card.
  - The cards **unlock in order**: a card needs the previous card's selfie (🔒 until then, checked on the server too).
  - From the 2 on, **Same person as before** reuses the previous selfie (with its thumbnail as a reminder) instead of taking a new one, when that person still matches the new hint.
  - Reopening a collected card shows its selfie (or "same person as before: the selfie of the 3 of spades"). **A sent selfie cannot be changed.** Selfies go through the same checks as the hearts photos (real photo, shrunk, EXIF removed, 10 KB–10 MB) and are **protected files** visible only to their owner and the organisers (`guess_selfies`).
  - With all 13 cards collected, a **Guess who** box above the cards asks the **name and surname** in letter boxes (one per letter; spaces, apostrophes and accents are ignored, so "D'Amico" is `DAMICO`). The answer is checked on the server, with unlimited attempts; only a right guess completes the spades. The person's name never reaches the browser before it is guessed.
- **Gallery** (`/area/gallery`, linked at the bottom of the hearts page): every player's photos, with the scene, the first name and the card. Built to stay light with many photos:
  - the grid loads **480 px thumbnails** (generated once by PocketBase, then cached); the 1200 px version only when a photo is opened, never the original;
  - **pages of 24**, the next page loading as you scroll; images load lazily and off-screen tiles skip rendering (`content-visibility`);
  - **every 20 s** only the photos changed since the newest one shown are fetched (one small indexed query), **only while the tab is visible**; new and replaced photos appear at the top by themselves.
- **Moderation**: in the admin UI, open `photo_submissions` and remove the photo (or delete the row). To also take the card back, delete the matching `collected_cards` row.
- To **give a card to a guest by hand**: admin UI → `collected_cards` → New record → pick the user and the card. Guests cannot do this themselves.

### Printing the card posters

```bash
# .env must point to the PRODUCTION PocketBase and site
#   VITE_POCKETBASE_URL (or PB_URL), PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, FRONTEND_URL=https://your-site
npm run posters                    # clubs (default)
npm run posters -- --suit hearts
npm run posters -- --pdf           # also a PDF (needs Playwright installed)
```

The script reads each card's secret code from PocketBase (as superuser) and writes to `posters/` (git-ignored):

- one **A3 vector SVG** per card (`clubs-07-7.svg`): the card, a QR code and a short caption. Vector means it prints sharp at A3 or any other size.
- `clubs-posters.html`: all posters, one A3 page each. Open it in Chrome → Print → *Save as PDF*, paper **A3**, margins **None**.

The QR codes use 25% error correction (level Q) and are 11 cm wide, so they scan from a couple of metres even with some glare. The script refuses a `localhost` `FRONTEND_URL` (phones at the venue could not open it). **The files contain the secret codes: don't commit or share them.** Generate the posters only after the final deploy, as codes differ between databases.

Options (with `npm run`, put them after `--`; they can be combined):

| Option              | Default    | Description                                                                 |
| ------------------- | ---------- | --------------------------------------------------------------------------- |
| `--suit <suit>`     | `clubs`    | `hearts`, `diamonds`, `spades` or `clubs`                                   |
| `--pdf`             | off        | Also writes `<suit>-posters.pdf` (needs Playwright)                         |
| `--out <dir>`       | `posters/` | Output folder                                                               |
| `--allow-localhost` | off        | Accepts a `localhost` / `127.x` / `0.0.0.0` `FRONTEND_URL`: **local tests only** |

#### Testing the posters locally

By default the script stops with *"FRONTEND_URL is http://localhost:…: guests' phones cannot open it"*. That protects you from printing posters that only work on your computer. For a local test, pass `--allow-localhost`:

```bash
# Full stack with Docker (`docker compose up`): the values in .env already match
#   VITE_POCKETBASE_URL=http://localhost:8090  FRONTEND_URL=http://localhost:8080
npm run posters -- --allow-localhost

# Frontend with `npm run dev` (port 5173): override FRONTEND_URL for this run only
FRONTEND_URL=http://localhost:5173 npm run posters -- --allow-localhost --suit hearts
```

Then open `posters/clubs-posters.html` to check the layout. To try a riddle, open the URL printed under the QR code in your browser: the QR itself points to `localhost`, which a phone resolves to *itself*, not to your computer.

**To scan the QR with a real phone**, use your computer's LAN IP instead of `localhost` (e.g. `192.168.1.20`; find it with `ipconfig` / `ip addr`). A LAN IP does not need `--allow-localhost`. Phone and computer must be on the same Wi-Fi:

```bash
# .env: the browser on the phone must reach PocketBase too
#   VITE_POCKETBASE_URL=http://192.168.1.20:8090
#   PB_ORIGINS=...,http://192.168.1.20:5173     (then restart PocketBase)
npm run dev -- --host                            # serves the site on the LAN
FRONTEND_URL=http://192.168.1.20:5173 npm run posters
```

> ⚠️ Posters made this way only work with your **local** database and URL. Delete them (`rm -rf posters`) when you are done, and for the real print run the script again against production **without** `--allow-localhost`.

### Organisers (admin view)

Organisers are normal guests who also edit **some suits**: the list **`admin_suits`** of their user (hearts, diamonds, spades, clubs, any combination). A **super admin** sets it from the site: *Site settings* → **Organisers** (see [below](#super-admin-site-settings)); a superuser can also do it from the admin UI (`/_/` → `users` → `admin_suits`). The change applies the next time the user opens the private area. Users can never set it themselves (sign-up and profile rules forbid it).

- A **clubs** organiser edits only the clubs; with **clubs and hearts**, both. Everybody else gets "forbidden", on the site and on the server.
- Organisers **play the game like every guest**: their `/area` is the usual home with their collection, plus an **Organisers** section with one card per suit they edit. (They know their suits' answers: keep it in mind for the prize.)
- The **sign-up secret code** is the same for every guest, so it is for **super admins** only (*Site settings* → **Sign-up code**).

The editor of each suit (one panel per card, except the spades):
  - **secret letter** of Ace to 10 (hearts, diamonds and clubs; Jack, Queen and King have none, the spades have none at all);
  - **clubs**: the **riddle** and its **solution** (letters and digits; stored uppercase without spaces; a "no solution yet" badge shows the riddles guests cannot play yet);
  - **diamonds**: the **quiz questions** of every card: add, edit and delete questions and answers, and pick the correct answer (a question always keeps at least two answers and exactly one correct);
  - **spades**: only the **people to find** of the "guess who" game: name, surname and the 13 hints (Ace to King), all required. Drag a hint by its ⠿ handle (mouse or finger; or focus the handle and use the arrow keys) to give it to another card without retyping: the cards stay, the texts move, and nothing changes until Save. Each person shows how many guests were given it and how many found it; a person already given to a guest can be edited (live for those guests too) but not deleted;
  - **hearts**: the **scenes** of Ace to 10 (add, edit, delete; photos already uploaded keep their own copy of the scene text).

Changes are live for the guests as soon as they are saved. Everything goes through `pb_hooks/admin.pb.js` (`/api/admin/*`): every request checks that the user organises the suit of the card, scene, question, answer or person it touches (`admin_suits`, or a super admin), and each endpoint writes only the fields it is meant to, so guests still never see letters, riddles or solutions they have not earned.

### Super admin (site settings)

Super admins are users with **`is_superadmin`** switched on: admin UI (`/_/`) → `users` → open the user → tick `is_superadmin` → Save, then log out and in again. Like `admin_suits`, users can never set it themselves. A super admin organises **every** suit, and their *Organisers* section also has a **Site settings** link. The settings are split in **tabs**, each with its own address (bookmarkable; the arrow keys move between tabs):

| Tab | Address | What |
| --- | --- | --- |
| **General** | `/area/site` or `/area/site/general` | language, the couple, date, places, gift (IBAN) |
| **Photos** | `/area/site/photos` | every photo of the site |
| **Organisers** | `/area/site/organisers` | who organises which suit |
| **Sign-up code** | `/area/site/signup-code` | the secret code guests need to register (3–50 characters) |

The *General* and *Photos* tabs:

- **Language** of the whole site: English or Italian. Every guest sees the public page, the private area, the game, the organisers' screens, the server's messages and the confirmation/reset e-mails in it.
- **The couple:** the two first names, the line above them ("We are getting married") and the hashtag.
- **Date:** the wedding date and time, picked as the wall-clock time **in the wedding's time zone** (e.g. `Europe/Rome`). It is stored with the right UTC offset (summer or winter time), so the countdown is right for every guest, and the date is shown in that time zone wherever the guest is. The RSVP deadline.
- **Ceremony** and optional **reception:** name, address, time, and an optional search text for the map (the address otherwise).
- **Gift:** message, account holder, **IBAN** (checked with its checksum, in the browser and on the server, and stored without spaces), BIC, bank, payment reason. Optional details are hidden when empty.
- **Photos:** every photo of the site: the big one at the top, the four around each section and the eight floating in the private area. Each can be replaced (shrunk, with EXIF/GPS data removed, before the upload), described for screen readers, or put back to the default picture.

The *Organisers* tab lists the **registered guests, 20 per page**, sorted by name, with a **search by name or e-mail** (any part of it, capital letters ignored). The search starts 300 ms after the last keystroke, so typing a name sends one request, not one per letter, and only the answer to the latest search is shown. Each guest has a toggle per suit, **saved at once** (and put back, with the reason, if the server refuses); super admins edit every suit, so they have none. It goes through two super-admin-only endpoints of `pb_hooks/admin.pb.js`: `GET /api/admin/users?q=&page=` (filtering and paging happen in the database: the browser never receives the whole list) and `PATCH /api/admin/users/{id}` with `{ "adminSuits": [...] }`, which writes only `admin_suits`.

How it is stored and loaded:

- `site_content` holds **one** record; `site_photos` one record per replaced photo (a slot without one shows the default). Anyone can read them (they are the public page); only super admins can write them (collection rules), and `pb_hooks/site.pb.js` validates every save.
- The site loads the content once ([`SiteContentProvider`](src/site/SiteContentProvider.tsx)) and **caches it in the browser**: returning visitors see the page at once while it refreshes in the background. First-time visitors see a short loading screen (never the default names); after 6 s without an answer, or if PocketBase cannot be reached, the defaults are shown.

### Languages

- The super admin picks **one language for everybody** (no switcher for guests). It is stored in `site_content.language`.
- **Texts** live in small typed dictionaries next to the code that uses them (`src/pages/homeMessages.ts`, `src/features/private-area/messages/*.ts`, `src/services/*/messages.ts`…). Each one is written as `const en = {...}` plus an `it` object of the same type: a missing key, or a text with different parameters, is a **compile error**. Components read them with `useMessages(dictionary)`; services (error messages) with `messagesOf(dictionary)`.
- **Dates** are formatted for the language (`en-GB`, `it-IT`); card names follow it too ("6 of spades", "6 di picche").
- Changing the language **re-renders the whole app at once** (`LanguageBoundary`) and updates `<html lang>`.
- **Server messages** (`pb_hooks/lib/i18n.js`) and the **e-mails** (`pb_hooks/lib/emails.js`, re-applied when the content is saved) follow the same setting. PocketBase's own generic field messages (e.g. "Cannot be blank") stay in English.
- **Adding a language:** add it to `LANGUAGES` in `src/i18n/language.ts` and to `LOCALES`; TypeScript then lists every dictionary missing it. Add it to the `language` select of `site_content` (a new migration), to `pb_hooks/lib/i18n.js` and to `pb_hooks/lib/emails.js`.

## PocketBase backend

Everything the backend needs is in code, so a fresh instance is ready on first start:

- **Migrations** (`pocketbase/pb_migrations/`), applied automatically at start:
  - `rsvps` collection: **anyone can create**; list/view/update/delete are superuser-only. It has field constraints (lengths, guests 0–10).
  - `users` hardening: only verified users can log in, minimum password length 8, users cannot delete their own account through the API.
  - `cards`: the 52-card deck (`suit` + `rank` 1–13, unique together), seeded by the migration. Logged-in users can read it, only superusers can change it.
    It also has hidden `letter`, `code`, `riddle` and `solution` fields (see the card game above). Codes are random, unique and generated automatically.
  - `users.admin_suits`: the suits a user organises (set by a superuser only; it replaced the yes/no `is_admin`, whose organisers got every suit). `users.is_superadmin`: super admins (set by a superuser only).
  - `site_content` (one record) and `site_photos`: the content of the public site, edited by the super admins (see above).
  - `app_settings`: key/value settings edited by the organisers, e.g. `signup_code` (never readable through the API).
  - `quiz_questions`, `quiz_answers`: the diamonds quiz (organisers only; seeded with two example questions per card). `quiz_attempts`: per user and card, the current question, the questions already faced and the wrong answers (server only).
  - `guess_people`, `guess_hints`: the people of the spades "guess who" and their 13 hints (organisers only; seeded with two example people). `guess_assignments`: the person drawn for each user, its attempts and `found` (server only). `guess_selfies`: one per (user, card), a protected photo or `same_as` the earlier selfie confirmed; created only by the hook, visible to the owner and the organisers.
  - `photo_scenes`: the scenes of each hearts card (admin only; seeded with examples).
  - `photo_submissions`: one row per (user, card) with the drawn scene and the photo (protected file, thumbnails 480 px and 1200 px). Logged-in users see the rows that have a photo (the gallery); the owner can only replace the photo, never the scene.
  - `collected_cards`: one row per (user, card), unique. **Users can only read their own rows**; creating/editing them is superuser-only until the collecting mechanics are defined. Rows are deleted with their user or card.
- **Hooks** (`pocketbase/pb_hooks/`):
  - `settings.pb.js` syncs app name, sender, SMTP and the rate limiter from environment variables **on every start**. It also points the confirmation/reset e-mail links at the React pages (`FRONTEND_URL/area/...`).
  - `rsvps.pb.js` adds cross-field validation (a declining guest cannot bring people).
  - `cards.pb.js` reveals a card's hidden `letter` only to the guests who collected it.
  - `photos.pb.js` draws the photo challenge scenes (`POST /api/game/photos/{cardId}/draw`) and collects the card when a photo is uploaded.
  - `quiz.pb.js` serves the diamonds quiz: current question, answers, lives and penalties.
  - `guess.pb.js` serves the spades "guess who": the hints of a card (`POST /api/game/guess/{cardId}`), the selfie upload and the "same person as before" confirmation, the status and the final guess.
  - `admin.pb.js` is the organisers' API (letters, riddles, solutions, scenes, quiz questions and answers, people to find, secret code, who organises which suit), each endpoint for the organisers of its suit only (the secret code and the users for super admins).
  - `signup.pb.js` checks the sign-up secret code.
  - `site.pb.js` validates the site content (IBAN checksum, BIC, date with its offset, time zone, a reception with its address and time) and the photo slots, and re-applies the e-mails in the chosen language.
  - `lib/i18n.js` holds the messages the hooks send to the guests, in English and Italian.
  - `riddles.pb.js` serves the riddle behind a QR code and checks answers (`GET /api/game/riddles/{code}`, `POST /api/game/riddles/{code}/solve`), logged-in users only. Shared helpers live in `pb_hooks/lib/`.

> Because the hooks rewrite the e-mail templates on every start and when the site content is saved, **edit them in `pb_hooks/lib/emails.js`**, not in the admin UI.

The **image** ([`pocketbase/Dockerfile`](pocketbase/Dockerfile)):

- **Pinned version** (`PB_VERSION` build arg) with **SHA-256 checksum verification** of the download.
- Multi-architecture (`TARGETARCH`), a **non-root** user, a `/pb/pb_data` volume, and a health check on `/api/health`.
- The entrypoint applies migrations, creates/updates the superuser from `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`, then `exec`s the server (so it receives stop signals cleanly).

Build and run it on its own:

```bash
docker build -t wedding-pocketbase ./pocketbase
docker run -p 8090:8090 -v pb_data:/pb/pb_data \
  -e PB_ADMIN_EMAIL=admin@example.com -e PB_ADMIN_PASSWORD='a-strong-password' \
  -e FRONTEND_URL=https://your-site.example \
  wedding-pocketbase
```

## Configuration reference

**Frontend**

| Dev (`.env`)           | Docker env var    | Description                                       |
| ---------------------- | ----------------- | ------------------------------------------------- |
| `VITE_POCKETBASE_URL`  | `POCKETBASE_URL`  | PocketBase URL **as reachable from the browser**  |

The frontend container reads it **at start-up** (written to `/env-config.js`), so one image works for every environment.

**PocketBase**

| Variable                                  | Description                                                       |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`     | Superuser created/updated at start (optional)                     |
| `FRONTEND_URL`                            | Public site URL, used in e-mail links                             |
| `PB_APP_URL`                              | Public PocketBase URL                                             |
| `PB_APP_NAME`                             | Name shown in e-mails                                             |
| `PB_SENDER_NAME`, `PB_SENDER_ADDRESS`     | E-mail sender                                                     |
| `PB_SMTP_HOST`, `PB_SMTP_PORT`, `PB_SMTP_USERNAME`, `PB_SMTP_PASSWORD`, `PB_SMTP_TLS` | SMTP server (SMTP is enabled when `PB_SMTP_HOST` is set) |
| `PB_ORIGINS`                              | Allowed CORS origins, comma separated (default `*`)               |
| `PB_RATE_LIMIT`                           | `false` disables the built-in rate limiter (default: enabled)     |
| `PB_RATE_LIMIT_EXCLUDED_IPS`              | IPs the rate limits don't apply to (e.g. the venue Wi-Fi on the day), comma separated; `-` clears the list |
| `PB_TRUSTED_PROXY_HEADERS`                | Behind a reverse proxy: header(s) holding the client IP, e.g. `X-Forwarded-For` (set in `deploy/docker-compose.prod.yml`) |

## Deploying to production

**Step-by-step guide: [`bring_to_prod_instructions.md`](bring_to_prod_instructions.md)** (hosting, domain, e-mails, and the deploy pipeline). The production files are in [`deploy/`](deploy/), and the pipeline is [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): tests on every PR, build and deploy on every merge to `main`.

In short:

- **Two services**: the frontend container (static files) and PocketBase with a **persistent volume** on `/pb/pb_data`. Run **only one** PocketBase instance; it is SQLite-based.
- Put both behind HTTPS (Caddy, Traefik, or your platform's load balancer), e.g. `www.example.com` → web and `api.example.com` → PocketBase.
- Set `POCKETBASE_URL=https://api.example.com`, `FRONTEND_URL=https://www.example.com` and `PB_ORIGINS=https://www.example.com`.
- Configure a real SMTP provider. Use a sender domain with SPF/DKIM so e-mails don't land in spam.
- **Back up** `pb_data` regularly. The admin UI has a built-in backup feature, and it can upload backups to S3.

## Scripts

| Command              | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Dev server with hot reload         |
| `npm run build`      | Type-check + production build      |
| `npm run preview`    | Serve the production build locally |
| `npm test`           | Run the unit/component tests       |
| `npm run test:watch` | Tests in watch mode                |
| `npm run typecheck`  | TypeScript project check           |
| `npm run lint`       | Lint with oxlint                   |

## Architecture notes

- **Content separate from code.** Couples only touch `wedding.ts` and `public/images`.
- **Backend behind interfaces.** Pages depend on `AuthService` and `RsvpRepository`, never on the PocketBase SDK directly.
  - The PocketBase classes are one implementation each. Tests use in-memory fakes.
  - Server errors are mapped to typed `AuthError` codes (`invalid_credentials`, `email_not_verified`, `invalid_token`, …), so the UI never parses backend payloads.
- **Defence in depth.** The same rules apply in the browser (validation), in collection rules and field constraints, and in server hooks. A honeypot field filters simple bots on the RSVP form.
- **Performance.** The private area is lazy-loaded. Vendor code (React, framer-motion, PocketBase) sits in separate chunks that stay cached across deploys.
- **Accessibility.** Inputs are labelled, errors are linked with `aria-describedby`, and messages use `role="alert"` / `role="status"`. Floating photos are hidden from screen readers. All animations respect `prefers-reduced-motion`.
