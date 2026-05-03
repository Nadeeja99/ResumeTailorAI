# ResumeTailorAI

> **AI-Powered Resume Optimization Platform** — Analyze, optimize, and prepare for your next job with Google Gemini AI.

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-2.0_Flash-4285F4.svg)](https://aistudio.google.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Freemium-635BFF.svg)](https://stripe.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_mode-003B57.svg)](https://sqlite.org/)

---

## Features

### Resume Analysis
- **AI Match Score** — Percentage-based compatibility between your resume and the job description
- **Missing Keywords** — Specific terms from the JD absent from your resume
- **Strengths Detection** — Highlights where you already align well
- **Tone Analysis** — Scores professionalism and clarity of writing
- **ATS Optimization** — Formatting and keyword suggestions to pass Applicant Tracking Systems
- **Local Fallback** — Heuristic analysis runs instantly when the AI service is unreachable

### Resume Generation
- **Optimized Resume** — AI rewrites your resume incorporating all suggestions (Server-Sent Events streaming)
- **Diff View** — Word-level diff between original and improved resume
- **PDF Download** — Export the optimized resume as PDF
- **Word Download** — Export as .docx

### LinkedIn PDF Import
- Upload your LinkedIn profile PDF export directly
- AI cleans up LinkedIn's multi-column layout and restructures it as a proper resume
- Two-stage progress indicator: extracting → AI structuring

### Semantic Embeddings Analysis
- Uses `text-embedding-004` to score each resume section against the job description semantically — beyond keyword matching
- Per-section heatmap showing alignment scores for Summary, Experience, Skills, Education, etc.
- JD requirement coverage cards (covered ✓ / missing ✗)
- Top semantic gaps to address

### Interview Prep Generator
- Generates 8 targeted interview questions tailored to the specific role and candidate background
- Mix of Behavioral, Technical, Situational, Culture Fit, and Leadership questions
- Each question includes: ideal answer (tied to your actual experience), 3 coaching tips, difficulty rating, and why the interviewer is asking it
- Staggered card reveal animation; expandable cards with category filter

### Cover Letter Generator
- AI writes a 3–4 paragraph cover letter tailored to the job and resume (SSE streaming)
- PDF and Word export
- Copy to clipboard

### Job Comparison
- Compare your resume against up to 5 job descriptions simultaneously
- Each role scored for match %, missing keywords, strengths, and top suggestion
- Results sorted by best fit

### Freemium / Stripe Billing
- **Free plan**: 3 AI analyses per month (tracked anonymously via UUID in localStorage)
- **Pro plan**: Unlimited analyses + semantic embeddings
- Stripe Checkout and billing portal integration
- Usage banner with remaining-analyses progress bar
- Pricing modal with plan comparison

---

## Architecture

Monorepo with a strict frontend/backend split:

```
ResumeTailorAI/
├── package.json               # Root — runs both services via concurrently
├── frontend/                  # React 18 + Vite + TypeScript  (port 8080)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ResumeInput.tsx          # Paste / Upload / LinkedIn import tabs
│   │   │   ├── JobDescriptionInput.tsx
│   │   │   ├── AnalysisResults.tsx
│   │   │   ├── ResumePreview.tsx        # Streaming preview + PDF/Word export
│   │   │   ├── ResumeDiff.tsx           # Word-level diff view
│   │   │   ├── CoverLetterPanel.tsx     # Streaming cover letter
│   │   │   ├── JobComparisonPanel.tsx   # Multi-job comparison
│   │   │   ├── SemanticAnalysis.tsx     # Embedding heatmap + requirement coverage
│   │   │   ├── InterviewPrepPanel.tsx   # Animated Q&A cards with filters
│   │   │   ├── UsageBanner.tsx          # Free-plan usage indicator
│   │   │   └── PricingModal.tsx         # Upgrade modal → Stripe Checkout
│   │   ├── pages/
│   │   │   └── Index.tsx               # 5-tab app shell
│   │   ├── services/
│   │   │   └── resumeApi.ts            # HTTP/SSE client for all backend endpoints
│   │   └── lib/
│   │       ├── userStore.ts            # Anonymous UUID + billing helpers
│   │       └── utils.ts
│   └── vite.config.ts                  # Proxies /api/* → localhost:3001 (SSE buffering disabled)
│
└── backend/                   # Express + TypeScript  (port 3001)
    ├── src/
    │   ├── app.ts                       # Express app (extracted for testability)
    │   ├── index.ts                     # Server entry point
    │   ├── db/
    │   │   └── index.ts                 # SQLite (better-sqlite3) — users + monthly usage
    │   ├── services/
    │   │   ├── gemini.ts                # Gemini SDK — JSON mode, streaming, model fallback
    │   │   ├── embeddings.ts            # text-embedding-004 + cosine similarity
    │   │   └── stripe.ts                # Stripe checkout, portal, webhook verification
    │   ├── routes/
    │   │   ├── resume.ts                # /analyze, /generate-improved, /generate-cover-letter, /compare-jobs
    │   │   ├── semantic.ts              # /semantic-analysis
    │   │   ├── linkedin.ts              # /parse-linkedin
    │   │   ├── interview.ts             # /interview-prep
    │   │   └── billing.ts               # /billing/create-checkout, /portal, /status, /webhook
    │   ├── middleware/
    │   │   ├── validate.ts              # Zod v4 request validation
    │   │   └── usageLimit.ts            # Free-plan monthly cap (3 analyses)
    │   ├── schemas/
    │   │   └── resume.ts                # Zod schemas for all endpoints
    │   ├── prompts/
    │   │   └── index.ts                 # Versioned Gemini prompts
    │   └── tests/
    │       └── resume.test.ts           # 11 Vitest + Supertest integration tests
    └── data/
        └── app.db                       # SQLite database (auto-created, gitignored)
```

The Gemini API key lives exclusively in `backend/.env` — it is never bundled into the frontend.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| AI provider | Google Gemini (`gemini-2.0-flash` with `gemini-1.5-flash` / `gemini-1.5-pro` fallback) |
| Embeddings | `text-embedding-004` (Google Generative AI) |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Payments | Stripe Checkout + Billing Portal |
| File parsing | `pdfjs-dist`, `mammoth` |
| Document export | `jspdf` + `html2canvas`, `docx` |
| Diff engine | `diff` (word-level) |
| Testing | Vitest + Supertest (11 integration tests) |
| Containerisation | Docker Compose + nginx reverse proxy |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- *(Optional)* Stripe account for freemium billing

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ResumeTailorAI
npm run install:all
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
GEMINI_API_KEY=AIzaSy...your_actual_key_here
PORT=3001

# Optional — only needed if you want Stripe billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Start both servers

```bash
npm run dev
```

Open **http://localhost:8080**

---

## Stripe Setup (Optional)

If you want the freemium billing flow:

1. Create a Stripe account at [stripe.com](https://stripe.com/)
2. Create a **recurring price** (e.g. $9/month) in the Stripe Dashboard — copy the `price_xxx` ID
3. Set `STRIPE_SECRET_KEY` and `STRIPE_PRO_PRICE_ID` in `backend/.env`
4. For local webhook testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:3001/api/billing/webhook
   ```
   Copy the `whsec_...` secret it prints into `STRIPE_WEBHOOK_SECRET`

Without these keys set the billing routes return a helpful error and the rest of the app works normally.

---

## API Endpoints

### Resume

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | AI analysis — match score, keywords, strengths, ATS score |
| `POST` | `/api/generate-improved` | Optimised resume (SSE streaming) |
| `POST` | `/api/generate-cover-letter` | Cover letter (SSE streaming) |
| `POST` | `/api/compare-jobs` | Multi-job comparison (up to 5) |

### AI Features

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/semantic-analysis` | Embedding-based section scoring + requirement coverage |
| `POST` | `/api/parse-linkedin` | Clean up LinkedIn PDF export into resume text |
| `POST` | `/api/interview-prep` | Generate 8 targeted Q&As with ideal answers |

### Billing

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/billing/status?userId=` | Current plan, usage count, limit |
| `POST` | `/api/billing/create-checkout` | Create Stripe Checkout session |
| `POST` | `/api/billing/portal` | Open Stripe billing portal |
| `POST` | `/api/billing/webhook` | Stripe webhook (raw body) |

---

## Environment Variables

### `backend/.env`

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `PORT` | Backend port | No (default: 3001) |
| `STRIPE_SECRET_KEY` | Stripe secret key | No (billing disabled without it) |
| `STRIPE_PRO_PRICE_ID` | Stripe recurring price ID | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | No |

---

## Available Scripts

From the **project root**:

```bash
npm run dev            # Start frontend (8080) + backend (3001) concurrently
npm run dev:frontend   # Frontend only
npm run dev:backend    # Backend only
npm run build          # Production build
npm run install:all    # Install deps in frontend/ and backend/
```

From **`backend/`**:

```bash
npm run dev            # tsx watch (auto-restart on changes)
npm test               # Vitest integration tests (11 tests)
npm run build          # Compile TypeScript → dist/
npm start              # Run compiled output
```

---

## Usage Guide

### Optimizer tab
1. **Paste or upload** your resume — supports plain text, PDF, Word (.docx)
2. Import directly from **LinkedIn PDF** (More → Save to PDF on your profile)
3. Paste the **job description**
4. Click **Analyze Resume** — get match score, missing keywords, strengths, tone and ATS scores
5. Click **Generate Optimized Resume** — AI rewrites your resume with streaming preview
6. Switch to **Diff View** to see every word changed

### Semantic tab
- Runs embedding-based analysis on your resume sections vs the JD
- Shows a heatmap of section scores and requirement coverage pills

### Interview tab
- Generates 8 role-specific questions with ideal answers tailored to your background
- Filter by category (Behavioral / Technical / Situational)
- Click any card to expand the ideal answer + coaching tips

### Cover Letter tab
- AI writes a tailored cover letter with streaming output
- Download as PDF or Word

### Compare tab
- Add up to 5 job descriptions and compare them all at once
- Sorted by best fit with per-role missing keywords and top suggestion

---

## Running with Docker

```bash
docker compose up --build
```

The app is served at **http://localhost** via nginx, which proxies `/api/*` to the backend container with SSE buffering disabled.

---

## Testing

```bash
cd backend
npm test
```

11 integration tests covering all core endpoints using Vitest + Supertest. The test environment uses an in-memory SQLite database and skips rate limiting.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## Acknowledgments

- [Google Gemini AI](https://aistudio.google.com/) for AI capabilities and embeddings
- [Stripe](https://stripe.com/) for payments infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for the build tooling
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for the database
