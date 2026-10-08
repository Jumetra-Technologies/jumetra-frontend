# Jumetra-Fronted
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

The app is hosted at [https://jumetra-frontendv0.vercel.app/](https://jumetra-frontendv0.vercel.app/). Production talks to the Firebase Python API:

```text
NEXT_PUBLIC_API_URL=https://europe-west4-hhipsystemv0.cloudfunctions.net/api
NEXT_PUBLIC_WS_URL=wss://api-aoxa3kagvq-ez.a.run.app
```

HTTP requests use the Firebase HTTPS Function. WebSocket requests use the Cloud Run host because the HTTPS Function wrapper does not proxy WebSocket upgrades. Add `https://jumetra-frontendv0.vercel.app` as an authorized domain in Firebase Authentication. `NEXT_PUBLIC_*` values are embedded at build time, so redeploy after changing them.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# updated UI