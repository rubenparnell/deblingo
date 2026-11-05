# Deblingo

Team bingo built with Vite, React, Tailwind CSS, and Supabase.

## Run locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. In the Supabase dashboard, open **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the tables, starter options, authentication trigger, and row-level security policies.

4. Open **Project Settings → API** in Supabase. Copy `.env.example` to `.env.local` and fill in:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   The anon key is safe to use in this frontend. Never put the Supabase service-role key in `.env.local` or frontend code.

5. Create an admin user in **Authentication → Users → Add user**.

6. In **SQL Editor**, promote that user by replacing the UUID and running:

   ```sql
   insert into public.profiles (id, is_admin)
   values ('YOUR_AUTH_USER_UUID', true)
   on conflict (id) do update set is_admin = true;
   ```

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

The board is available to signed-in users. Board options are shared through Supabase, while adding and deleting options is restricted by database row-level security to users whose `profiles.is_admin` value is `true`.
