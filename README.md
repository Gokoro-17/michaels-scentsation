# Michael’s Scentsation

A React + TypeScript fragrance storefront with a live Supabase PostgreSQL database, private receipt storage, server-validated checkout, manual bank transfer verification and an administrator studio.

## Current state

- Public source repository: [Gokoro-17/michaels-scentsation](https://github.com/Gokoro-17/michaels-scentsation).
- Production storefront: [michaelscentsation.vercel.app](https://michaelscentsation.vercel.app), hosted by the `michaelscentsation` Vercel project under `gokoro-17s-projects` and connected to the GitHub repository.
- Owner-supplied Supabase project: `gpiqeudeheopvrawgnlb`. Open the [project dashboard](https://supabase.com/dashboard/project/gpiqeudeheopvrawgnlb) to manage it.
- The local environment and Supabase CLI now target this project. The previous project's connection has been removed; its remote resources were not deleted.
- Database schema, RLS, storage buckets and the `store` Edge Function are live.
- `.env.local` connects the local frontend using the public publishable key. It contains no privileged server key and is ignored by Git.
- This React/Vite application uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `NEXT_PUBLIC_` names belong to Next.js and are not read by this app. Never use a secret/service-role key as the frontend key.
- Owner-provided WhatsApp, contact email and bank details are saved in the live website settings. The designated owner account is configured in Supabase Auth and authorized in `admin_users`; password sign-in and access to the protected administrator endpoint have been verified. Delivery information, delivery fee, business address and Instagram details still need confirming.
- The public catalogue contains no invented products, stock, ratings or reviews. Add genuine products in admin and publish them when ready.
- Valid bank details are saved. New checkout remains closed until delivery information is saved; the current delivery fee defaults to zero and still needs confirming.
- The frontend is deployed on Vercel. The Supabase connection, canonical site URL and matching notification cron secret are configured in production and preview. Resend delivery is not configured or verified. Visual browser QA remains pending because no browser was available in this session.

## Run locally

On a fresh clone, copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the owner's Supabase project. The local environment file, Supabase CLI link/cache, installed dependencies and build output are intentionally excluded from Git. Never copy a service-role or secret key into a frontend variable.

Use Node.js 22 or newer. On Windows:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. The frontend talks directly to the live Supabase Edge Function, so no local Express server or service-role key is needed.

```powershell
npm.cmd run build
npm.cmd run preview
npm.cmd test
npx.cmd tsx scripts/api-check.ts
```

Use `vercel dev` when testing the Vercel-only SEO and notification cron handlers locally; Vite serves the frontend and calls the live commerce backend.

## Administrator access

The website's administrator login uses a Supabase Auth user in this project. Your Supabase dashboard login does not automatically grant access to the website. Set the store admin password directly in Supabase; authorize the user through `admin_users` as shown below.

1. The designated owner account and store administrator membership are configured, and password sign-in has been verified. Manage accounts through [Supabase Authentication → Users](https://supabase.com/dashboard/project/gpiqeudeheopvrawgnlb/auth/users). Passwords and service keys are not stored in source files. Configure the production Auth email sender before relying on email password-reset links.
2. To authorize an additional existing Auth user, use the SQL editor:

```sql
insert into public.admin_users(user_id)
select id from auth.users where lower(email) = lower('THE_OWNER_EMAIL')
on conflict do nothing;
```

3. The production site URL, exact production/local `/admin` redirects and disabled public sign-ups have been applied from `supabase/config.toml`. Customers use guest checkout and do not need accounts. Configure a production mail sender for Auth password recovery/invitations.
4. Sign in at `/admin`, confirm the saved business/bank details, complete delivery information, upload genuine product images, and publish products. Use a strong unique administrator password. Access is checked against both Supabase Auth and the live `admin_users` table on every privileged request.

Removing a user from `admin_users` immediately removes their store-management access, even if they still have a valid Auth session. The app never grants access from user-editable metadata.

The studio includes database-wide overview metrics, product creation/editing/deletion, draft publishing, promotional prices, featured and best-seller flags, stock thresholds, product galleries, bundle components, order and payment history, private receipt downloads, payment confirmation/rejection, sequential fulfilment updates, review moderation, notification retries and site settings. Orders are limited to the latest 500 matching entries per query; use date/reference/payment filters for older entries. Reviews are capped at the latest 500 per query and subscribers at 1,000 in the dashboard.

## Payment and inventory policy

- Checkout accepts IDs and quantities. PostgreSQL reads current prices and delivery fees and snapshots the order. Client-provided totals are ignored.
- Order references follow `MSC-YYYYMMDD-000001`, using the Lagos date and a sequence. Sequence gaps are normal, including after rolled-back tests.
- Each checkout has a cryptographically random 256-bit private access code. Only its SHA-256 hash is stored in the database. The reference and code are required for customer tracking, receipt upload and verified reviews. Save the code; a reference alone cannot retrieve customer information.
- The access code, guest shopping bag, wishlist and recently viewed IDs persist on the customer’s device. Cross-device wishlists/customer accounts are not part of this guest-store flow. The `wishlists` table has owner-only policies for a future signed-in customer flow.
- Creating an order or uploading a receipt does **not** deduct stock or confirm payment. Multiple unpaid orders can request the same available item.
- Confirmation locks all required inventory rows in a consistent order, checks stock again, deducts quantities once, records payment history and queues notifications atomically. If another confirmation consumed the stock, the administrator must resolve the order before confirming payment.
- A bundle reserves no inventory before confirmation. Its component requirements are snapshotted at checkout, aggregated with individual items and deducted with the bundle. Editing a bundle later does not alter existing orders. Nested bundles are rejected.
- An order can progress from Payment Confirmed → Processing → Ready for Delivery → Delivered. Unpaid orders can be cancelled. Paid orders cannot be cancelled through this dashboard: reconcile the customer’s refund and inventory explicitly rather than silently treating a bank transfer as reversed.
- Reviews require a confirmed purchase of that exact product, one per order/product, and moderator approval. Public reviews show the buyer’s first name.

## Receipt security

`payment-receipts` is private. Browser roles have no direct access to orders, receipts, payments, subscribers, notifications, admin membership or transactional RPCs. The Edge Function checks the order’s private access code or a verified administrator session before accessing data.

Uploads accept JPG, PNG and PDF up to 3 MB. The server validates size, MIME and file signatures, assigns its own random path, and records the receipt against the authorized order. Customers cannot supply a storage path. Admin downloads use short-lived, 120-second signed URLs with attachment disposition. Product images are public and accept JPG/PNG uploads. No browser can write directly to either storage bucket.

The Edge Function intentionally uses `verify_jwt = false` at the gateway because guest checkout uses a publishable API key. It explicitly validates administrator bearer tokens with Auth and authorizes each administrative action; guest order actions require their private access code. This setting is not a bypass of admin authorization.

## WhatsApp and bank details

Save the number in Website settings. Nigerian local `080…` numbers automatically become `23480…` links. Receipt submission exposes **CONFIRM PAYMENT ON WHATSAPP** only once a receipt is pending and a valid business number exists. The message includes the order reference, name, quantities and total. Nothing is automatically sent to WhatsApp.

## Email notifications

The site URL and matching `CRON_SECRET` are already configured in Supabase and Vercel, and the owner's `ADMIN_NOTIFICATION_EMAIL` is saved in Supabase. Keep the URL and cron secret synchronized if the domain changes or the secret is rotated. Set these remaining **Supabase Edge Function secrets** to enable email delivery:

```text
RESEND_API_KEY
NOTIFICATION_FROM
```

Use a verified Resend sending domain for `NOTIFICATION_FROM`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions by Supabase. Never add them as frontend `VITE_` variables.

Order, receipt, confirmation, review and low-stock events are stored durably in `notifications`. With Resend configured, the Edge Function schedules delivery in the background after each relevant action so checkout does not wait for the mail provider. Emails include the order reference, customer name, product list, total and an admin sign-in link for private receipts. Resend idempotency keys and an atomic outbox claim prevent simultaneous workers from sending the same event twice. Failed events remain visible; the Notifications screen can retry them. Exhausted automatic attempts can be reset by the manual retry button.

Vercel’s daily cron calls `/api/notifications`. The matching `CRON_SECRET` and both frontend Supabase variables are configured. Immediate sends happen during store actions; cron retries queued failures once the mail provider is configured. No notification emails were sent or verified during development because sending credentials are still pending.

Newsletter sign-ups are stored in the database and visible in the studio. A promotional campaign composer/sender is not included; when adding a campaign provider, include consent controls and a working unsubscribe link in every marketing email. Removal requests can be handled through business contact and the Supabase subscriber table.

## Vercel deployment

The GitHub repository is connected to the `michaelscentsation` Vercel project. It uses the Vite preset, Node.js 22.x, `npm ci`, `npm run build` and the `dist` output directory. The following production/preview variables are configured; use the same values if recreating the deployment:

```text
VITE_SUPABASE_URL=https://gpiqeudeheopvrawgnlb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<the project publishable key>
SITE_URL=https://michaelscentsation.vercel.app
CRON_SECRET=<same strong random secret as Supabase>
```

`vercel.json` includes SPA routing, security headers, server-generated product metadata, dynamic sitemap/robots routes and the notification cron. `.vercelignore` excludes local credentials, CLI caches and generated output from source uploads; Vercel generates a fresh production build. The SEO handler uses only the public publishable key and RLS. Published product metadata, prices and availability are included in the HTML response for link previews/search crawlers, alongside Product JSON-LD. On-site navigation also updates metadata. The sitemap reads current published products and caches for five minutes. Use the canonical production `SITE_URL` rather than a preview domain.

Deploy backend changes with:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref gpiqeudeheopvrawgnlb
npx.cmd supabase db push --project-ref gpiqeudeheopvrawgnlb
npx.cmd supabase functions deploy store --project-ref gpiqeudeheopvrawgnlb --no-verify-jwt --use-api
```

The canonical schema, indexes and inventory triggers are consolidated in `supabase/migrations/20261106094507_storefront.sql`. This migration has already been applied to the owner-supplied project through the authenticated local CLI, which recorded its migration history. Do not run the initial SQL again or repair it as though it were missing. For future changes, create a new migration and review the output of `supabase db push --project-ref gpiqeudeheopvrawgnlb --dry-run` before applying it. Local sample seeding is disabled.

The connected Supabase plugin currently uses a different account and cannot administer this owner-supplied project. Use the local CLI, which has access to this project, or reconnect the plugin to the owning account. Commands above use an explicit project reference to avoid changing another project.

The follow-up migration `20261106115937_restrict_auto_rls_helper.sql` removes browser execution privileges from Supabase's internal `rls_auto_enable()` event-trigger helper when present. Automatic RLS was verified to remain active after this change. Both migrations are recorded as applied in the owner-supplied project.

## Verification performed

The storefront header hides after scrolling downward and returns when scrolling upward. It remains visible near the top, while search or navigation is open, and during keyboard interaction. Reduced-motion preferences disable the slide transition. TypeScript build caches are stored with the installed dependencies rather than in the project root.

The interface uses Lucide controls and locally bundled Font Awesome WhatsApp/Instagram brand marks; attribution and source files are under `public/icons/`. Mobile navigation, product details and checkout adapt at tablet widths, narrow-phone product grids reduce to one column, and quantity controls have 44-pixel targets. Product galleries, category tabs and admin tables scroll inside their own regions. The layout includes safe-area spacing, coarse-pointer controls and fallback viewport heights for mobile dialogs.

The homepage media carousel sits before the combo promotion, outside the hero. It combines two eight-second silent videos with an animated campaign photograph. The MP4 clips are self-hosted, use H.264 with progressive playback, and total less than 750 KB. Only the active clip loads when playback is allowed and the section is visible. Hidden tabs and off-screen sections pause playback; reduced-motion and data-saving preferences require explicit playback. Controls include play/pause, previous/next, slide selection, keyboard arrows and touch swipes. Hover pauses slide rotation. The film sources, posters and generated-photo prompt are documented in `docs/ASSETS.md`.

CSS breakpoint rules were audited from 280 to 1,440 pixels, and the frontend modules and local icon files passed HTTP checks. These checks do not substitute for rendered browser or physical-device testing, which remains pending.

- TypeScript frontend/server checks and optimized production build passed.
- Sixteen unit tests passed for header scroll direction, movement thresholds, pinned controls, contact validation, checkout payloads, private access codes, file signatures and accurate Naira/kobo formatting.
- Four SEO handler checks passed for the dynamic sitemap, robots output, missing-product HTTP status and invalid product paths.
- Vercel production build and deployment passed. Seven public HTTP checks passed for the homepage, shop, admin route, robots, sitemap, missing-product HTTP 404 and unauthorized notification endpoint HTTP 401. Production HTML includes the brand and security headers; the sitemap uses the canonical production domain.
- Eight HTTP checks against the owner-supplied Supabase project passed: public catalogue access, denied private reads/RPCs, required admin sign-in, checkout validation and private tracking authorization.
- Eighteen live PostgreSQL checks in `tests/database.sql` passed against the owner-supplied project. They cover server pricing, idempotency, receipt status, bundle inventory, repeat confirmation, stock shortages, review eligibility/duplicates/moderation, fulfilment transitions, RLS and private storage. All fixture rows and settings changes rolled back; no test products, customers, orders or administrators remain.
- The Supabase security advisor reported no warnings/errors. Informational notices about RLS-enabled tables with no policies are intentional default-deny private tables; browser grants are revoked. Foreign-key indexes were added after the performance review.
- Production dependencies had zero reported npm audit vulnerabilities at verification time.
- No browser was available, so desktop/mobile visual appearance, keyboard interactions and the complete admin click-through flow are not browser-verified. Auth email delivery and Resend email delivery still require verification after their sender credentials are configured.

Campaign artwork and the built-in image generation prompts are documented in [docs/ASSETS.md](docs/ASSETS.md). All final optimized assets are included under `public/images/`.
