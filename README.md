# Lock In

14-day lock-in app: habits, training, food, focus timer, No Fap tracker, Notion-style journal, to-dos and reminders.

- **Next.js 16** (hosted on Vercel), installable PWA (add to home screen, works offline).
- **All data stays on the device** in `localStorage`. Back up / restore a JSON file from Plan → App + data.
- **Cloudflare Worker** (`worker/`) sends Web Push reminders, even when the app is closed.

## Run locally

```bash
npm install
npm run dev
```

Reminders while the app is open work without the Worker. For real push, run the Worker too (below) and keep `.env.local`:

```
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
```

## How reminders work

1. The app syncs its reminder list (daily reminders, to-dos with a time, the running focus timer) to the Worker: `POST /sync`.
2. A cron trigger runs every minute and checks what is due in **your** timezone.
3. It queues the message in KV and sends an empty, VAPID-signed Web Push.
4. The service worker (`public/sw.js`) wakes, calls `POST /pending`, and shows the notification.

No payload encryption is needed because the push carries no data.

## Deploy

### 1. Worker

```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create KV        # paste the id into wrangler.toml
npm run vapid -- --write                   # writes public key to wrangler.toml, private key to .dev.vars
npx wrangler secret put VAPID_PRIVATE_JWK  # paste the JSON from .dev.vars (without the quotes)
```

Set `VAPID_SUBJECT` in `wrangler.toml` to your `mailto:` address, then:

```bash
npx wrangler deploy
```

Note the URL it prints, e.g. `https://lock-in-reminders.<you>.workers.dev`.

### 2. App (Vercel)

`.env.production` already points the build at the live Worker:

```
NEXT_PUBLIC_WORKER_URL=https://lock-in-reminders.up-push-worker.workers.dev
```

Push the repo to GitHub and import it on vercel.com (framework: Next.js, no settings to change), or run `npx vercel --prod`.
Then set `ALLOWED_ORIGIN` in `worker/wrangler.toml` to your Vercel URL and run `npx wrangler deploy` in `worker/`.

### 3. Phone

- **Android / Chrome:** open the site, Plan → Install Lock In, then Turn on push reminders.
- **iPhone:** Safari → Share → Add to Home Screen. Open it from the home screen, then turn on push (iOS 16.4+ only allows push for installed apps).

## Layout

| Path | What |
| --- | --- |
| `components/App.tsx` | Shell, dock nav, timers, auto prompts |
| `components/Today.tsx` | Hero, check-in, to-dos, XP, water, checklist |
| `components/TrainEat.tsx` | Workouts + rest timer, meals + shopping list |
| `components/Focus.tsx` | Deep work timer, music, No Fap tracker |
| `components/Journal.tsx` | Block editor pages + day reviews |
| `components/Plan.tsx` | Plan ahead, schedules, reminders, settings, backup |
| `lib/core.ts` | Day model, habits, XP, streaks |
| `lib/push.ts` | Service worker, push subscribe, Worker sync |
| `worker/src/index.ts` | Cloudflare Worker |
