# Fresas con Crema / Lovely Fresitas — Project Handoff

Paste this whole doc into a new chat (and upload the attached code files) to continue where we left off.

## Business & Account Info
- Business: "Lovely Fresitas" (brand shown to customers: "Fresas con Crema") — Rialto, CA fresas con crema shop.
- Owner: Orlando Zamora (non-technical; deploys via terminal `git add` / `git commit` / `git push` → Vercel auto-deploy).
- Instagram: @lovelyfresitas_
- Phone / Zelle / Twilio number: (909) 725-2384 personal; Twilio SMS number is +1 909-271-0455 / (909) 271-0455
- Pickup address: 1526 W Bonnie View Dr, Rialto, CA 92376
- Repo: https://github.com/OZamora24/Fresas-App.git
- Local project path: `Downloads\fresas-order-app (1)\fresas-app`
- Live customer site: https://fresas-app-zeta.vercel.app
- Admin dashboard: /admin
- Sales dashboard: /admin/sales
- **App officially launched** — live promo posted to Instagram (@lovelyfresitas_) same day as the notes below.

## Tech Stack
- Next.js (pages router) + Supabase (Postgres + admin client) + Twilio SMS + OneSignal web push + Vercel hosting.
- Bilingual EN/ES throughout (customer chooses language; stored per-order).

