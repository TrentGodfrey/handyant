# MCQ Property Care

MCQ Property Care customer and staff portal, built with Next.js, PostgreSQL, Prisma, NextAuth, Resend, and Square.

## Production configuration

Copy `.env.example` and configure the required database/auth values. Production membership and invoice checkout also requires the Square access token, location ID, and webhook signature key. Register this exact webhook URL in Square and subscribe it to `payment.created` and `payment.updated`:

`https://mcqpropertycare.com/api/webhooks/square`

The application activates memberships and marks invoices paid only after a signed, amount-matched `COMPLETED` payment event. If Square credentials are absent, checkout fails closed and directs the customer to contact staff.

Home gate codes and Wi-Fi passwords are encrypted with `DATA_ENCRYPTION_KEY`. After setting that key for an existing database, run `npm run db:encrypt-home-access` once to encrypt legacy plaintext values.

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

Production is hosted on the MCQ VPS, not Vercel. The application lives at `/var/www/handyant`, runs under PM2 as `handyant`, and is served through Nginx at `https://mcqpropertycare.com`.

Deployments should create a database backup and rollback copy before installing, migrating, building, and restarting the PM2 process. `npm ci` automatically generates the Prisma client required by the production build. Verify both the PM2 process and public HTTPS site after restart.

## Production email

Customer-facing messages are sent through Resend and replies are routed to Anthony:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=Anthony at MCQ <anthony@mcqpropertycare.com>
EMAIL_REPLY_TO=anthony@mcqpropertycare.com
EMAIL_BCC=me@jordangodfrey.com
```

Operational mail (messages, bookings, memberships, to-dos, and invoices) uses the BCC address. Security mail containing password-reset, verification, email-change, or home-invitation links is never copied.

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

Staff-created customer onboarding is the standard flow: create the customer and home, choose the plan, add known tasks, then create a single-use invitation from the home page. The customer chooses their own password from the emailed or texted link; staff should not create or retain customer passwords.
