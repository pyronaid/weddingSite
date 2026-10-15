# 💍 Wedding Site

A wedding website with two parts:

- **Public page:** a single page with scroll animations. It covers the **date (with a live countdown)**, **location**, the **RSVP form** and the **IBAN for gifts**.
- **Private area** (`/area`): login, sign-up with **e-mail confirmation**, and **forgot / reset password**. The forms sit on a centered card surrounded by floating photos. After login, a placeholder page is shown.

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
│   ├── config/wedding.ts          # ← ALL the wedding content lives here
│   ├── config/runtimeConfig.ts    # env / runtime configuration loader
│   ├── router.tsx                 # routes: "/" and "/area/*"
│   ├── pages/HomePage.tsx         # the public single page
│   ├── sections/                  # public page sections (Date, Location, RSVP, Gift)
│   ├── components/                # shared UI (Hero, ScrollSection, Form fields, ...)
│   ├── features/private-area/     # private area: layout, guards, auth context, pages
│   ├── services/
│   │   ├── auth/                  # AuthService interface + PocketBase implementation
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

1. **Text & data**: edit [`src/config/wedding.ts`](src/config/wedding.ts). It holds the names, date, venues, RSVP deadline, IBAN, the photos of each section, and the photos floating in the private area. No component needs to change.
   - Write the `date` in ISO-8601 **with the UTC offset** (e.g. `2027-06-19T16:00:00+02:00`).
2. **Photos**: put them in `public/images/` (`.jpg`/`.webp`, about 1200 px on the long side) and update the paths. The SVG files shipped in the repo are placeholders.
3. **Colours & fonts**: change the CSS variables at the top of [`src/styles/global.css`](src/styles/global.css).

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
| `/area/suits/:suit`          | Suit page (placeholder for now)         | logged-in only  |
| `/area/login`                | Login                                   | guests only     |
| `/area/signup`               | Sign up → "check your inbox"            | guests only     |
| `/area/forgot-password`      | Request a reset e-mail                  | guests only     |
| `/area/reset-password?token` | Choose a new password (link in e-mail)  | anyone          |
| `/area/verify-email?token`   | Confirms the e-mail (link in e-mail)    | anyone          |

Flows and security choices:

- **Sign up** creates the user and sends a confirmation e-mail. **Only verified users can log in**: this is enforced by the server (`authRule = "verified = true"`), not just by the UI.
- Logging in **before confirming** shows "please confirm your e-mail", with a **resend** button (60 s cooldown).
- **Forgot password** always shows the same message, whether or not the account exists, so nobody can find out which e-mails are registered.
- Reset links work **only once**. Expired or reused links show a clear "request a new link" page.
- The session is stored by the PocketBase SDK (localStorage), stays in sync across tabs, and is **re-validated with the server** each time the private area opens.
- PocketBase's **rate limiter** is on (e.g. 2 auth attempts per 3 s per IP).
- The private area JavaScript is **code-split**: public visitors never download it.
- **Every new content page** goes under the `RequireAuth` route in [`src/router.tsx`](src/router.tsx): anonymous visitors are sent to the login page and brought back to the page they asked for.

### The card game ("find the joker")

The dashboard shows four cards (hearts, diamonds, spades, clubs) with the number of cards the guest collected out of the cards in the deck, e.g. `3/13`. Each card links to its suit page.

- Data comes from PocketBase through [`src/services/game`](src/services/game) (a `GameRepository` interface, like the RSVP and auth services). The totals are read from the deck too, so changing the deck needs no frontend release.
- To **give a card to a guest** for now: admin UI → `collected_cards` → New record → pick the user and the card. Guests cannot do this themselves.

## PocketBase backend

Everything the backend needs is in code, so a fresh instance is ready on first start:

- **Migrations** (`pocketbase/pb_migrations/`), applied automatically at start:
  - `rsvps` collection: **anyone can create**; list/view/update/delete are superuser-only. It has field constraints (lengths, guests 0–10).
  - `users` hardening: only verified users can log in, minimum password length 8, users cannot delete their own account through the API.
  - `cards`: the 52-card deck (`suit` + `rank` 1–13, unique together), seeded by the migration. Logged-in users can read it, only superusers can change it.
  - `collected_cards`: one row per (user, card), unique. **Users can only read their own rows**; creating/editing them is superuser-only until the collecting mechanics are defined. Rows are deleted with their user or card.
- **Hooks** (`pocketbase/pb_hooks/`):
  - `settings.pb.js` syncs app name, sender, SMTP and the rate limiter from environment variables **on every start**. It also points the confirmation/reset e-mail links at the React pages (`FRONTEND_URL/area/...`).
  - `rsvps.pb.js` adds cross-field validation (a declining guest cannot bring people).

> Because the hook rewrites the e-mail templates on every start, **edit them in `settings.pb.js`**, not in the admin UI.

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

## Deploying to production

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
