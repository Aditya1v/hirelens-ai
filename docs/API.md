# HireLens API Reference

Base URL (local dev): `http://localhost:5000`

All endpoints return JSON in the shape:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Readable error message" }
```

Authentication is a JWT stored in an **httpOnly cookie** (`hirelens_token` by
default). There is no `Authorization: Bearer` header - the browser sends the
cookie automatically once logged in, as long as requests are made with
`credentials: "include"`.

---

## Auth

### `POST /api/auth/signup`
Body: `{ "name": string, "email": string, "password": string (min 8 chars) }`
Creates a user, sets the auth cookie, returns the user.
Rate limited: 20 requests / 15 min per IP.

### `POST /api/auth/login`
Body: `{ "email": string, "password": string }`
Verifies credentials, sets the auth cookie, returns the user.
Rate limited: 20 requests / 15 min per IP.

### `POST /api/auth/logout`
Clears the auth cookie.

### `GET /api/auth/me`
**Protected.** Returns the current user from the session cookie.

---

## Resumes

All routes below are protected (require the auth cookie).

### `POST /api/resumes`
`multipart/form-data` with fields:
- `resume` (required) - the PDF file
- `preview` (optional) - a client-rendered PNG of the first page

Server-side pipeline on upload:
1. Extract raw text from the PDF (`pdf-parse`).
2. Run LLM structured extraction (skills, education, experience, projects,
   certifications, technologies).
3. Compute a local sentence embedding of the resume text.
4. Persist the `Resume` document.

Returns `{ resume: ResumeRecord }` (metadata only - no raw text or embedding).

### `GET /api/resumes`
Lists the current user's uploaded resumes (metadata only).

### `GET /api/resumes/:id/file`
Streams the original PDF. Owner-only.

### `GET /api/resumes/:id/preview`
Streams the preview PNG, if one was uploaded. Owner-only.

### `DELETE /api/resumes/:id`
Deletes the resume, its files on disk, and any analyses built on it.

---

## Analyses

All routes below are protected.

### `POST /api/analyses`
Body: `{ "resumeId": string, "companyName"?: string, "jobTitle"?: string, "jobDescription"?: string }`

Runs the full AI pipeline for one analysis:
1. **Feedback generation** - category-scored ATS/tone/content/structure/skills
   feedback (LLM call, grounded in the resume text).
2. **Hybrid job-match scoring** - `0.6 * semanticScore + 0.4 * keywordScore`
   (only computed if a `jobDescription` is provided).
3. **Skill-gap analysis** - matched / missing / high-priority-missing skills.
4. **RAG-grounded recommendations** - retrieves relevant chunks from the
   built-in ATS knowledge base, generates suggestions, then filters out any
   recommendation whose "evidence" can't be located in the actual resume
   text (hallucination guard).

Rate limited: 30 requests / 10 min per IP (this is the expensive endpoint -
one call does 3+ LLM calls plus embedding compute).

Returns `{ analysis }` - see the shape below.

### `GET /api/analyses`
Returns the current user's analysis history (newest first) - this is what
powers the home page.

### `GET /api/analyses/:id`
Returns a single analysis by id.

### `DELETE /api/analyses/:id`

### `POST /api/analyses/improve-bullet`
Body: `{ "bullet": string, "resumeId": string, "jobTitle"?: string }`
Returns `{ improved: string[], rationale: string }` - 2-3 grounded rewrites
of the given bullet point.

---

## Jobs (company autocomplete & job-posting lookup)

All routes below are protected and rate limited (20 requests/min per IP -
these hit tightly-quota-limited free third-party tiers).

### `GET /api/jobs/companies?q=goo`
Returns `{ suggestions: { name: string, domain: string|null }[] }` (up to 8)
via Clearbit's free autocomplete endpoint. Returns `{ suggestions: [] }` on
any upstream failure - never an error, since this is a UX nicety.

### `GET /api/jobs/find-posting?company=Google&title=Software+Engineer`
Searches Adzuna's free-tier job index for a matching posting. Returns:
```ts
{
  posting: {
    title: string;
    company: string;
    description: string;   // an excerpt, not necessarily the full posting
    sourceUrl: string | null;
    isExcerpt: true;
  } | null;
  configured: boolean;  // false if ADZUNA_APP_ID/ADZUNA_APP_KEY aren't set
}
```
`posting: null` is a normal, expected response (not an error) whenever
nothing matched or the lookup isn't configured - the frontend always falls
back to manual entry in that case.

---

## Analysis object shape

```ts
{
  id: string;
  resumeId: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  imagePath: string;   // GET this path (relative, e.g. /api/resumes/:id/preview) with credentials to load the thumbnail
  resumePath: string;  // GET this path with credentials to load the PDF
  feedback: {
    overallScore: number;
    ATS: { score: number; tips: { type: "good"|"improve"; tip: string }[] };
    toneAndStyle: { score: number; tips: [...] };
    content: { score: number; tips: [...] };
    structure: { score: number; tips: [...] };
    skills: { score: number; tips: [...] };
  };
  jobMatchScore: number | null;
  semanticScore: number | null;
  keywordScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  priorityMissingSkills: string[];
  recommendations: { area: string; suggestion: string; evidence: string; source: "resume"|"knowledge_base"|"job_description" }[];
  status: "processing" | "completed" | "failed";
  errorMessage: string | null;
  createdAt: string;
}
```

---

## Error responses

| Status | Meaning |
|---|---|
| 400 | Validation error (bad request body, unreadable PDF) |
| 401 | Not authenticated / invalid credentials |
| 403 | Authenticated but not allowed to access this resource |
| 404 | Resource not found |
| 409 | Conflict (e.g. email already registered) |
| 429 | Rate limited |
| 502 | Upstream AI service failure |
| 503 | AI features not configured (missing `GEMINI_API_KEY`) |