## Feature History (all live/deployed unless noted)
1. Core order builder: base, cup size, toppings, syrups, qty, pickup date/time, name, phone, notes, total, payment method (Zelle/cash), payment confirmation.
2. Supabase schema + admin dashboard (view/edit/delete orders, mark ready).
3. Twilio SMS: order-confirmation text on order placement AND ready text on "mark done" — both bilingual (`pages/api/orders.js`, `sendConfirmationTextToCustomer` / `sendReadyTextToCustomer`).
4. Sold-out toggles per flavor/extra.
5. Pre-order dates.
6. Repeat-customer shortcut (autofill from last order via phone lookup).
7. Excel export of orders (`pages/api/export.js`).
8. Sales dashboard (`pages/admin/sales.js`, `pages/api/sales-summary.js`) with timezone bugfix already applied.
9. **Catering availability feature** (complete): `shop_settings.catering_days` (int[] 0-6) + `catering_info` text; admin toggle chips for days of week + free-text info; customer-facing "🎉 Catering" card on `/catering` shown only when days are set, bilingual formatted day list. Migration: `supabase-migration-catering.sql`.
10. **Weekday vs. weekend store hours** (complete): `shop_settings` columns `hours_weekday_start/end`, `hours_weekend_start/end`. `lib/menu.js` `buildPickupTimes()` is weekday/weekend-aware (`isWeekendDateKey`, `hhmmToMinutes`); threaded through admin edit-order modal and `pages/api/orders.js` server-side validation. Migration: `supabase-migration-hours-delivery.sql` (name is legacy — delivery portion was removed).
11. **Delivery feature — built then reverted.** Fully removed; it's an ad-hoc verbal policy only. Do not rebuild unless explicitly asked again.
12. **Bugfix**: `pages/index.js` pickup-window hint now computed live from `buildPickupTimes()` + shop settings, bilingual, instead of a hardcoded string.
13. **UI space/tap-reduction pass** (complete): order page "Pick your base" is a `<select>` dropdown; admin order cards show toppings/syrup as an always-visible list instead of a `<details>` toggle.
14. **Photo gallery** (complete): `/photos` page + Supabase Storage-backed admin upload (`pages/api/photos.js`) — owner uploads shop/order photos (max 4MB each) straight from `/admin`, shown in a grid on the public Photos page. Home page links out to it.
15. **"Add to Home Screen" tutorial banner** (complete): `components/AddToHomeBanner.js`, shown on first visit to Home or Order. Originally used two separate `storageKey` values (one per page) so watching the tutorial on Home didn't dismiss it on Order — **fixed** by unifying both pages to the same shared key (`fresasA2HSSeen`), confirmed working live.
16. **Promo codes** (complete, full feature): `promo_codes` Supabase table (`code`, `discount_type` percent/fixed, `discount_amount`, `expires_at`, `max_uses`, `times_used`, `active`). Admin section on `/admin` to create/edit/turn-on-off/delete codes (`pages/api/promo-codes.js`, session-protected). Customer-facing entry field in the order review sheet with live validation (`pages/api/promo/check.js` — public endpoint, recomputes the cart subtotal server-side from `lib/menu.js` pricing so a discount can't be spoofed by editing the page). `pages/api/orders.js` re-validates any submitted promo server-side on order placement (recomputes discount, rejects with `promo_invalid` if the client's total is off by more than $0.01) and increments `times_used`. Migration: `supabase-migration-promo-codes.sql`.
    - Customer-facing push notification when a promo goes live is **not built yet** — would need a customer opt-in flow first (today, OneSignal push is only wired for the owner's "new order" alert, tagged `role: admin`). Noted as a "happy to build next" line directly in the admin promo-codes UI.
    - First real code created for launch: **LAUNCH15** — 15% off, no expiration, created inactive so Orlando can flip it on ("Turn on" button in admin) whenever he's ready to post it.
17. **Catering page load-flicker fix** (complete, two-stage): first pass added a same-size loading skeleton so the card no longer popped in and shoved the page down (0px layout shift, verified). User's screen recording showed the *real* issue was the delay itself (client-side fetch to `/api/settings` after the page had already painted). Fixed properly by moving that fetch into `getServerSideProps` in `pages/catering.js` — the settings are now fetched server-side and baked into the HTML before it ever reaches the browser, so Next.js's client-side router just holds the old page on screen until the new page's data is ready, then swaps straight to final content. Verified frame-by-frame with Playwright: zero flicker, zero blank/placeholder state on a normal load.
18. **Draft auto-save on the order page — confirmed intentional, not a bug.** User reported that refreshing or closing/reopening the order page still shows their name/choices. This is `localStorage`-backed draft persistence (`fresasOrderDraft`), working as designed. User decided to leave it as-is unless real customer feedback says otherwise.
19. **Launch promo video** (delivered, not code): a ~30s silent vertical (1080×1920) marketing video recorded against the live UI — 12 oz cup, name "Diego Hernandez" + a made-up phone number, full order flow through to the "🍓 Order sent!" confirmation screen, real 🍓 emoji (matching the site's own) in the branded intro/outro cards. Built by cloning the repo locally, adding a local-only `DEMO_MODE` short-circuit (never committed) so a fake order could be submitted safely without touching production Supabase/Twilio/OneSignal, and recording with Playwright. File not stored in this project — was delivered directly to Orlando.

## Twilio A2P 10DLC Campaign — STATUS AS OF LAST CHECK: PENDING, NEEDS USER TO CHECK
- Brand: "Fresas con Crema", SID `BNb26907bb27958867375dff54dc6dc7c4` — **Approved**, Sole Proprietor type.
- Campaign SID: `CM840d575e827fefc7476de07f18eaac85`, use case `SOLE_PROPRIETOR`.
- Final resubmitted Campaign Description (already submitted):
  > "Orlando Zamora, a sole proprietor doing business as Fresas con Crema in Rialto, CA, sends order-status text messages to his own customers. Customers opt in by voluntarily entering their phone number in an optional field on the online order form; a phone number is never required to place an order. Recipients receive up to 2 messages per order: an order-received confirmation and a pickup-ready notice. No marketing or promotional messages are sent. Reply STOP to opt out, HELP for help. Msg & data rates may apply."
- **Next step**: user needs to log into Twilio Console → Messaging → Regulatory Compliance → Campaigns → check status of the campaign SID above. Until approved, SMS sends may silently fail (code doesn't block order creation either way). Not re-checked since the last handoff — ask Orlando for current status if this matters for the task at hand.

## Ideas Floated, Not Built
- Customer-facing push notifications tied to promo activation (needs an opt-in flow first — see item 16 above).
- Order numbers / printable kitchen ticket / loyalty punch card — mentioned early on, never requested since.
- Dedicated "how to download the app" tab on the main page — deferred by user request.
- "Start Over" button on the order page (to clear the draft) — user declined for now, revisit only if real customer feedback asks for it.

## Attached Files
The current live source code has been attached alongside this doc:
`menu.js`, `settings.js`, `orders.js`, `admin.js`, `index.js`, `order.js`, `catering.js`, `photos.js`, `slots.js`, `login.js`, `adminSession.js`, `supabaseAdmin.js`, `sales.js`, `sales-summary.js`, `export.js`, `last-order.js`, `promo-codes.js`, `promo/check.js`, `AddToHomeBanner.js`, `globals.css`, and all `supabase-migration-*.sql` files plus the base `supabase-schema.sql`.

When continuing in a new chat: upload this doc + the code files, and say what you'd like to work on next (e.g. "let's build the promo push-notification opt-in flow" or "check if Twilio approved yet").
