MCQ Property Care customer and staff portal, built with Next.js, PostgreSQL, Prisma, NextAuth, Resend, and Square.

## Production configuration

Copy `.env.example` and configure the required database/auth values. Production membership and invoice checkout also requires the Square access token, location ID, and webhook signature key. Register this exact webhook URL in Square and subscribe it to `payment.created` and `payment.updated`:

`https://mcqpropertycare.com/api/webhooks/square`

The application activates memberships and marks invoices paid only after a signed, amount-matched `COMPLETED` payment event. If Square credentials are absent, checkout fails closed and directs the customer to contact staff.

Home gate codes and Wi-Fi passwords are encrypted with `DATA_ENCRYPTION_KEY`. After setting that key for an existing database, run `npm run db:encrypt-home-access` once to encrypt legacy plaintext values.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
