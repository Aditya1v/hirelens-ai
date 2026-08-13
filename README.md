# HireLens

**HireLens** is an AI-powered resume intelligence platform: upload a resume,
optionally point it at a company + job title (or paste a job description
directly), and get an ATS-style score, a hybrid semantic + keyword job-match
score, a skill-gap breakdown, evidence-grounded AI recommendations, and an
AI bullet-point improver - all behind a real authenticated full-stack app
(React + Node/Express + MongoDB) with a black-and-green glassmorphism UI.

This started as a 2024 client-only React project that called a third-party
platform (Puter.js) directly from the browser for auth, storage, and AI. It
has been rebuilt into a proper full-stack application: every sensitive
operation - authentication, file handling, AI calls, database access - now
happens server-side.

---

## Architecture at a glance

```
client/  React 19 + React Router 7 (SPA mode) + Tailwind, glassmorphism theme
           - talks ONLY to the backend API, never to the AI provider directly
server/  Node.js + Express + MongoDB (Mongoose)
           - JWT (httpOnly cookie) auth, bcrypt password hashing
           - multer file uploads, pdf-parse text extraction
           - Gemini API for structured extraction + feedback + recommendations
           - transformers.js (local, in-process) for text embeddings
           - a small RAG pipeline over a 16-document ATS knowledge base
           - Clearbit + Adzuna free tiers for company/job-posting lookup
```

Nothing here is a microservice or an "agent framework" for its own sake -
every AI technique maps to a specific feature:

| Technique | Where | Why |
|---|---|---|
| LLM structured extraction | `extractionService.js` | Turns free-text resumes into structured data (skills/education/experience/...) that the rest of the app can reason about, instead of re-reading raw text everywhere. |
| Local sentence embeddings | `embeddingService.js` | Powers semantic similarity between resume and job description - catches paraphrased overlap ("built REST APIs" ~ "API development") that keyword matching misses. |
| Keyword/lexical matching | `keywordService.js` | Catches exact ATS-style term matching that embeddings can miss ("Kubernetes" vs "container orchestration"). |
| Hybrid score | `matchService.js` | `0.6 * semantic + 0.4 * keyword` - combines both signals into one job-match score, with a skill-gap breakdown. |
| RAG (retrieval-augmented generation) | `ragService.js` + `knowledge/kb.json` | Recommendations are grounded in retrieved ATS best-practice chunks, not just the model's unconstrained opinion. |
| Hallucination guard | `recommendationService.js` | Every recommendation must cite "evidence" from the actual resume; recommendations whose evidence can't be located in the resume text are filtered out before being saved. |
| Company/job-posting lookup | `companyService.js`, `jobPostingService.js` | Company-name autocomplete (Clearbit, free/keyless) and an optional "auto-fill from a matching posting" step (Adzuna free tier) that prefills - but never replaces - manual job-description entry. |

---

## Quick start (local dev)

### 1. Prerequisites
- Node.js 20+
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)
- A Gemini API key (aistudio.google.com/apikey) - free, no credit card

### 2. Backend
```bash
cd server
cp .env.example .env
# edit .env: set MONGODB_URI and GEMINI_API_KEY at minimum
npm install
npm run dev
```
The API starts on `http://localhost:5000`. On first AI call, `@xenova/transformers`
downloads the `all-MiniLM-L6-v2` embedding model (~90MB) from the Hugging
Face hub and caches it locally - this requires outbound internet access the
first time only.

Two more env vars are optional and each degrade gracefully if left unset:
- `COMPANY_AUTOCOMPLETE_URL` - defaults to Clearbit's free endpoint, no key needed.
- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` - free at developer.adzuna.com. Without
  these, "auto-fill from a job posting" simply tells the user to enter the
  JD manually - it's never a hard failure.

### 3. Frontend
```bash
cd client
cp .env.example .env
# edit .env if your API isn't on localhost:5000
npm install
npm run dev
```
The app starts on `http://localhost:5173`.

### 4. Or run everything with Docker Compose
```bash
cp server/.env.example server/.env   # fill in GEMINI_API_KEY at minimum
docker compose up --build
```
This starts MongoDB, the API (port 5000), and the built client served
statically (port 3000).

---

## Design

