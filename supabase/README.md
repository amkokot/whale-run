# Supabase keepalive

The GitHub Actions workflow in `.github/workflows/supabase-keepalive.yml` makes
three small, read-only database requests each day. One workflow covers the
whole Supabase project, including future games that use it.

## One-time setup

1. Run `migrations/20261010_add_keepalive_rpc.sql` in the Supabase SQL Editor.
2. In the GitHub repository, add the Actions variable `SUPABASE_URL`.
3. Add the Actions secret `SUPABASE_PUBLISHABLE_KEY` using the project's
   publishable (or legacy anon) key. Never use the `service_role` key.
4. Open **Actions > Keep Supabase active** and run it once to verify the setup.

The function returns only the current database time. It cannot read or change
game data.

GitHub may disable scheduled workflows in a public repository after 60 days
without repository activity. If that happens, re-enable the workflow from the
Actions page.
