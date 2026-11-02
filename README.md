# AI Audience Profiler

Live audience assessment for AI seminars. Participants answer a 13-question
mobile questionnaire; the presenter watches responses, charts and AI-generated
insights update in real time, and can switch to a projector-ready presentation
view.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase
(Postgres, Auth, Realtime) · Recharts · Lucide · Anthropic API (optional).

## Routes

| Route | Who | What |
| --- | --- | --- |
| `/survey` | Public | Mobile-first questionnaire. One submission per device (session id in `localStorage`, enforced server-side). |
| `/admin` | Admin | Overview metrics, 8 charts, open-ended answers grouped by theme, **Analyze Audience with AI**. |
| `/admin/responses` | Admin | Every submission; search, filter by role / industry / proficiency; click a row for the full answer sheet; CSV export. |
| `/admin/qr` | Admin | QR code for the survey link: copy, download PNG, full-screen. |
| `/present` | Admin | Projector mode: large type, live participant count, one chart at a time. `← →` panels, `Q` QR overlay, `D` hide demo data. |
| `/admin/login` | — | Email + password sign-in (Supabase Auth). |

Questions and answer options live in one place: `src/lib/questions.ts`
(the migration seeds the same list into the `questions` table).

## 1. Supabase setup

1. Create a project (or use the one already provisioned).
2. Run `supabase/migrations/0001_init.sql` in the SQL editor
   (or `supabase db push` with the CLI). It creates:
   - `questions`, `survey_sessions`, `responses`, `admin_users`
   - indexes, constraints and timestamps
   - Row Level Security: anonymous users can **insert** sessions/responses,
     never read them; only users listed in `admin_users` can read/delete.
   - Realtime publication on `survey_sessions`.
3. Create the presenter account: **Authentication → Users → Add user**
   (email + password, auto-confirm). Then grant admin rights:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'presenter@example.com';
   ```

4. Copy the keys from **Project Settings → API Keys**:
   - Publishable (or legacy anon) key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (server only)

## 2. Environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-side only; used by /api/submit
NEXT_PUBLIC_SITE_URL=             # public URL, used for the QR code
ANTHROPIC_API_KEY=                # optional; enables AI insights
ANTHROPIC_MODEL=                  # optional; defaults to claude-sonnet-5-5
MCP_SECRET=                       # optional; enables the MCP server (see below)
```

The service-role key is only read in `src/lib/supabase/admin.ts`, which is
marked `server-only`; it never reaches the browser.

## 3. Run locally

```bash
npm install
npm run dev
```

- Survey: http://localhost:3000/survey
- Dashboard: http://localhost:3000/admin

### Demo data (development only)

`supabase/seed.sql` inserts 12 participants flagged `is_demo = true`.
They are labeled **demo** everywhere, excluded from AI analysis by default,
and the overview shows a **Remove demo data** button. Before the seminar,
click that button or run:

```sql
delete from public.survey_sessions where is_demo;
```

## 4. Deploy on Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables above (set `NEXT_PUBLIC_SITE_URL` to the
   Vercel domain so the QR code points at production).
3. Deploy. No other configuration is needed; `/api/*` routes run on Node.

In Supabase, add the Vercel domain to **Authentication → URL Configuration →
Site URL** so sign-in redirects work.

## Connect ChatGPT / Claude to the data (MCP)

The app hosts a remote MCP server at

```
https://<your-domain>/api/mcp/<MCP_SECRET>
```

Set `MCP_SECRET` to a long random string (`openssl rand -hex 24`) and redeploy.
Anyone with the URL can read all responses (including names), so treat it like a
password and rotate it after the event.

Tools exposed: `get_audience_overview`, `list_participants`, `get_participant`,
`get_open_ended_answers`, `get_analysis_brief`, `get_questions`. All read-only.

| Client | How to add |
| --- | --- |
| Claude.ai | Settings → Connectors → Add custom connector → paste the URL, no OAuth. |
| Claude Desktop / Claude Code | Same URL as a remote MCP server; `Authorization: Bearer <MCP_SECRET>` also works. |
| ChatGPT | Settings → Connectors → Create → MCP server URL, authentication "None". |
| Cursor / others | Add as Streamable HTTP server with the URL. |

Then ask things like *"Which demos should I prepare for this audience?"* or
*"List the beginners in e-commerce and what they want AI to handle."*

## How the pieces fit

- **Submission** — the survey posts to `/api/submit`, which validates every
  answer against `questions.ts`, upserts responses with the service-role
  client, and returns `409` if the device already completed the survey.
- **Live updates** — admin pages call `/api/admin/data` (runs as the signed-in
  user, so RLS applies) and subscribe to Supabase Realtime on
  `survey_sessions`; any insert/update triggers a debounced refetch, with a
  30-second poll as a fallback.
- **Stats** — all counts and averages are computed in `src/lib/stats.ts`
  from real rows. Open-ended answers are grouped by a transparent keyword
  theme map in the same file.
- **AI insights** — `/api/admin/insights` sends the computed statistics plus
  verbatim open-ended answers to the Anthropic API with a JSON schema. The
  UI shows the **observed** numbers (computed here) separately from the
  **interpretation** (generated). If `ANTHROPIC_API_KEY` is unset the button
  is disabled and everything else works.
- **Auth** — `src/proxy.ts` refreshes the Supabase session and redirects
  unauthenticated requests on `/admin`, `/present` and `/api/admin/*`;
  `getAdminUser()` additionally checks `admin_users`.
