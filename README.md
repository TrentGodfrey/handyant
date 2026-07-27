# MCQ Property Care

MCQ Property Care customer and staff portal, built with Next.js, PostgreSQL, Prisma, NextAuth, and Resend.

## Production configuration

Copy `.env.example` to the production app's `/var/www/handyant/.env`. Production
requires `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
`DATA_ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, and
`EMAIL_BCC`. Google login and explicit upload-budget overrides are optional.
The environment file must be readable by the `webapps` account but not by other
users (for example, owner `root:webapps` and mode `0640`).

Billing is managed directly by MCQ in Square; invoice, payment-checkout, and
payment-webhook handlers in this app are retired and return HTTP 410.

Home gate codes and Wi-Fi passwords are encrypted with `DATA_ENCRYPTION_KEY`.
Generate this key once, keep a protected off-host copy, and do not rotate or
replace it without a data-migration plan. After setting it for an existing
database, run `npm run db:encrypt-home-access` once to encrypt legacy plaintext
values.

## Local development

Install dependencies, configure `.env`, then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Before publishing a change, run:

```bash
npm test
npm run lint
npm run build
```

## VPS deployment

Production is hosted on the MCQ VPS, not Vercel. The application lives at
`/var/www/handyant`, runs under PM2 as `handyant`, and is served through Nginx
at `https://mcqpropertycare.com`. Use Node.js `20.19+`, `22.12+`, or `24+`, as
required by the current Prisma release.

Deployments must create and verify a database/upload backup plus an application
rollback copy before changing the live release. A source checkout cannot be
built with `npm ci --omit=dev`: TypeScript, Tailwind, and the PostCSS plugin are
build-time dependencies. Use this order after the backup and rollback copy are
confirmed:

```bash
cd /var/www/handyant
npm ci --include=dev
npm run build
npm run db:migrate
npm prune --omit=dev
npm ls --omit=dev --depth=0
git rev-parse HEAD > .release-commit
sudo -u webapps env PM2_HOME=/home/webapps/.pm2 pm2 reload handyant --update-env
sudo -u webapps env PM2_HOME=/home/webapps/.pm2 pm2 save
curl -fsS https://mcqpropertycare.com/ | grep -F 'MCQ Property Care'
```

`npm ci` generates the Prisma client. Prisma, `tsx`, and `dotenv` are production
dependencies because migrations and the systemd reminder worker still require
them after the optional prune. Follow the one-time production database baseline
procedure in [`ops/DATABASE_MIGRATIONS.md`](ops/DATABASE_MIGRATIONS.md) before
the first deployment containing that baseline. Also run the reminder and PM2
checks in [`ops/README.md`](ops/README.md) before closing the release.

## Production email

Customer-facing messages are sent through Resend and replies are routed to Anthony:

```env
RESEND_API_KEY=re_...
EMAIL_FROM="Anthony at MCQ <anthony@mcqpropertycare.com>"
EMAIL_REPLY_TO=anthony@mcqpropertycare.com
EMAIL_BCC=me@jordangodfrey.com
```

Operational mail (messages, bookings, memberships, visits, and to-dos) uses the BCC address. Security mail containing password-reset, verification, email-change, or home-invitation links is never copied.

Cloudflare Email Routing owns inbound mail. Its catch-all rule forwards every `@mcqpropertycare.com` address to `mcqpropertycare@gmail.com`. Resend owns outbound mail for both the website and Gmail. Create two sending-only, domain-restricted Resend API keys: one for the VPS and one used only as Gmail's SMTP password.

In Gmail, add `anthony@mcqpropertycare.com` under **Accounts and Import → Send mail as** with these outgoing settings:

```text
SMTP server: smtp.resend.com
Port: 465
Username: resend
Password: the dedicated Gmail SMTP Resend API key
Security: SSL
```

The Gmail verification message arrives through Cloudflare's catch-all. After confirming it, make `anthony@mcqpropertycare.com` the default From address, set the same address as the default reply-to, and choose Gmail's option to reply from the same address that received the message.

The complete provider migration, DNS safety checks, testing sequence, and Anthony handoff are in [`docs/email-setup.md`](docs/email-setup.md).

Staff-created customer onboarding is the standard flow: create the customer and home, choose the plan, add known tasks, then create a single-use invitation from the home page. The customer chooses their own password from the emailed link; staff should not create or retain customer passwords.

Bookings use one to four consecutive visit blocks. Each block is always 1 hour 45 minutes, and both staff and customer scheduling use the same availability and server-side overlap protection. Open home to-dos can be attached during booking; completing a linked booking task also completes its home to-do. Revenue reporting is intentionally omitted because financial reporting is managed in Square.
