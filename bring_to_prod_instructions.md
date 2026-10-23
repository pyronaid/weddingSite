# Bringing the wedding site live

A step-by-step guide to putting the site online on your own domain. You will:

- **Host** it on a server.
- **Buy** a domain.
- **Send** the confirmation and password-reset e-mails reliably.
- **Deploy** with a pipeline, so every change you merge goes live by itself.

> Prices and free tiers change often (Hetzner, for example, changed its cloud prices twice in 2026).
> The figures below were checked in October 2026: **always confirm them on the provider's page** before buying.

**What you end up with**

```
 guests' phones ──HTTPS──▶  gioevale.com ─┐
                       api.gioevale.com ──┤   one server (Docker)
                                            ▼
                                  ┌────────────────────┐
                                  │ Caddy (HTTPS)      │  certificates renewed by itself
                                  │  ├─ web            │  the site (nginx, static files)
                                  │  └─ pocketbase     │  API, database, photos, admin UI
                                  └────────────────────┘
 GitHub: merge to main ──▶ tests ──▶ build images ──▶ deploy over SSH
 e-mails: pocketbase ──SMTP 587──▶ Brevo (or similar) ──▶ guests' inboxes
```

**Total cost (rough):**

| Item | Cost |
| --- | --- |
| Domain | €5–20 per year |
| Server | €5–25 per month, only for the months you need it |
| E-mails | Free on a free tier |

**Time:** half a day the first time, mostly waiting for DNS. Do it **at least 2–3 months before the wedding**, before the invitations with the link and QR codes go out.

The repository already contains everything the server needs:

| File | What it is |
| --- | --- |
| [`deploy/docker-compose.prod.yml`](deploy/docker-compose.prod.yml) | The production stack: Caddy + site + PocketBase |
| [`deploy/Caddyfile`](deploy/Caddyfile) | HTTPS and routing for the two domains |
| [`deploy/.env.example`](deploy/.env.example) | Template of the server settings (domains, passwords, SMTP) |
| [`deploy/deploy.sh`](deploy/deploy.sh) | Updates the server to a version: backup → update → health check → rollback |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | The pipeline: tests on every PR; build and deploy on every merge to `main` |

---

## 1. Choose the hosting

### How big must it be? (≈100 guests at the same time)

This site is light. The work is done by **one PocketBase process** (Go + SQLite), which comfortably serves thousands of concurrent users on a small server.

- **Traffic:**
  - 100 guests browsing, playing and uploading photos is a few requests per second.
  - The gallery checks for new photos every 20 s per open page.
- **Uploads:**
  - Photos are shrunk in the browser to about 0.5 MB before upload.
  - Thumbnails are made once by the server, which is the only CPU spike.
- **Disk:**
  - Hearts photos: 100 guests × ~13 ≈ 1,300 photos.
  - Spades selfies: up to 1,300 more.
  - With thumbnails that is **≈ 2–4 GB**, plus the site's own photos.

**Recommended size:** 2 vCPU, 4 GB RAM, 40 GB SSD, located in the **EU**. Guests are in Italy, and EU hosting keeps their e-mails and photos under GDPR.

**Two rules from the architecture:**
1. **Exactly one PocketBase instance, with a persistent disk.** It is SQLite-based, so no "scale to N replicas" and no serverless.
2. Don't use a platform that deletes the disk on redeploy.

### The options

