# Deblingo

Team bingo built with Vite, React, Tailwind CSS, and Supabase.

## Run locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. In the Supabase dashboard, open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the tables, starter options, authentication trigger, and row-level security policies.

   If you already ran the original schema, run [`supabase/username-migration.sql`](./supabase/username-migration.sql), [`supabase/remove-categories.sql`](./supabase/remove-categories.sql), [`supabase/lectures-migration.sql`](./supabase/lectures-migration.sql), [`supabase/history-migration.sql`](./supabase/history-migration.sql), [`supabase/suggestions-migration.sql`](./supabase/suggestions-migration.sql), [`supabase/difficulty-migration.sql`](./supabase/difficulty-migration.sql), [`supabase/lines-completed-migration.sql`](./supabase/lines-completed-migration.sql), [`supabase/history-lines-trigger-migration.sql`](./supabase/history-lines-trigger-migration.sql), [`supabase/leaderboard-boards-migration.sql`](./supabase/leaderboard-boards-migration.sql), and [`supabase/leaderboard-admin-delete-migration.sql`](./supabase/leaderboard-admin-delete-migration.sql) instead.

4. To disable email confirmation for now, open **Authentication → Providers → Email** in Supabase, turn off **Confirm email**, and save. New accounts will be signed in immediately after signup.

5. Open **Project Settings → API** in Supabase. Copy `.env.example` to `.env.local` and fill in:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   The anon key is safe to use in this frontend. Never put the Supabase service-role key in `.env.local` or frontend code.

6. Create an account from the app’s **Create account** tab, or create one in **Authentication → Users**. The app stores the chosen username on the new profile.

7. In **SQL Editor**, promote the user by replacing the UUID and running:

   ```sql
   update public.profiles
   set is_admin = true
   where id = 'YOUR_AUTH_USER_UUID';

   -- Or assign a username manually to an existing account:
   update public.profiles
   set username = 'ruben', is_admin = true
   where id = 'YOUR_AUTH_USER_UUID';

   -- If the profile row does not exist yet:
   insert into public.profiles (id, is_admin)
   values ('YOUR_AUTH_USER_UUID', true)
   on conflict (id) do update set is_admin = true;
   ```

   Usernames must be 3–30 characters and contain only letters, numbers, and underscores. Admins can sign in with either their username or their Supabase email.

8. Start the app:

   ```powershell
   npm run dev
   ```

   Open the local URL printed by Vite, normally `http://localhost:5173`.

## Other commands

```powershell
npm run build
npm run lint
npm run preview
```

The board is available to everyone without signing in. Visitors can randomize and mark their own board locally. Supabase login is only requested when someone opens **Manage options**. Board options are shared through Supabase, while adding and deleting options is restricted by database row-level security to users whose `profiles.is_admin` value is `true`.

Press Enter in the admin prompt field to add an option. Use Shift+Enter when you need a line break.

Admins can upload an `.ics` calendar file in **Manage options**. The app parses events whose titles contain both `discrete` and `lecture` (case-insensitive), stores them in Supabase, and displays a live countdown to the next lecture. Calendar times are used in two ways. The countdown considers the lecture to start at `DTSTART + 5 minutes` and end at `DTEND - 5 minutes`. The board is playable from `DTSTART - 5 minutes` through `DTEND + 5 minutes`, so the schedule does not need to be aligned to the hour.

Each lecture gets one stable randomized board, generated and saved when its playable window opens. The board and marks reset when the active lecture changes. Outside a lecture's playable window, the board is hidden and the next lecture countdown is shown. Admin mode bypasses the lecture window; outside a lecture it uses a separate admin board, while during a lecture it displays that lecture's board. Admin-mode marks are never saved to history.

The **History** view stores each logged-in user's lecture board, marked squares, score, and completed lines in Supabase while the lecture is playable. A completed line is a full row, column, or diagonal. The score and line count are updated after each mark or unmark and are final once the playable window closes. Guests get the same history experience in their current browser using local storage.

Signed-in non-admin users can open **Suggest options** to submit board ideas. Admins review pending suggestions in **Manage options** and can accept them into the board or reject them.

Admins can rank each option as **Free**, **Common**, or **Rare**, and set the difficulty mix for new boards. The default mix is 1 Free, 15 Common, and 9 Rare. Difficulty labels are not shown on the player board.

Admins can remove a player from a specific lecture's leaderboard. This deletes only that player's history record for the selected lecture.
