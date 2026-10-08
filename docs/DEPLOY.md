# Deploying Checkmate

The app has two parts that must be deployed separately:

| Part | Host | Why |
| ---- | ---- | --- |
| Client (static site) | Vercel | Vite SPA, no server needed |
| Game server (Node + WebSockets) | Render | Rooms live in server memory with long-lived sockets — this cannot run on Vercel serverless |

## 1. Deploy the server (Render)

1. Dashboard → New → **Blueprint** → select this repo (`render.yaml` is at the repo root).
2. Wait until the service is **Live** (free tier sleeps when idle — open its URL once to wake it).
3. Sanity check: `GET https://<your-service>.onrender.com/api/health` must return 200.
4. Set env var `CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app` on the Render service (you get this URL in step 2 — set a placeholder first, update after). This controls CORS **and** the host baked into invite links. Redeploy the service after setting it.

## 2. Deploy the client (Vercel)

1. Import `Raunaks1/CheckMate`. Framework preset: Vite. **Root directory: repository root** (so npm workspaces resolve `checkmate-shared`).
2. Build command: `npm run build -w shared && npm run build -w client`
3. Output directory: `client/dist`
4. Set env var `VITE_SERVER_URL=https://<your-service>.onrender.com` (**Production**).
5. **Deploy.** `VITE_SERVER_URL` is compiled into the JS bundle, so any change to it requires a redeploy.

`vercel.json` already handles SPA rewrites (`/play/*`, `/game/:roomId` deep links work on refresh/share).

## 3. Smoke test on the live URLs

1. Open the Vercel app → Play a Friend → enter a name → **Create game & copy link**.
2. You should land in the lobby with an invite link starting with your Vercel host.
   - `localhost` in the link → `CLIENT_ORIGIN` is wrong on Render. Fix it, redeploy the service.
3. Friend opens the link → join screen → moves sync both ways.

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Red toast `Create failed (405)` | Client built without `VITE_SERVER_URL`; the POST hits Vercel static hosting | Set the env var, **redeploy** |
| Red toast `Failed to fetch` / `Could not reach the game server` | Render asleep, down, or CORS-blocked | Wake the service; check `CLIENT_ORIGIN` matches the Vercel URL exactly; check browser console for CORS errors |
| First room after idle takes ~50s | Render free-tier cold start | Expected — the app retries automatically. Render Starter ($7/mo) removes it |
| Friend sees "Room not found" | Stale/expired room or wrong server | Rooms live only on the server that created them; both sides must use links from the same deployment |

## Local development (unchanged)

```sh
npm run dev   # client :5173 + server :3001, proxied so no env vars needed
```
