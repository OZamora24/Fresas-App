# Fresas con Crema — Order App

A customer ordering page + your own admin dashboard, with push notifications
to your phone when a new order comes in.

- `/` — customer order page (share this link with customers)
- `/admin` — your dashboard (password-protected, only you should have this link)

No coding experience needed to deploy this — just follow the steps below in
order. It uses three free services:

1. **Supabase** — stores your orders
2. **OneSignal** — sends the push notification to your phone
3. **Vercel** — hosts the actual website

Total time: about 20–30 minutes the first time.

---

## 1. Create your Supabase project (the database)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up (free, no credit card).
2. Click **New project**. Pick any name (e.g. "fresas-app") and a password (you won't need to remember this password — write it down anyway).
3. Once it's created, go to the **SQL Editor** (left sidebar) → **New query**.
4. Open the `supabase-schema.sql` file in this folder, copy everything in it, paste it into the SQL editor, and click **Run**. This creates your `orders` table.
5. Go to **Project Settings** (gear icon) → **API**. You'll need two values from this page in a minute:
   - **Project URL** → this is your `SUPABASE_URL`
   - **service_role key** (under "Project API keys" — click "reveal") → this is your `SUPABASE_SERVICE_ROLE_KEY`

Keep this tab open — you'll copy these values into Vercel in step 4.

⚠️ The service_role key is powerful (it can read/write anything in your
database) — never put it in the customer-facing page or share it publicly.
It only ever goes into Vercel's environment variables, which stay private.

---

## 2. Create your OneSignal app (push notifications)

1. Go to [onesignal.com](https://onesignal.com) → sign up (free).
2. Click **New App/Website**. Name it "Fresas con Crema".
3. Choose **Web Push** as the platform.
4. For "Site Setup", choose **Typical Site**, and enter the web address you'll deploy to. (If you don't know it yet, just put a placeholder like `https://fresas-app.vercel.app` — you can edit this later in OneSignal's settings once you know your real Vercel address from step 4.)
5. Once created, go to **Settings → Keys & IDs**. Copy the **OneSignal App ID** shown at the top — you'll use it twice (as `ONESIGNAL_APP_ID` and `NEXT_PUBLIC_ONESIGNAL_APP_ID`).
6. Scroll to the **App API Keys** section. OneSignal no longer shows a ready-made key — you create one yourself:
   - Click **+ Create API Key** (or **New API Key**).
   - Give it a name like "fresas-app-server".
   - Under permissions/scope, choose the option that allows **sending notifications** (selecting "All" is fine for a single-owner app like this).
   - Click Create. The key value (starts with `os_v2_app_...`) is shown **once** — copy it immediately into your notes. If you lose it, you'll need to create a new key.
   - This is your `ONESIGNAL_REST_API_KEY`.

---

## 3. Push this project to GitHub

Vercel deploys from a GitHub repository.

1. Go to [github.com](https://github.com) → sign up if you don't have an account → click **New repository** (name it `fresas-app`, keep it private if you'd like).
2. On your computer, open a terminal in this project folder and run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/fresas-app.git
   git push -u origin main
   ```
   (GitHub shows you these exact commands on the new repository's page — you can copy them from there instead.)

---

## 4. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign up with your GitHub account (free, no credit card).
2. Click **Add New → Project**, and import the `fresas-app` repository you just pushed.
3. Before clicking Deploy, open **Environment Variables** and add each of these (copy the names exactly):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | from Supabase step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase step 1 |
   | `ADMIN_PASSWORD` | make up a password for your `/admin` login |
   | `SESSION_SECRET` | any long random string ([generate one here](https://generate-secret.vercel.app/32)) |
   | `ONESIGNAL_APP_ID` | from OneSignal step 2 |
   | `ONESIGNAL_REST_API_KEY` | from OneSignal step 2 |
   | `NEXT_PUBLIC_ONESIGNAL_APP_ID` | same value as `ONESIGNAL_APP_ID` |

4. Click **Deploy**. After a minute or two you'll get a live web address like `https://fresas-app.vercel.app`.
5. Go back to OneSignal → Settings → your Web Push platform settings, and update the site URL to your real Vercel address from step 4 (if you used a placeholder earlier).

Your app is now live:
- Share `https://fresas-app.vercel.app` with customers.
- Open `https://fresas-app.vercel.app/admin` yourself, log in with the `ADMIN_PASSWORD` you set, and click **"Enable push notifications on this device"** once. From then on, every new order pings your phone.

---

## Making changes later

Any time you want to tweak the menu, prices, or design, just tell Claude
what you'd like changed in this project's files, then run:
```
git add .
git commit -m "update menu"
git push
```
Vercel automatically redeploys within about a minute of every push — no
extra steps needed.

---

## How it works, briefly

- The customer page (`/`) sends the order to `/api/orders`, which saves it
  in Supabase and asks OneSignal to push a notification to any device
  tagged `role: admin`.
- The admin page (`/admin`) is behind a simple password. Once logged in, it
  polls `/api/orders` every 5 seconds for new orders, and tags your device
  with `role: admin` when you click "Enable push notifications."
- Nothing customer-facing ever touches your Supabase service key — only the
  server-side API routes do.
"# Fresas-App" 
