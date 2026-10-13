# 💍 Wedding Site

A single-page wedding website with scroll animations. It covers the **date (with a live countdown)**, **location**, the **RSVP form** and the **IBAN for gifts**. It is built with **React + TypeScript + Vite** and uses **Supabase** as a Backend-as-a-Service.

- Hero section with the couple's photo (parallax zoom on scroll)
- Pictures of the bride and groom slide in and out as you scroll past each section
- Pink → warm-white gradient background, with info shown on contrasting cards for easy reading
- RSVP form saved to Supabase (insert-only, protected by Row Level Security)
- IBAN with a one-click "copy" button
- Footer link to the future private area (currently `https://www.google.it`)
- Responsive, keyboard-accessible, respects `prefers-reduced-motion`

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Customising the content](#customising-the-content)
4. [Setting up Supabase](#setting-up-supabase)
5. [Running locally (Node)](#running-locally-node)
6. [Running locally (Docker)](#running-locally-docker)
7. [Configuration reference](#configuration-reference)
8. [Scripts](#scripts)
9. [Architecture notes](#architecture-notes)

---

## Tech stack

| Concern         | Choice                                          |
| --------------- | ----------------------------------------------- |
| UI              | React 19 + TypeScript                           |
| Build tool      | Vite                                            |
| Animations      | framer-motion (scroll-linked `useScroll`)       |
| Styling         | CSS Modules + CSS custom properties (tokens)    |
| Backend / DB    | Supabase (Postgres + RLS)                       |
| Tests           | Vitest + Testing Library                        |
| Lint            | oxlint                                          |
| Container       | Multi-stage Docker → unprivileged nginx         |

## Project structure

```
.
├── public/
│   ├── images/              # ← put your photos here
│   └── env-config.js        # runtime config (overwritten in Docker)
├── src/
│   ├── config/
│   │   ├── wedding.ts       # ← ALL the wedding content lives here
│   │   └── runtimeConfig.ts # env / runtime configuration loader
│   ├── components/          # reusable UI (Hero, ScrollSection, RsvpForm, ...)
│   ├── sections/            # page sections: Date, Location, RSVP, Gift
│   ├── services/rsvp/       # RSVP domain: types, validation, repositories
│   ├── hooks/               # useCountdown, useCopyToClipboard
│   ├── lib/                 # Supabase client, formatters
│   └── styles/global.css    # design tokens + gradient background
├── supabase/migrations/     # SQL to create the RSVP table + policies
├── docker/                  # nginx config + runtime env script
├── Dockerfile
└── docker-compose.yml
```

## Customising the content

1. **Text & data**: edit [`src/config/wedding.ts`](src/config/wedding.ts). It holds the names, date, venues, RSVP deadline, IBAN and which photo shows in each section. No component needs to change.
   - Write the `date` in ISO-8601 **with the UTC offset** (e.g. `2027-06-19T16:00:00+02:00`), so the countdown is correct for guests in any time zone.
2. **Photos**: put your pictures in `public/images/` (`.jpg`/`.webp` recommended, about 1200 px on the long side for section photos and 2400 px for the hero), then update the paths in `wedding.ts`. The SVG files shipped in the repo are placeholders.
3. **Colours & fonts**: change the CSS variables at the top of [`src/styles/global.css`](src/styles/global.css). `--card-bg` is the card fill colour.

## Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/migrations/20261012000000_create_rsvps.sql`](supabase/migrations/20261012000000_create_rsvps.sql). If you use the Supabase CLI, run `supabase db push` instead.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public key**.

> 🔐 **Security model.** The anon key is meant to be public. The migration enables Row Level Security, and anonymous visitors can **only insert** RSVPs. They can never read, update or delete them. You can read the answers in the Supabase dashboard (Table editor → `rsvps`). The future private area can read them through an authenticated role.

> 💡 You can run the site **without Supabase** while working on the design. The form then logs the submission to the browser console and shows a warning instead of saving it.

## Running locally (Node)

Prerequisites: **Node.js ≥ 20** and npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env with your Supabase URL and anon key

# 3. Start the dev server (hot reload)
npm run dev
```

Open http://localhost:5173.

To try the production build:

```bash
npm run build
npm run preview   # http://localhost:4173
```

## Running locally (Docker)

Prerequisites: Docker (with Compose v2).

### Option A: docker compose (recommended)

```bash
cp .env.example .env      # fill in your Supabase values
docker compose up --build
```

Open http://localhost:8080.

### Option B: plain docker

```bash
docker build -t wedding-site .

docker run --rm -p 8080:8080 \
  -e SUPABASE_URL="https://your-project-ref.supabase.co" \
  -e SUPABASE_ANON_KEY="your-anon-public-key" \
  -e PRIVATE_AREA_URL="https://www.google.it" \
  wedding-site
```

How the image works:

- **Multi-stage build.** Node builds the site and runs the type-check and tests (a broken commit cannot produce an image). Only the static files are copied into `nginx-unprivileged`, which runs as a **non-root** user on port **8080**.
- **Runtime configuration.** The environment variables are read **when the container starts** and written to `/env-config.js`. The same image works for every environment without a rebuild.
- `GET /healthz` returns `ok` and is used by the Docker `HEALTHCHECK`.
- Fingerprinted assets are cached for one year. `index.html` and `env-config.js` are never cached, so new deploys show up immediately.

## Configuration reference

| Dev (`.env`)             | Docker env var       | Description                            | Default                 |
| ------------------------ | -------------------- | -------------------------------------- | ----------------------- |
| `VITE_SUPABASE_URL`      | `SUPABASE_URL`       | Supabase project URL                   | _(empty: console mode)_ |
| `VITE_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY`  | Supabase anon public key               | _(empty: console mode)_ |
| `VITE_PRIVATE_AREA_URL`  | `PRIVATE_AREA_URL`   | Target of the footer "Private area" link | `https://www.google.it` |

`docker-compose.yml` maps the `VITE_*` values from `.env` to the container variables, so a single `.env` file covers both workflows.

## Scripts

| Command              | What it does                         |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Dev server with hot reload           |
| `npm run build`      | Type-check + production build        |
| `npm run preview`    | Serve the production build locally   |
| `npm test`           | Run the unit/component tests once    |
| `npm run test:watch` | Tests in watch mode                  |
| `npm run typecheck`  | TypeScript project check             |
| `npm run lint`       | Lint with oxlint                     |

## Architecture notes

- **Content separate from code.** Everything a couple wants to change lives in `wedding.ts` and `public/images`.
- **Backend abstraction.** The UI depends only on the `RsvpRepository` interface (`src/services/rsvp/types.ts`).
  - Supabase is one implementation, and it is **lazy-loaded** on the first submission, which keeps about 200 kB off the initial page load.
  - **Switching to PocketBase:** add a `PocketBaseRsvpRepository` that implements `submit()` (e.g. `pb.collection('rsvps').create(...)`, with a create-only API rule) and return it from `createRsvpRepository()`. No component changes are needed.
- **Defence in depth on input.** The same limits are enforced in three places: the browser (`maxLength`), client-side validation (`validation.ts`, unit-tested) and Postgres `CHECK` constraints. A honeypot field filters out simple bots.
  - For heavy spam you can add Cloudflare Turnstile/hCaptcha with a Supabase Edge Function.
- **Accessibility.** The page uses semantic landmarks and labelled inputs. Errors are linked with `aria-describedby`, and focus moves to the first invalid field. The countdown text is screen-reader friendly. All motion is disabled when `prefers-reduced-motion` is set.
- **Private area.** It is only a link for now. A natural next step is Supabase Auth (magic link) plus an authenticated route that lists the RSVPs.
