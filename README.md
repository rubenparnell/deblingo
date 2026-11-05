# Deblingo

Team bingo built with Vite, React, Tailwind CSS, and Supabase.

## Run locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. In the Supabase dashboard, open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the tables, starter options, authentication trigger, and row-level security policies.

   If you already ran the original schema, run [`supabase/username-migration.sql`](./supabase/username-migration.sql) instead.

4. Open **Project Settings → API** in Supabase. Copy `.env.example` to `.env.local` and fill in:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   The anon key is safe to use in this frontend. Never put the Supabase service-role key in `.env.local` or frontend code.

5. Create an admin user in **Authentication → Users → Add user**.

6. In **SQL Editor**, assign the user a username and promote that user by replacing the UUID and running:

   ```sql
   update public.profiles
   set username = 'ruben', is_admin = true
   where id = 'YOUR_AUTH_USER_UUID';

   -- Or promote the user without a username:
   insert into public.profiles (id, is_admin)
   values ('YOUR_AUTH_USER_UUID', true)
   on conflict (id) do update set is_admin = true;
   ```

   Usernames must be 3–30 characters and contain only letters, numbers, and underscores. Admins can sign in with either their username or their Supabase email.

7. Start the app:

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
