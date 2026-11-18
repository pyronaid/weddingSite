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
| `/area` (organisers)         | The same game home, as the *My game* tab next to *Organise* | organisers |
| `/area/admin/:suit?`         | *Organise* tab: days left, things still to set, then one sub-tab per suit they edit: its cards (red frame = something missing), or the people to find for the spades (+ the site settings link for super admins) | organisers |
| `/area/admin/cards/:suit/:rank` | One card: letter, clubs riddle/solution, hearts scenes, diamonds quiz; what is still missing; previous/next card | organisers of that suit |
| `/area/site/:tab?/:sub?`     | Site settings in tabs: general (language, names, date, places, gift), photos, organisers, RSVPs, sign-up code, prints (sub-tabs: logo, invitations, posters) | super admins only |
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

### Printing: logo, invitations and clubs posters

Everything to print is made **in the browser, from the current data**, by a super admin: *Site settings* → **Prints**, one sub-tab each. Every choice of the designers (letters, colours, style, size, texts, decorations…) and the website address of the QR codes are **saved automatically on the super admins' account** a moment after each change ("Saved ✓" under the preview), so the work goes on from any browser or computer, and the form always matches the picture, which is drawn again from those choices. The files themselves are never stored: they are made when downloaded or printed. For a print shop use **Print / PDF** and *Save as PDF*: the fonts are embedded and the page size is set, so leave the margins at *None*.