Black-and-green glassmorphism throughout: translucent panels
(`backdrop-blur` + low-opacity white borders) over a fixed ambient
background of blurred green radial gradients, defined once in `app.css`
(`.glass-panel`, `main`'s background, `--color-emerald*` tokens) and reused
by every card/nav/form rather than redefined per page. All existing page
layouts, routes, and component structure were preserved - only the visual
language changed. Accessibility additions alongside the redesign: a
skip-to-content link, visible focus rings on every interactive element,
`prefers-reduced-motion` support, ARIA wiring on the accordion
(`aria-expanded`, `role="region"`), and descriptive alt text on resume
thumbnails.

## Performance

- **Parallelized pipeline**: feedback generation, hybrid job-match scoring,
  and RAG context retrieval now run concurrently (`Promise.all`) instead of
  sequentially - removes a full round-trip from every analysis request.
- **Duplicate-request cache**: identical (resume, job title, job
  description) submissions - e.g. an accidental double-click or a retry -
  return the cached result instantly instead of re-running 3+ LLM calls.
  See `requestHash` on the `Analysis` model.
- **Smaller preview images**: the client-rendered PDF thumbnail dropped from
  a 4x-scale PNG to a 2x-scale JPEG (quality 0.85) - roughly a 4x pixel-count
  reduction plus JPEG's much better compression for rendered document pages,
  meaningfully speeding up the upload step. This is a display thumbnail
  only; the backend re-extracts text from the original PDF, so accuracy is
  unaffected.
- **Third-party lookup caching**: company/job-posting lookups are cached
  in-memory (`utils/simpleCache.js`) since the same prefixes get queried
  repeatedly as a user types, and because Adzuna's free tier is tightly
  quota-limited (~1,000 calls/month).
- **Staged, visible progress**: the upload flow surfaces distinct status
  text at each stage (rendering preview -> uploading -> scoring/matching ->
  done) via an `aria-live` region, so the user always knows what's
  happening instead of staring at a single spinner.

## Job-matching workflow

1. Typing a company name shows live autocomplete suggestions (Clearbit,
   free/keyless, debounced + cached).
2. With a company and job title entered, "Auto-fill from a job posting"
   searches Adzuna's free-tier job index and prefills the job-description
   textarea with the closest match found.
3. **Important honesty note**: Adzuna is a job-board aggregator, not a
   scraper of each company's own careers page, and its free tier returns a
   description *excerpt* (plus a link to the original listing), not
   always the complete posting. The textarea stays fully editable either
   way, and the UI explicitly labels the result as something to review.
4. If nothing is found, or `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` aren't
   configured, the app tells the user plainly and falls back to manual
   entry - never a silent failure or a dead end.

---

## Project structure

```
hirelens/
├── client/                  React frontend
│   ├── app/
│   │   ├── routes/          home, auth, signup, upload, resume, wipe
│   │   ├── components/      Navbar, FileUploader, CompanyAutocomplete, ResumeCard,
│   │   │                    Summary, ATS, Details, JobMatch, Recommendations, BulletImprover
│   │   └── lib/              apiClient, authStore, resumeApi, jobsApi, useRequireAuth
│   └── types/index.d.ts     shared frontend types
│
├── server/                  Express API
│   └── src/
│       ├── config/db.js
│       ├── models/          User, Resume, Analysis (Mongoose schemas)
│       ├── controllers/     auth, resume, analysis, jobs
│       ├── routes/
│       ├── middleware/      auth, upload (multer), validate (zod), rateLimit, errorHandler
│       ├── services/        llmService, extractionService, feedbackService,
│       │                    matchService, keywordService, embeddingService,
│       │                    ragService, recommendationService, bulletImprovementService,
│       │                    pdfService, companyService, jobPostingService
│       └── knowledge/kb.json   the RAG knowledge base
│
└── docs/API.md               full API reference
```

---

## Security notes (what changed from the original)

- **No secrets in the client.** The Gemini API key and Adzuna credentials
  never leave the server; the original app called a third-party AI
  platform directly from the browser.
- **Auth cookie is httpOnly.** The JWT is never touchable by client-side JS,
  which is the main defense against token theft via XSS.
- **File access is authorization-checked.** Resume PDFs and preview images
  are streamed through `/api/resumes/:id/file` and `/preview`, which verify
  the requesting user owns that resume before streaming anything.
- **Input validation** on every write endpoint via `zod` schemas.
- **Rate limiting** on auth endpoints (brute-force protection), AI
  endpoints (cost/abuse protection), a stricter limiter on third-party job
  lookups (protects Adzuna's tight free-tier quota), and a general limiter
  across all `/api` routes.
- **`helmet`** for standard security headers, **`compression`** for
  response size, **`express-mongo-sanitize`** to strip NoSQL-injection
  operators from request input as defense-in-depth alongside zod
  validation.
- Dependencies were audited and pinned to patched versions - see the note
  on `pdfjs-dist` below, which is especially relevant since it parses
  user-uploaded PDFs client-side.

## Known trade-offs (worth knowing for an interview walkthrough)

- **Embeddings run locally via `@xenova/transformers`** (no external
  embeddings API/cost) using `all-MiniLM-L6-v2`. Its dependency tree
  (`onnxruntime-web`) has a couple of open, unpatched advisories in `npm
  audit` at the time of writing. Since it's used purely for text (never
  parses untrusted binary uploads through it) the practical exposure is low,
  but a "harden this further" answer would be: call a hosted embeddings API
  instead, or sandbox the embedding step in its own process.
- **PDF text extraction assumes a text-based PDF.** Scanned/image-only PDFs
  are rejected with a clear error rather than silently producing an empty
  analysis - OCR could be added later (e.g. `tesseract.js`) but wasn't
  necessary for the core feature set.
- **The client-side PDF-to-preview-image render (`pdf2img.ts`, using
  `pdfjs-dist`) is intentionally kept on the frontend.** It's a display
  concern, not a sensitive operation, so there was no security reason to
  move it server-side, and doing so would require a system-level PDF
  rasterizer (e.g. poppler) as a new deployment dependency in exchange for
  very little compared to keeping the render client-side.
- **SPA mode instead of SSR.** The original app had
  `react-router.config.ts` set to `ssr: true`, which added server-render
  overhead for zero benefit given every page's data comes from an
  authenticated fetch call anyway. It's now `ssr: false`.
- **Job-posting auto-fill is best-effort, not a scraper.** See the "Job-matching
  workflow" section above - Adzuna's free tier returns excerpts from its own
  aggregated index, not a live scrape of each company's careers page. This
  was a deliberate scope decision to avoid standing up a scraping/anti-bot
  pipeline for a feature whose whole point is to save typing, not to be a
  system of record.
- **The in-memory caches (`simpleCache.js`) are single-process.** Fine for
  one server instance; a multi-instance deployment would want Redis instead
  - documented here rather than added preemptively, since it's not needed
  at this project's scale.

## Bugs fixed from the original codebase

- Upload flow got permanently stuck on "Analyzing..." on any error, since
  early returns never reset the processing flag.
- The "remove file" button in the uploader didn't actually clear the
  displayed file (it cleared parent state but not the dropzone's own
  internal file list).
- `wipe.tsx` used `files.forEach(async ...)`, which doesn't wait for the
  deletions - `Promise.all` is used instead now.
- The post-login redirect built the URL with a missing slash, and `/auth`
  visited directly (no `next` param) could call `navigate(undefined)`.
  Both are now handled by one shared `useRequireAuth` hook.
- A Tailwind class typo (`!pt=0` instead of `!pt-0`) silently did nothing.
- `pdfjs-dist` and the whole `react-router` package family were pinned to
  versions with open security advisories - both bumped to patched
  releases, with the matching pdf.js worker file synced in `client/public/`.
- Gemini's `gemini-2.5-flash` model ID was deprecated for new API keys
  after this project was first built - the app now defaults to
  `gemini-flash-latest`, an alias Google keeps pointed at its current
  default Flash model, so it won't silently break on the next deprecation.

---

## Deployment notes

- **Server**: any Node host (Render, Railway, Fly.io, a VM). Set all vars
  from `server/.env.example`, point `MONGODB_URI` at Atlas or a managed
  Mongo instance, and make sure the `uploads/` directory is on persistent
  storage (or swap `multer.diskStorage` for an object-storage backend like
  S3 for a multi-instance deployment).
- **Client**: `npm run build` produces a static `build/client/` directory
  (SPA mode) - deployable to any static host (Vercel, Netlify, S3+CloudFront,
  or the `serve`-based Docker image in this repo). Set `VITE_API_URL` to
  the deployed backend URL at build time.
- **CORS**: set `CLIENT_ORIGIN` on the server to the deployed frontend's
  exact origin so the auth cookie can be sent cross-origin correctly.
- **First AI request** after a fresh deploy will be slower than normal
  while the embedding model downloads and caches - consider a warm-up
  request in your deploy pipeline if latency on the first user request
  matters.