| | Option | Examples (EU regions) | Approx. price | Fits this repo | Good | Less good |
| --- | --- | --- | --- | --- | --- | --- |
| **A** ⭐ | **A small virtual server (VPS) with Docker** | [Hetzner Cloud](https://www.hetzner.com/cloud) (DE/FI), [Netcup](https://www.netcup.com) (DE), [Aruba Cloud](https://www.arubacloud.com) (IT), [OVHcloud VPS](https://www.ovhcloud.com) (FR), [DigitalOcean](https://www.digitalocean.com) (DE/NL) | €5–25/month | **100%: the files above and the pipeline target exactly this** | Cheapest; full control; fixed price; one place for everything; backups by the provider | You run a Linux server: 30 minutes of setup (below), then updates run by themselves |
| B | **Container platform with a volume** | [Fly.io](https://fly.io) (one machine + volume), [Railway](https://railway.com), [Render](https://render.com) (with a paid disk) | $5–25/month | Partly: reuse the two Dockerfiles, but write the platform's config instead of `deploy/` | No server to maintain; HTTPS included | Pricing by usage; vendor-specific config; persistent disks need care (single region, one instance) |
| C | **Managed PocketBase + static hosting** | [PocketHost](https://pockethost.io) for PocketBase + [Cloudflare Pages](https://pages.cloudflare.com) / [Netlify](https://www.netlify.com) for the site | ≈ $10/month + free | Partly: upload `pb_migrations` and `pb_hooks`, set the same settings by hand; check that hooks with `require()` work there | Almost nothing to maintain | Less control (rate limits, backups, logs); two providers; you must check the plan's limits |

**Recommendation: option A on Hetzner Cloud.**
- **Why:** best price/performance in the EU, and the repository's pipeline deploys to it as is.
- **If Hetzner has no availability or is too expensive** (in mid-2026 it reported limited availability of some plans): pick **Netcup** or **Aruba Cloud** (Italian, data centres in Italy). Every command below works on any Ubuntu server.
- **Plan to pick:** a "shared vCPU" plan with 2 vCPU / 4 GB.
  - **Intel/AMD (x86):** nothing to change.
  - **ARM** (Hetzner CAX, cheaper): set `IMAGE_PLATFORMS=linux/arm64` (step 4.3).

### 1.1 Create the server (Hetzner example)

1. Create an account at [hetzner.com/cloud](https://www.hetzner.com/cloud) and a project, e.g. "wedding".
2. On **your computer**, if you don't have an SSH key yet, create one: `ssh-keygen -t ed25519 -C "you@example.com"`.
   - **Your public key** is in `~/.ssh/id_ed25519.pub`.
3. **Add Server:**
   - **Location:** Nuremberg/Falkenstein/Helsinki.
   - **Image:** **Ubuntu 24.04**.
   - **Type:** 2 vCPU / 4 GB (shared).
   - **Networking:** public IPv4 **and** IPv6.
   - **SSH key:** paste your public key.
   - **Backups:** enable them (≈ +20%; daily snapshots of the whole server: your safety net).
   - **Name:** `wedding`.
4. Note the server's **IPv4** (e.g. `195.201.90.14`) and **IPv6**.
5. Optional but good: **Firewalls → Create firewall**, allowing inbound TCP 22, 80, 443 and UDP 443, and apply it to the server.

### 1.2 Prepare the server (once, ~15 minutes)

Connect as root and run these (they are safe to copy and paste in order):

```bash
ssh root@195.201.90.14

# System up to date, automatic security updates, firewall.
apt update && apt -y full-upgrade
apt -y install unattended-upgrades ufw
dpkg-reconfigure -f noninteractive unattended-upgrades

# Docker Engine + Compose plugin (official script).
curl -fsSL https://get.docker.com | sh

# A user for the deploys (no password, SSH keys only), allowed to use Docker.
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys

# The site's folder.
install -d -o deploy -g deploy /opt/wedding

# Firewall: SSH, HTTP, HTTPS (+ HTTP/3).
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable

# Log in with keys only.
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Check, **from a second terminal**, that `ssh deploy@195.201.90.14` works before closing the root session.

---

## 2. Buy the domain

### 2.1 Choose it

- **Name:** short and easy to type from an invitation: `giuliaemarco.it`, `giuliaemarco2027.com`, `sigiulia.it`…
- **Extension:**

  | Extension | Who can register | Price | Registrars |
  | --- | --- | --- | --- |
  | `.it` | You need an address in the EU/EEA | ≈ €5–15/year | Italian registrars such as [Aruba](https://www.aruba.it), [Register.it](https://www.register.it), or [OVHcloud](https://www.ovhcloud.com) |
  | `.com` | Anyone | ≈ €10–15/year | [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (sells at cost), [Porkbun](https://porkbun.com), [Namecheap](https://www.namecheap.com) |
  | `.wedding` | Anyone | Pricier, ≈ €30–50/year | Check your registrar |

  - **Check the yearly renewal price** too, not only the first year.

### 2.2 Buy it

1. Search the name at the registrar, buy it for **2 years** so it doesn't expire around the wedding, and turn on **auto-renew**.
2. Turn on **two-factor authentication** on the registrar account: whoever controls the domain controls the site and its e-mails.
3. Keep **WHOIS privacy** on. For `.it` the personal data of private individuals is hidden automatically.

### 2.3 Point it to the server (DNS)

In the registrar's DNS panel (or at Cloudflare DNS, free, if you move the DNS there), create:

| Type | Name | Value | Notes |
| --- | --- | --- | --- |
| `A` | `@` (the domain itself) | `195.201.90.14` | The site |
| `A` | `www` | `195.201.90.14` | Redirects to the domain |
| `A` | `api` | `195.201.90.14` | PocketBase: API, photos, admin UI |
| `AAAA` | `@`, `www`, `api` | the server's IPv6 | Optional but recommended |

- **If you use Cloudflare DNS**, set the three records to **"DNS only"** (grey cloud): Caddy then gets the HTTPS certificates directly. Cloudflare's proxy is not needed for 100 guests.
- **Wait for the records to work** (minutes to a few hours). From your computer, `nslookup api.giuliaemarco.it` (or `dig +short api.giuliaemarco.it`) must answer with the server's IP **before** the first deploy (step 4.4).

The e-mail records (SPF, DKIM, DMARC) come in step 3.

---

## 3. Set up the e-mails

### 3.1 What is sent, and how much

PocketBase sends two kinds of e-mails, in the language chosen by the super admin:
- the **confirmation** after sign-up;
- the **password reset**.

With ~100 guests that is a few hundred e-mails in total, mostly the days after the invitations go out. A free plan is enough.

Use a **transactional e-mail provider** (an SMTP relay), not your personal Gmail and not a mail server on the VPS:
- deliverability (not ending up in spam) needs a reputable sender;
- most hosts, Hetzner included, **block outgoing ports 25 and 465** on new servers. Port **587** is open.

| Provider | Free tier (Oct 2026) | Notes |
| --- | --- | --- |
| [**Brevo**](https://www.brevo.com) ⭐ | ≈ 300 e-mails/day | EU company (France), SMTP included, simple domain setup. Free e-mails may carry a small Brevo mention |
| [Resend](https://resend.com) | ≈ 3,000/month, 100/day | Modern, very simple; US-based |
| [Postmark](https://postmarkapp.com) | Paid (≈ $15/month), trial | Best deliverability; worth it only if mails land in spam elsewhere |
| [Amazon SES](https://aws.amazon.com/ses/) | Almost free | Cheapest at volume, but you must request leaving the "sandbox" first |
| [Mailjet](https://www.mailjet.com) | ≈ 200/day | EU company |

**Recommendation: Brevo.** If 300/day is ever too tight (e.g. everybody registers the same evening and a few retry), the cheapest paid plan removes the daily cap.

### 3.2 Configure Brevo

The menu names below may move a little in Brevo's UI.

1. **Create an account** at brevo.com and confirm it.
2. **Senders, Domains & Dedicated IPs → Domains → Add a domain:** your domain.
   - **Brevo shows DNS records to add at your registrar**, usually:
     - a `TXT` **Brevo code** (ownership);
     - **DKIM** (`TXT`/`CNAME` like `brevo1._domainkey`);
     - **SPF** (`TXT` on `@`, `v=spf1 include:… ~all`);
     - **DMARC** (`TXT` on `_dmarc`, e.g. `v=DMARC1; p=none; rua=mailto:you@yourmail.com`).
   - **Copy them exactly.**
   - **Only one SPF record per domain:** if the registrar already created one (e.g. for its own mail forwarding), merge the `include:` parts into that single `v=spf1 … ~all` record.
   - Click **Authenticate** once the DNS records work (can take up to a few hours).
3. **Senders → Add a sender:** `noreply@gioevale.com`, name "Giovanni & Valentina".
4. **SMTP & API → SMTP → Generate a new SMTP key.** Note:
   - server `smtp-relay.brevo.com`;
   - port `587`;
   - login (an address like `xxxx@smtp-brevo.com`);
   - the **key** (shown once).
5. These go into the server's `.env` (step 4.2):

   ```ini
   PB_SENDER_ADDRESS=noreply@gioevale.com
   PB_SMTP_HOST=smtp-relay.brevo.com
   PB_SMTP_PORT=587
   PB_SMTP_USERNAME=xxxx@smtp-brevo.com
   PB_SMTP_PASSWORD=the-smtp-key
   PB_SMTP_TLS=false        # 587 uses STARTTLS automatically; true is only for port 465
   ```

   > The SMTP settings are written by PocketBase at every start from these variables (`pb_hooks/settings.pb.js`): change them in `.env`, not in the admin UI.

### 3.3 Test it (after the first deploy)

1. **PocketBase test e-mail:** admin UI `https://api.gioevale.com/_/` → **Settings → Mail settings → Send test email**.
2. **Full guest flow on the site:** sign up with a personal address → confirmation e-mail → click → log in; then "Forgot password".
3. **Spam check:** send one e-mail to the address shown at [mail-tester.com](https://www.mail-tester.com) and aim for **9/10 or more**. A low score almost always means a missing or duplicated SPF/DKIM record.

### 3.4 Optional: receiving e-mails

The site only **sends**. If you want an address guests can write to (e.g. `sposi@gioevale.com`), add **forwarding** to your personal mailbox:
- **Cloudflare Email Routing:** free, if the DNS is at Cloudflare;
- your **registrar's forwarding**;
- [ImprovMX](https://improvmx.com): free.

This adds `MX` records and an SPF `include:`; keep a **single** SPF record, merged.

---

## 4. Deploy, and the pipeline for every change

### 4.1 How the pipeline works

**On every pull request:** the pipeline runs typecheck, lint and the tests. The PR shows a ✔ or ✘.

**On every merge to `main`, after the tests pass:**
1. It builds the two Docker images (site and PocketBase) and pushes them to **GitHub's container registry** (`ghcr.io`), tagged with the commit.
2. It connects to the server over SSH and runs `/opt/wedding/deploy.sh <commit>`, which:
   1. downloads the new images while the site keeps running;
   2. **backs up the database** to `/opt/wedding/backups/` (PocketBase pauses for a few seconds);
   3. starts the new version: PocketBase applies the new database migrations by itself;
   4. **waits for both services to be healthy**. If they aren't, it fails loudly and tells you how to roll back.

The deploy step stays **off** until you set the variable `DEPLOY_ENABLED=true` (step 4.3). Until then, merges only test and build.

### 4.2 Put the production files on the server (once)

From **your computer**, in the repository folder:

```bash
SERVER=deploy@195.201.90.14
scp deploy/docker-compose.prod.yml $SERVER:/opt/wedding/docker-compose.yml
scp deploy/Caddyfile deploy/deploy.sh deploy/.env.example $SERVER:/opt/wedding/
ssh $SERVER 'cd /opt/wedding && chmod +x deploy.sh && cp -n .env.example .env && chmod 600 .env'
ssh $SERVER 'nano /opt/wedding/.env'   # fill it in (below)
ssh $SERVER 'ls -la /opt/wedding'       # .env is hidden from a plain `ls`: -a shows it
```

Fill in `/opt/wedding/.env`:

| Setting | Value |
| --- | --- |
| `GHCR_OWNER` | Your GitHub user, lowercase (`pyronaid`) |
| `SITE_DOMAIN`, `API_DOMAIN` | `gioevale.com` and `api.gioevale.com` |
| `ACME_EMAIL` | Your e-mail (Let's Encrypt writes here only about certificate problems) |
| `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD` | The **superuser** of PocketBase's admin UI. A long random password, e.g. from `openssl rand -base64 24`, kept in a password manager |
| `PB_APP_NAME`, `PB_SENDER_NAME` | e.g. `Giovanni & Valentina` (shown in the e-mails) |
| SMTP | From step 3.2 |

> If you change `deploy/docker-compose.prod.yml` or `deploy/Caddyfile` in the repository later, copy them to the server again with the same `scp` commands. The pipeline only updates the images.

### 4.3 Connect GitHub to the server (once)

1. **A key for the pipeline**, on your computer (a dedicated key, not your personal one):

   ```bash
   ssh-keygen -t ed25519 -f wedding_deploy -C "github-actions deploy" -N ""
   ssh-copy-id -i wedding_deploy.pub deploy@195.201.90.14   # or append it to /home/deploy/.ssh/authorized_keys
   ssh-keyscan -t ed25519 195.201.90.14 > wedding_known_hosts
   ```

   Compare the fingerprint of `wedding_known_hosts` (`ssh-keygen -lf wedding_known_hosts`) with the one the server shows (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`, run on the server). They must be equal.

2. **GitHub → the repository → Settings → Environments → New environment**, named exactly **`deploy`**: the workflow deploys through it. In it:
   - **Environment secrets → Add secret:** the four `DEPLOY_*` values below.
   - **Environment variables → Add variable:** `DEPLOY_ENABLED` and the optional ones.

   Repository-level values (**Settings → Secrets and variables → Actions**, Secrets and Variables tabs) work too, if you prefer them there.

   | Kind | Name | Value |
   | --- | --- | --- |
   | Secret | `DEPLOY_HOST` | `195.201.90.14` |
   | Secret | `DEPLOY_USER` | `deploy` |
   | Secret | `DEPLOY_SSH_KEY` | The whole content of `wedding_deploy` (the private key) |
   | Secret | `DEPLOY_KNOWN_HOSTS` | The content of `wedding_known_hosts` |
   | Variable | `DEPLOY_ENABLED` | `true` |
   | Variable (optional) | `IMAGE_PLATFORMS` | `linux/arm64` **only** for an ARM server |
   | Variable (optional) | `DEPLOY_PATH` | Only if you didn't use `/opt/wedding` |

   Then delete `wedding_deploy` from your computer, or keep it in a password manager.

   If a run says **"Deploy is off"** or **"Deploy settings missing"** (on the run's summary page, under *Check the deploy settings*), it names exactly what to fix.

3. Optional, for extra safety: **Settings → Environments → production → Required reviewers → you**. Every deploy then waits for your click in the Actions tab.

4. The images are **private** packages of your account. The pipeline logs the server in with its own short-lived token, so nothing else is needed.

### 4.4 First deploy

1. Make sure the DNS records of step 2.3 work: Caddy needs them to obtain the certificates.
2. **GitHub → Actions → "CI and deploy" → Run workflow** (branch `main`), or merge any PR.
3. Follow the run. The first one takes ~5–10 minutes; later ones are faster thanks to the build cache.
4. **Check the site:**
   - `https://gioevale.com` shows the site, with the padlock;
   - `https://www.gioevale.com` redirects to it;
   - `https://api.gioevale.com/api/health` answers `{"message":"API is healthy."…}`.
5. **If the HTTPS certificate is not issued:**
   - check the DNS, and that ports 80/443 are open (Hetzner firewall + `ufw`);
   - read the logs: `ssh deploy@… 'cd /opt/wedding && docker compose logs caddy --tail=50'`.

### 4.5 First configuration of the site (once, ~1 hour)

1. **Admin UI:** `https://api.gioevale.com/_/`, log in with `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`.
   - **Turn on MFA** (password + a one-time code by e-mail): **Collections → `_superusers` → ⚙ (edit collection) → Options**, enable **OTP** and **MFA**, Save. The admin UI is on the internet, so protect it. It needs the e-mails of step 3 to work.
2. **Backups:** **Settings → Backups:**
   - enable the **automatic backups**, e.g. `0 3 * * *` (every night at 03:00), keeping 7;
   - better still, store them **off the server**: same page → S3 storage (Hetzner Object Storage, Backblaze B2 or Cloudflare R2, a few cents a month).
   - **These nightly backups include the photos.** The per-deploy copies in `/opt/wedding/backups/` include only the database.
3. **The couple (super admins):**
   1. Sign up on the site (with the secret code `#wedding`) and confirm the e-mail.
   2. In the admin UI: **users** → you → tick **`is_superadmin`** → Save.
   3. Log out and in again.
   - **Organisers:** the same, with `is_admin`.
4. **Site settings** (private area → *Site settings*): **language**, names, date and time zone, RSVP deadline, ceremony/reception, gift text and **IBAN**, and all the **photos**. These texts are shown as written, so write them in the chosen language.
5. **The game content** (organisers' home):
   - **Sign-up code:** change it, and put the new one on the invitations.
   - **Letters** of every suit.
   - **Clubs:** the riddles and their **solutions**.
   - **Hearts:** the scenes.
   - **Diamonds:** replace the **"(example)" questions**.
   - **Spades:** replace the **example people** (their answers are public in the repository).
6. **Clubs posters with the real address.** The QR codes point to `FRONTEND_URL`. Print them **after** the domain works, from your computer:

   ```bash
   PB_URL=https://api.gioevale.com FRONTEND_URL=https://gioevale.com \
   PB_ADMIN_EMAIL=… PB_ADMIN_PASSWORD=… npm run posters
   ```

7. **A full rehearsal from a phone on mobile data:**
   - sign up, then log in;
   - RSVP;
   - one card of each suit: a photo, a quiz answer, a riddle via QR, a selfie;
   - the gallery;
   - the password reset.

### 4.6 Changes after go-live

1. Work on a branch → open a pull request → wait for the ✔ checks.
2. **Merge** → the pipeline deploys by itself in a few minutes. The Actions tab shows each deploy.
3. **Something wrong after a deploy?** Pick one:
   - **The usual way: Revert the PR on GitHub** (button on the merged PR) and merge the revert. The previous code deploys like any change.
   - **Immediately, from the server:** `ssh deploy@… /opt/wedding/deploy.sh rollback`. This goes back to the last version that worked; running it twice undoes the rollback.
   - **If the bad version also changed data** (a new migration): restore the database copy taken just before it (PocketBase stops for a moment):

     ```bash
     cd /opt/wedding && ls -1t backups/          # pick the file "…-before-<bad tag>.tgz"
     docker compose stop pocketbase
     docker run --rm -v wedding_pb_data:/data -v "$PWD/backups":/backup alpine:3.20 \
       sh -c 'cd /data && tar xzf /backup/pb_data-YYYYMMDD-HHMMSS-before-TAG.tgz'
     ./deploy.sh rollback                         # also restarts PocketBase
     ```

   - **Last resort:** Hetzner's daily server backup (Hetzner console → the server → Backups → Restore).
4. **Changes that are not code:** none of these need a deploy:
   - **Content and photos:** Site settings.
   - **Game content:** the organisers' screens.
   - **Mail settings:** edit `/opt/wedding/.env`, then `ssh deploy@… 'cd /opt/wedding && docker compose up -d'`.

**Without GitHub Actions** (e.g. while fixing the pipeline): build and push the images from your computer (`docker build -t ghcr.io/pyronaid/wedding-web:manual1 .` and `docker build -t ghcr.io/pyronaid/wedding-pocketbase:manual1 pocketbase`, then `docker push` both after a `docker login ghcr.io` with a token that can write packages), log the server in to `ghcr.io` the same way, and run `/opt/wedding/deploy.sh manual1` on the server.

---

## 5. Before and on the wedding day

- **Freeze:** no deploys in the last days and on the day. Content edits from the site are fine.
- **Venue Wi-Fi! The important one.** PocketBase limits requests **per IP address**. By default:

  | Requests | Limit per IP |
  | --- | --- |
  | Logins | 2 every 3 s |
  | Uploads and other creates | 20 every 5 s |
  | All API calls | 300 every 10 s |

  Guests on mobile data each have their own IP. **Guests on the venue's Wi-Fi share one public IP**, and those limits would block them ("too many requests").

  Before the party, do one of these:
  - **Recommended: exclude the venue's IP from the limits.**
    1. Connect to the venue Wi-Fi once (e.g. at a visit) and open [ifconfig.me](https://ifconfig.me) to read its public IP.
    2. On the server, put it in `/opt/wedding/.env`, e.g. `PB_RATE_LIMIT_EXCLUDED_IPS=198.51.100.7`. Separate several with commas, and add the IPv6 too if the page shows one.
    3. Apply it with `ssh deploy@… 'cd /opt/wedding && docker compose up -d'`.
    4. After the wedding, set `PB_RATE_LIMIT_EXCLUDED_IPS=-` the same way: `-` clears the list.
  - **If you can't get the IP in advance: raise the limits for the day.** In the admin UI → **Settings → Rate limits**, e.g. logins 50 / 3 s, creates 200 / 5 s, API 3000 / 10 s. Put the defaults back after the wedding.
  - **Optional:** ask the venue whether their Wi-Fi has a "client isolation" or captive portal that would stop phones from reaching the site, and test it at a visit.
- **Monitoring:** a free monitor, e.g. [UptimeRobot](https://uptimerobot.com) or Better Stack, on `https://gioevale.com/healthz` and `https://api.gioevale.com/api/health`, alerting your phone.
- **Disk space:**
  - **Check:** `ssh deploy@… df -h /` should show plenty free.
  - **Resize if needed:** in the Hetzner console you can upgrade the server or add a volume in minutes.
- **The day before:** download a backup from the admin UI (Settings → Backups → download) to your computer.

---

## 6. After the wedding

1. **Keep the photos:**
   - **From the admin UI:** a backup zip (it includes every photo).
   - **Or only the photos:**

     ```bash
     ssh deploy@… 'docker run --rm -v wedding_pb_data:/data alpine:3.20 tar czf - -C /data storage' > wedding-photos.tgz
     ```

2. **Leave the site online** for a few weeks so guests can see the gallery. Then:
   - turn the PocketBase rate limits back to normal (`PB_RATE_LIMIT_EXCLUDED_IPS=-`, or the defaults in the admin UI);
   - after the last download, delete the server: Hetzner bills by the hour, so the bill stops when it is deleted.
3. **Privacy:** the site holds the guests' names, e-mails and photos.
   - Delete the server, and its backups (also the S3 ones), once you have kept what you want.
   - Tell the guests (a line in the invitation or on the site) that photos are shared with the other guests and deleted after the wedding.
4. **Other services:**
   - **Domain:** keep it (it is cheap) or let it expire.
   - **Brevo:** can stay on the free plan, or be closed.

---

## Troubleshooting

| Symptom | Likely cause → fix |
| --- | --- |
| No padlock / certificate error | DNS not pointing to the server yet, or ports 80/443 closed → check `nslookup`, firewall; `docker compose logs caddy` |
| The site loads but says it cannot reach the server | `API_DOMAIN` wrong, or the `api` DNS record missing; check `https://api.gioevale.com/api/health` |
| Errors about CORS in the browser console | The site is opened on a different address than `SITE_DOMAIN` (e.g. `www` without redirect) → fix `.env`, `docker compose up -d` |
| Confirmation e-mails don't arrive | Admin UI → Logs; check the SMTP settings in `.env`; port 587 with `PB_SMTP_TLS=false`; sender address of your authenticated domain |
| E-mails land in spam | SPF/DKIM/DMARC missing or duplicated → mail-tester.com tells which |
| "Too many requests" at the venue | Rate limits and shared Wi-Fi IP → section 5 |
| A QR code opens the wrong address | Posters printed before the domain was set → reprint with `FRONTEND_URL` (step 4.5.6) |
| Deploy says "Deploy is off" or "Deploy settings missing" | Open the *Check the deploy settings* step of the *Deploy to the server* job: it names what to add. Usually the environment isn't named exactly `deploy`, `DEPLOY_ENABLED` was saved as a secret instead of a variable, or one of the four secrets is missing |
| Deploy says "Missing /opt/wedding/.env" | Step 4.2 not finished: `cp .env.example .env` in `/opt/wedding` and fill it in (`ls -la` shows it) |
| Deploy job fails at "SSH" | `DEPLOY_KNOWN_HOSTS` or `DEPLOY_SSH_KEY` wrong, or the key not in `/home/deploy/.ssh/authorized_keys` |
| Deploy says "NOT healthy" | `ssh deploy@… 'cd /opt/wedding && docker compose logs --tail=100'`; then `./deploy.sh rollback` |
