# Campus ERP

App for students, teachers and admins: marks, attendance, events, assignments, plus a small campus social platform.

## Run it

```
npm ci
npm run dev
```

Use Node.js 20 LTS. To open the dev server from another computer on the same network, run `npm run dev:network` and visit `http://YOUR-PC-IP:5173` from that computer. Allow port 5173 through the host firewall if prompted.

To make a production frontend bundle, run `npm run build`; the static site is written to `dist/`. Copy the project source and `package-lock.json` to another PC and run `npm ci`, or copy `dist/` to a static web host. Do not copy `node_modules/` or commit `.env.local`.

For the demo, sign in with a role and ID. Demo data is saved in the browser (localStorage), so it works with no setup. "Reset sample data" on the login screen restores it. When Supabase is configured and a Supabase-authenticated user signs in, Library reads and writes use Supabase instead.

## Features

- **Campus Connect**: create clubs and channels, join or leave, post text and photos, like and comment. Teachers can see every member list and the People tab shows which groups each student is in.
- **Notices**: daily college notices (Today and Earlier). Staff post official notices, students can share student notices.
- **Alerts (bell)**: attendance warnings, certificate verified, graded work, new notices, counselling replies.
- **Search bar**: students (staff only), events, assignments, groups, notices, staff.
- **Events**: upload a certificate, AI reads it and picks the event, teacher verifies, participant count goes up.
- **Marks, Attendance (75% warning), Assignments with grading.**
- **Counselling** with an anonymous option, **Documents**, **Staff contacts**, **People** (staff only).
- **Library**: book requests and waitlists, loans and due dates, overdue reminders, plus operator-managed seat layouts.
- **Sports**: equipment issues, facility bookings with overlap checks, performance records, and coordinator approvals.
- **Admin reports**: overdue loans, booking/OD queues, attendance risks, and a recent activity log. Admins can add and edit student and staff accounts.
- **AI Assistant**: answers from the logged-in user's own data. Uses built-in answers until the AI key is set.

## AI features (need a key)

`api/chat.js` and `api/certificate.js` are Vercel serverless functions. They do not run with `npm run dev`; the app then falls back to simple built-in answers and file-name matching.

To turn them on: in Vercel, open Settings, Environment Variables, add `AI_API_KEY` (no `VITE_` prefix), then redeploy. Never put the key in the code or in a `.env` file you commit.

## Going from demo to real

- `db/schema.sql` defines Supabase profiles, role policies, library and sports workflows, bookings, notifications, audit events, and OD attendance handling.
- `api/auth.js` provides role-and-ID/password login, student signup, and admin-only staff account creation. Vercel serverless functions are not served by `npm run dev`; use Vercel's local function host to test configured authentication.
- `.env.example` shows the public Supabase URL/anon key and server-only service-role settings. Set them in ignored local environment files or Vercel Environment Variables, then run `db/schema.sql` in the Supabase SQL editor.
- Library reads and writes use Supabase for Supabase-authenticated sessions; demo sessions still use `localStorage`. Sports, attendance, OD, social, and other operational data still use browser storage and need migration before they are shared across devices.
- Never put a Supabase service-role key in a `VITE_` variable or expose it to the browser.
- Anonymous counselling is hidden in the screens only. With a real database, also hide the student id from staff using a database view.