| Sub-tab | Address | What you choose | Files |
| --- | --- | --- | --- |
| **Logo** | `/area/site/prints/logo` | The **two letters** and the colour of each; the **style**: crossed, side by side, or diagonal; a **separator** between spaced letters (&, \|, ♥ or your own text) and its colour; the **font**: script, sans serif or Times New Roman; a **border**: none, or one of the SVG files in [`src/brand/borders/`](src/brand/borders/) (see below), in the colour you choose. Colours from the site palette, or any other. Next to each letter, **six buttons** (＋ ▲ − / ◀ ▼ ▶) move it or make it bigger or smaller (steps of 2% of the logo, sizes 50–200%), plus **Reset**; a change that would push the letter out of the letters' area is refused with a warning. | SVG (vector: print shop, embroidery, stamps) and PNG (2048 px, transparent) |
| **Invitations** | `/area/site/prints/invitations` | The **size**: square (15 × 15 cm), A4 portrait or landscape; the **language** of the card (dates, times and texts, also different from the site's); a **line for the names** to write by hand (none, one guest, a couple); the **title** and **subtitle**; the **logo** from the Logo sub-tab; the **QR code** section and its text; the **sign-up code**; a white or **shaded background**; **side decorations**: plants, flowers, hearts or roots, and their colour. Date, times, places, RSVP deadline and hashtag come from the *General* tab. | Print / PDF at the card's size, SVG, PNG at 300 dpi |
| **Clubs posters** | `/area/site/prints/posters` | Nothing: one A3 poster per club, the card and the QR code of its riddle. The secret codes come from `/api/admin/prints/riddles` (super admins only). | Print all / PDF (13 A3 pages), or one poster: SVG, Print / PDF |

- **The QR codes** point to the **website address** field (Invitations and Clubs posters): by default the address the page was opened at (*Use this site's address* goes back to it), so **make the final prints from the live site**. A `localhost` address gets a warning: guests' phones cannot open it. Codes use 25% error correction (level Q): they scan with glare or a fold.
- **The posters' codes** are secret and differ between databases: print them from production, and **don't share the files**. Clubs without a riddle or solution yet are framed in red; their page tells guests "not available yet". **↻ Regenerate** makes the files again from the latest data (it never changes the codes: printed posters keep working).
- **To try a QR code with a real phone** on your local setup, open the site on your computer's LAN address (e.g. `npm run dev -- --host`, then `http://192.168.1.20:5173`, and add it to `PB_ORIGINS`), and put that address in the website field.
- **How the designs are saved:** in the `print_designs` collection, one record per designer (`logo`, `invitation`, `website`), through `GET`/`PUT /api/admin/prints/designs/{kind}` (super admins only; objects up to 16 kB; no API rules on the collection). The last save wins: if both super admins edit at once, the later change stays; a tab that comes back into view reloads the latest choices. Saved choices are checked field by field before use (unknown values fall back to the defaults, colours must be `#rrggbb`). A design made in a browser before saving existed is moved to the account the first time.
- **How the logo is drawn** ([`src/brand/`](src/brand/)): letters are **outlines** of the fonts, not text, so the logo looks the same in any program, with or without the fonts installed. Crossed letters: the first one stops short of the second with a transparent gap, so it works on any background. The invitations' decorations are line art drawn from a few shapes (leaf, berry, flower, heart). Fonts: Great Vibes and Lato (SIL Open Font License) and Tinos, the free metric-compatible Times New Roman (Apache 2.0), all free for logos.
  - The outlines (A–Z and `& | / + - ~ * . :`) are in `src/brand/glyphs/*.ts`, loaded only by the Prints pages. Another character (e.g. "é" as a separator) is written as text in the same font instead. To add characters or fonts, edit `CHARS` in [`scripts/brand/extract-glyphs.py`](scripts/brand/extract-glyphs.py) and run it on the fonts' WOFF files (`npm pack @fontsource/<family>`; the command is at the top of the script).
  - **Borders are SVG files** in [`src/brand/borders/`](src/brand/borders/): every file is a style, named after the file (`stile_uno.svg` shows as "Stile uno": underscores and dashes become spaces, first letter capitalised). **To add one**, put the SVG in the folder and deploy (the build reads the folder). A file:
    - is drawn in **one colour** (any): the site repaints every fill and stroke with the border colour chosen on the page;
    - is scaled into the logo square, keeping its proportions (any size or units: `viewBox`, or `width`/`height` without one);
    - may say how much room it leaves for the letters, on its `<svg>` element: `data-room="0.56"` is the diameter of the free circle as a fraction of the width (default `0.6`), and `data-room-shape="square"` makes it a free square. Lower it if the letters touch the drawing;
    - keeps only its drawing: scripts, event handlers, links to other files, styles, embedded HTML and images are removed when it is loaded, and its ids are made unique on the page.

    **Renaming or deleting a file:** saved designs that used it show no border (they still open). The four first borders (`small_flowers`, `big_flowers`, `circles`, `squares`) were drawn by code before; designs saved with their old names find their files.
  - Ready-made logos in [`public/brand/`](public/brand/): `gv-script.svg` (G and V crossed, script) and `gv-seal.svg` (serif, circles border), each also `-mono` (one colour) and `-light` (for dark backgrounds). They are made by the same code (`src/brand/presets.ts`); `npm run brand` rewrites them, and a test fails while they differ.

### Organisers (admin view)

Organisers are normal guests who also edit **some suits**: the list **`admin_suits`** of their user (hearts, diamonds, spades, clubs, any combination). A **super admin** sets it from the site: *Site settings* → **Organisers** (see [below](#super-admin-site-settings)); a superuser can also do it from the admin UI (`/_/` → `users` → `admin_suits`). The change applies the next time the user opens the private area. Users can never set it themselves (sign-up and profile rules forbid it).

- A **clubs** organiser edits only the clubs; with **clubs and hearts**, both. Everybody else gets "forbidden", on the site and on the server.
- Organisers **play the game like every guest**: their home has two tabs, **My game** (`/area`, the usual collection) and **Organise** (`/area/admin/<suit>`). (They know their suits' answers: keep it in mind for the prize.)
- **Organise** shows:
  - **Before the wedding:** the days left (calendar days in the wedding's time zone), how many things are still to set, and how each suit stands;
  - **one sub-tab per suit they edit** (with the number of things left), showing its cards like the guests see them. A card with something missing has a **red frame** and the number of things missing; a finished card has a green check. "Missing" is: the letter (Ace–10 of hearts, diamonds, clubs), the riddle or the solution (clubs), at least one scene (hearts Ace–10), quiz questions, or quiz questions still marked "(example)" (diamonds). The rules are in [`services/admin/todo.ts`](src/services/admin/todo.ts);
  - the spades' sub-tab: the people to find, edited right there (spades have nothing to set card by card). The overview follows each change.
- **A card opens its own page** (`/area/admin/cards/clubs/5`): the card, what is still to set (updated as soon as a change is saved), its editor, and the previous/next card of the suit.
- The **sign-up secret code** is the same for every guest, so it is for **super admins** only (*Site settings* → **Sign-up code**).

What can be set (on each card's page; the spades in their sub-tab):
  - **secret letter** of Ace to 10 (hearts, diamonds and clubs; Jack, Queen and King have none, the spades have none at all);
  - **clubs**: the **riddle** and its **solution** (letters and digits; stored uppercase without spaces; a "no solution yet" badge shows the riddles guests cannot play yet);
  - **diamonds**: the **quiz questions** of every card: add, edit and delete questions and answers, and pick the correct answer (a question always keeps at least two answers and exactly one correct);
  - **spades**: only the **people to find** of the "guess who" game: name, surname and the 13 hints (Ace to King), all required. Drag a hint by its ⠿ handle (mouse or finger; or focus the handle and use the arrow keys) to give it to another card without retyping: the cards stay, the texts move, and nothing changes until Save. Each person shows how many guests were given it and how many found it; a person already given to a guest can be edited (live for those guests too) but not deleted;
  - **hearts**: the **scenes** of Ace to 10 (add, edit, delete; photos already uploaded keep their own copy of the scene text).

Changes are live for the guests as soon as they are saved. Everything goes through `pb_hooks/admin.pb.js` (`/api/admin/*`): every request checks that the user organises the suit of the card, scene, question, answer or person it touches (`admin_suits`, or a super admin), and each endpoint writes only the fields it is meant to, so guests still never see letters, riddles or solutions they have not earned.

### Super admin (site settings)

Super admins are users with **`is_superadmin`** switched on: admin UI (`/_/`) → `users` → open the user → tick `is_superadmin` → Save, then log out and in again. Like `admin_suits`, users can never set it themselves. A super admin organises **every** suit, and their *Organise* tab also has a **Site settings** link. The settings are split in **tabs**, each with its own address (bookmarkable; the arrow keys move between tabs):

| Tab | Address | What |
| --- | --- | --- |
| **General** | `/area/site` or `/area/site/general` | language, the couple, date, places, gift (IBAN) |
| **Photos** | `/area/site/photos` | every photo of the site |
| **Organisers** | `/area/site/organisers` | who organises which suit |
| **RSVPs** | `/area/site/rsvps` | the replies to the invitation and the headcount |
| **Sign-up code** | `/area/site/signup-code` | the secret code guests need to register (3–50 characters) |
| **Prints** | `/area/site/prints/<sub>` | sub-tabs: logo designer, invitation designer, clubs posters ([below](#printing-logo-invitations-and-clubs-posters)) |

The *General* and *Photos* tabs:

- **Language** of the whole site: English or Italian. Every guest sees the public page, the private area, the game, the organisers' screens, the server's messages and the confirmation/reset e-mails in it.
- **The couple:** the two first names, the line above them ("We are getting married") and the hashtag.
- **Date:** the wedding date and time, picked as the wall-clock time **in the wedding's time zone** (e.g. `Europe/Rome`). It is stored with the right UTC offset (summer or winter time), so the countdown is right for every guest, and the date is shown in that time zone wherever the guest is. The RSVP deadline.
- **Ceremony** and optional **reception:** name, address, time, and an optional search text for the map (the address otherwise).
- **Gift:** message, account holder, **IBAN** (checked with its checksum, in the browser and on the server, and stored without spaces), BIC, bank, payment reason. Optional details are hidden when empty.
- **Photos:** every photo of the site: the big one at the top, the four around each section and the eight floating in the private area. Each can be replaced (shrunk, with EXIF/GPS data removed, before the upload), described for screen readers, or put back to the default picture.

The *Organisers* tab lists the **registered guests, 20 per page**, sorted by name, with a **search by name or e-mail** (any part of it, capital letters ignored). The search starts 300 ms after the last keystroke, so typing a name sends one request, not one per letter, and only the answer to the latest search is shown. Each guest has a toggle per suit, **saved at once** (and put back, with the reason, if the server refuses); super admins edit every suit, so they have none. It goes through two super-admin-only endpoints of `pb_hooks/admin.pb.js`: `GET /api/admin/users?q=&page=` (filtering and paging happen in the database: the browser never receives the whole list) and `PATCH /api/admin/users/{id}` with `{ "adminSuits": [...] }`, which writes only `admin_suits`.

The *RSVPs* tab shows the **headcount** on top (people coming, replies yes / no, total replies), then the **replies, newest first, 20 per page**: name, e-mail (click to write to them), coming with how many people or not, dietary needs, message, and when it was sent (in the wedding's time zone). It can be searched by name or e-mail and filtered by answer (everybody / coming / not coming); the headcount is always about everybody. A guest may reply more than once with the same e-mail (capital letters ignored): **only their latest reply counts**, the older ones are shown faded as "replaced". Read only: replies are not edited from the site. It uses `GET /api/admin/rsvps?q=&attending=all|yes|no&page=` (super admins only; the `rsvps` collection itself stays closed to everybody but superusers). Both lists share the same paging, search and stale-answer handling (`usePagedList`, `Pager`).

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
  - `print_designs`: the super admins' choices in the Prints designers (logo, invitation, QR website address), saved as they edit (never readable through the API: `pb_hooks/admin.pb.js` only).
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
| `npm run brand`      | Rewrite the ready-made logos in `public/brand/` (from `src/brand/presets.ts`) |

## Architecture notes

- **Content separate from code.** Couples only touch `wedding.ts` and `public/images`.
- **Backend behind interfaces.** Pages depend on `AuthService` and `RsvpRepository`, never on the PocketBase SDK directly.
  - The PocketBase classes are one implementation each. Tests use in-memory fakes.
  - Server errors are mapped to typed `AuthError` codes (`invalid_credentials`, `email_not_verified`, `invalid_token`, …), so the UI never parses backend payloads.
- **Defence in depth.** The same rules apply in the browser (validation), in collection rules and field constraints, and in server hooks. A honeypot field filters simple bots on the RSVP form.
- **Performance.** The private area is lazy-loaded. Vendor code (React, framer-motion, PocketBase) sits in separate chunks that stay cached across deploys.
- **Accessibility.** Inputs are labelled, errors are linked with `aria-describedby`, and messages use `role="alert"` / `role="status"`. Floating photos are hidden from screen readers. All animations respect `prefers-reduced-motion`.
