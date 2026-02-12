# Environment & Deployment — web-backup

This file documents the environment variables required to run the web app locally and in production.

1) Create `src/web-backup/.env.local` from `.env.local.example`

  - Copy the example and fill real values. NEVER commit `.env.local` to git.

  ```bash
  cp .env.local.example .env.local
  # edit .env.local and add secret values
  ```

2) Key descriptions

  - `NEXT_PUBLIC_SUPABASE_URL` — public Supabase project URL (exposed to client)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key (exposed to client)
  - `SUPABASE_URL` — same as above, used on server
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret)
  - `DISCORD_BOT_TOKEN` — Discord bot token (server-only secret)
  - `DISCORD_GUILD_ID`, `DEVELOPER_GUILD_ID`, `DEVELOPER_ROLE_ID` — optional defaults used by middleware and maintenance utilities
  - `BOT_API_URL` — URL for the bot API (defaults to `http://localhost:3000`)
  - `NEXT_PUBLIC_DISCORD_BOT_INVITE` — invite URL shown in UI (public)
  - `NEXT_PUBLIC_SITE_URL` — public site URL (for links)
  - `DISCORD_API_TIMEOUT_MS` — optional timeout for Discord API calls (ms)

3) Run locally

  ```bash
  cd src/web-backup
  npm install
  cp .env.local.example .env.local   # fill values
  npm run dev
  ```

4) Build / production preview

  ```bash
  npm run build
  npm run start
  ```

5) Production deployment notes

  - On Vercel / Netlify: set the same environment variables in the project settings (do not upload `.env.local`).
  - Keep `SUPABASE_SERVICE_ROLE_KEY` and `DISCORD_BOT_TOKEN` secret — grant rotate/revoke access if leaked.

6) Security

  - If a secret (like `DISCORD_BOT_TOKEN`) has been committed before, rotate it immediately.
  - Add `.env.local` to `.gitignore` (already present in repo root); never commit secrets.
