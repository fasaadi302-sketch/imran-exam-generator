# Setup Guide — PDF export + Supabase logging + Admin dashboard

This covers the three new things added to your app:

1. **PDF export** — a red "PDF (.pdf)" button next to the Word button. Works immediately, no setup.
2. **Supabase logging** — saves page visits + generated papers online.
3. **Admin dashboard** — a private page that shows all that data.

The PDF button needs **nothing** — it already works. The logging and admin
dashboard need a free Supabase project (steps below). Until you set that up,
the app runs exactly as before; logging is simply skipped.

---

## Part A — Run the app

```bash
npm install      # only needed the first time / after updates
npm run dev      # opens http://localhost:5173
```

Build for hosting later with `npm run build` (output goes to `dist/`).

---

## Part B — Set up Supabase (one time, ~5 minutes)

### 1. Create the project
- Go to **https://supabase.com** and sign up (free, use Google/GitHub/email).
- Click **New Project**. Give it a name (e.g. `exam-generator`), set a database
  password (save it somewhere), pick the closest region, click **Create**.
- Wait ~2 minutes while it sets up.

### 2. Create the tables
- In the left sidebar open **SQL Editor** → **New query**.
- Open the file **`supabase/schema.sql`** from this project, copy *everything*,
  paste it into the editor, and click **Run**. You should see "Success".

### 3. Copy your two keys into the app
- In the sidebar open **Settings (gear)** → **API**.
- Find these two values:
  - **Project URL** — looks like `https://abcd1234.supabase.co`
  - **anon public** key — a long string under "Project API keys"
- Open **`src/lib/supabase.js`** and paste them between the quotes:

```js
const SUPABASE_URL      = 'https://abcd1234.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOi....your-long-key....'
```

- Save the file. If `npm run dev` is running, it reloads automatically.

That's it. From now on every page load is logged, and every time someone
clicks Word or PDF the paper is saved.

---

## Part C — The admin dashboard

- Open your site with **`/#/admin`** at the end of the URL.
  - Local: **http://localhost:5173/#/admin**
  - Hosted: **https://your-site.com/#/admin**
- Enter the password: **`fasaadi420`**

You'll see:
- **Stat cards** — total visits, visits today, papers generated, papers today.
- **Visits over time** — a bar chart of the last 30 days.
- **Papers tab** — every generated paper with search + format filter. Click
  **View** to read the full questions and options.
- **Visits tab** — each visit with browser, platform, screen, timezone.

### Change the password
Open **`src/components/AdminDashboard.jsx`**, near the top:

```js
const ADMIN_PASSWORD = 'fasaadi420'   // change this
```

---

## Notes

- **Security:** the admin password is checked in the browser, and the dashboard
  reads data with the public anon key. This is a light gate suitable for a small
  internal tool — it is not bank-grade security. Don't store anything sensitive.
  (See the comment in `supabase/schema.sql` for how to harden it later.)
- **The `/admin` path:** the guaranteed-to-work URL is `/#/admin`. The plain
  `/admin` path also works **if** your host serves `index.html` for unknown
  routes (Netlify/Vercel do with a small rewrite rule). The `#` version needs no
  configuration anywhere.
- **Nothing breaks without Supabase:** if the keys are blank, the app still
  generates Word and PDF papers normally — it just doesn't log.

---

## Part D — AI-generated MCQ drafts (z.ai GLM-4.7-Flash)

A new "✨ Generate from Topic (AI Draft)" card lets you type a topic, or
upload a PDF/image, and get draft MCQs written by AI — landing straight in
your MCQ paste box for review and editing before they're ever used in a
real paper. This needs Supabase (Part B above) plus one more setup step.

### Why this needs a separate "Edge Function"
The AI call uses a z.ai API key, which must **never** appear in your
frontend code — anyone could open browser dev tools and steal it. Instead,
the key lives as a server-side secret on Supabase, and your app talks to a
small serverless function that holds the key and calls z.ai on your behalf.

### 1. Get a free z.ai API key
- Go to **https://z.ai**, sign up, and generate an API key for
  **GLM-4.7-Flash** (their free tier model).
- Copy the key somewhere safe — you'll paste it into Supabase next, not into
  this project's code.

### 2. Install the Supabase CLI (one time)
```bash
npm install -g supabase
supabase login
```

### 3. Link this project to your Supabase project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
Find `YOUR_PROJECT_REF` in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 4. Add your z.ai key as a secret
```bash
supabase secrets set ZAI_API_KEY=your_real_key_here
```
This key is stored securely by Supabase — it never goes into your code,
your git repo, or this chat.

### 5. Deploy the Edge Function
```bash
supabase functions deploy generate-mcqs
```

That's it. Reload the app — the "Generate from Topic" card will now call
the real AI instead of showing the "not set up yet" notice.

### Using it
- **Type a Topic** tab — type something like `Postpartum Hemorrhage`, choose
  how many questions, click **Generate Draft MCQs**.
- **Upload PDF / Image** tab — choose a file. Typed/printed PDFs read
  perfectly; scanned PDFs and photos go through OCR (tesseract.js) which is
  slower and less reliable, especially for handwriting.
- The draft always appears in an editable box first — **nothing is added to
  your paper until you click "Use These Questions."**
- AI-written questions can contain mistakes, especially for clinical/medical
  content — always review them the same way you'd review a colleague's draft
  before putting them on a real exam.

### If something goes wrong
- **"AI generation isn't set up yet"** → Supabase isn't configured (Part B).
- **"Server is not configured with a z.ai API key yet"** → you skipped step 4
  above, or the function needs redeploying after setting the secret.
- **z.ai errors / rate limits** → the free tier has usage limits; if you hit
  them, wait a bit and try again, or check your z.ai dashboard.
- **"No text found in this PDF"** → it's likely a scanned PDF with no real
  text layer. Try taking a screenshot of the page and uploading that image
  instead, so OCR can read it.

