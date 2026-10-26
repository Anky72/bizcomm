# Team Quiz — Next.js + Supabase + Vercel

Timed team quiz with 10 random questions from a question bank, total-section timer, per-question timer, server-side grading, admin upload, results dashboard and deletion.

## Important security reality
No web app can prevent a participant from taking screenshots, photographing the screen, or sharing questions. This implementation does **not** send answer keys to the browser. The server grades submissions, the service-role key is server-only, and the database has RLS enabled with no public policies. Use a separate, unguessable admin password and secret. Add rate limiting/WAF (for example Vercel Firewall or Upstash) before a large public event.

## 1. Create Supabase database
1. Create a project at https://supabase.com.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Project Settings → API, copy the Project URL and **service_role** key. Never put the service role key in a `NEXT_PUBLIC_` variable or share it.

## 2. Configure locally
```bash
npm install
cp .env.example .env.local
```
Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` (at least 16 characters), and `ADMIN_SESSION_SECRET` (at least 32 random characters). Set `QUIZ_TOTAL_SECONDS` and `QUESTION_SECONDS` as desired. Example: 600 seconds total and 45 seconds/question.

```bash
npm run dev
```
Open `http://localhost:3000`. Admin console: `http://localhost:3000/admin`.

## 3. Upload the question bank
From `/admin`, log in and upload a UTF-8 JSON file. Keep the original file private. Format:

```json
[
  {
    "prompt": "What does ROI stand for?",
    "options": ["Return on Investment", "Rate of Inflation", "Risk of Interest", "Revenue on Income"],
    "answer_index": 0,
    "explanation": "ROI measures return relative to investment."
  }
]
```

`answer_index` is zero-based: `0` means the first option. The upload accepts 10–200 questions. Each attempt randomly samples 10 questions and randomizes the order of which questions are selected. Option order remains as uploaded. Do not change the answer key while an event is running. If you need to update it, upload a new bank; existing submission scores are retained.

## 4. Deploy to Vercel
1. Push this folder to a **private** GitHub repository.
2. In Vercel, import that repository.
3. Add the same environment variables in Project → Settings → Environment Variables. Do not commit `.env.local`.
4. Deploy. Test a sample team and verify the dashboard and timer before sharing the public URL.

This assistant cannot deploy to your Vercel account without access to your account/project. The project is ready for you to import and deploy.

## What is stored
- Team ID (unique, case-sensitive), leader, optional member names, phone, member count.
- Selected question order, start/submit times, score and total quiz time.
- Each selected answer and its recorded elapsed seconds.

## Operational caveats to review before a live event
- A team can refresh or switch devices and still leave an `in_progress` attempt. For a real event, have the organizer delete that attempt before allowing a retry.
- Browsers are untrusted: server timestamps are authoritative for the total time. Per-question elapsed values originate in the browser, so they are useful operational data but not tamper-proof forensic timing. For stricter timing, add a server-issued question token and server-side start timestamp for every question.
- For high-stakes events, add rate limiting, audit logging, backups, a retention policy, phone-number privacy notice, and an admin MFA/identity provider. Do not collect more personal data than you need.
- Admin question replacement deactivates old questions and inserts a new active bank. Upload only after verifying the JSON and answer indices.
- Team ID uniqueness is enforced by a database unique constraint; normalize IDs consistently (e.g. uppercase) if case-insensitive uniqueness is desired.
