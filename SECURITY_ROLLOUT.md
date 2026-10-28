# Security fixes — rollout plan

This changes how the client app, its server and its database protect client
data. It is rolled out in small steps so the live app keeps working the whole
time, and every step can be undone.

Two pull requests go together:

- **reviewsend-app** (this repo): the app changes plus three database migrations in `supabase/migrations/`
- **reviewsend-server**: login checks on every endpoint, Google keys handled server-side, the employee login move

## What was wrong

| Problem | Fix |
| --- | --- |
| Every database rule was "allow anyone", and the database key is public in the app, so anyone could read or change all client data, customer phone numbers, chat, and Google keys | Real rules: owners see everything; marketing companies their own clients; account managers only assigned clients; clients only their business; employees only their business's sending and photos; visitors nothing |
| Server endpoints (texting, creating and deleting logins, invite emails, Google) accepted requests from anyone | Every endpoint needs a signed-in ReviewSend user with access to that business; texting is rate-limited per person |
| Client employee passwords stored in plain text and checked by the server | Employees get real Supabase logins with the **same password** (they notice nothing); plain-text passwords are deleted |
| Google keys stored on the client record and handled in the browser | Keys move to a private table only the server can read |
| The AI (Anthropic) key was built into the public app | AI captions go through the server; the key lives only on Railway |
| `tasks` table and the private `client-files` storage folder were never created (staff task list and Files section could not work) | Both created |

## Tests already run

- `supabase/tests/run.sh`: rebuilds the current database layout in a throwaway Postgres, applies all three steps, and checks 95 access rules (each kind of login against each table and the file storage). All pass.
- `reviewsend-server`: `npm test` runs 27 checks against a fake Supabase and fake Twilio. All pass.
- The app builds (`npm run build`).

## Rollout order

Do these in order. Each step says how to undo it.

### 0. Before you start
- Supabase → **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up". Every ReviewSend login is created by staff or the server, so nobody should be able to make their own account. *(Undo: turn it back on.)*
- Test everything below on the staging copy first.

### 1. Database step 1 (additions only)
Supabase → SQL Editor → run `supabase/migrations/20261027_01_security_foundation.sql`.
Nothing existing changes; the current app keeps working. *(Undo: not needed; it only adds things.)*

### 2. Server with switch-over mode
On Railway, add these variables to the server, then deploy the `security-hardening` branch:
- `LEGACY_MODE` = `true` (keeps the current app working during the switch)
- `ANTHROPIC_API_KEY` = the AI key (moved off the app)
*(Undo: redeploy the previous version in Railway → Deployments.)*

### 3. Move employees to real logins
From the server folder with the production `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`:
```
node scripts/migrate-employees.js          # dry run: lists what it will do
node scripts/migrate-employees.js --apply  # creates the logins, same passwords
```
Anyone listed under "Need a password reset" gets a reset email from their business owner or staff.

### 4. App
Merge the app pull request; Vercel deploys it. Everyone now signs in through Supabase; employees use the same email and password as before.
*(Undo: Vercel → Deployments → promote the previous deployment.)*

### 5. Database step 2 (lock down)
After the new app is live and a staff login, a client login and an employee login have been checked, run
`supabase/migrations/20261027_02_lock_down_rules.sql`.
*(Undo: re-create the old "allow anyone" rules — not recommended; fix the specific rule instead.)*

### 6. Turn off switch-over mode
Railway → remove `LEGACY_MODE` (or set it to `false`) → redeploy.

### 7. After a few quiet days: database step 3
Run `supabase/migrations/20261027_03_cleanup.sql`. It refuses to run if any employee still lacks a real login. It permanently deletes the plain-text passwords and old Google key columns.

### 8. Replace the exposed keys
- **Anthropic:** create a new API key, put it in Railway's `ANTHROPIC_API_KEY`, delete the old key in the Anthropic console, and remove `VITE_ANTHROPIC_API_KEY` from Vercel.
- The Supabase public ("anon") key does not need replacing; it is meant to be public once the rules are in place.

## Staging settings

For a staging copy, the app reads these Vercel variables (all optional; production uses its current values):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SERVER_URL`, `VITE_APP_URL`.

The server reads `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `APP_URL`, `EXTRA_ALLOWED_ORIGINS`, `EXTRA_GOOGLE_REDIRECT_URIS`, `ADMIN_EMAILS`, `LEGACY_MODE`, `ANTHROPIC_API_KEY`, plus the existing Twilio, Google, Resend and Sentry variables.
