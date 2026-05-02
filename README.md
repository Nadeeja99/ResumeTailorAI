# ResumeTailorAI

> **AI-Powered Resume Optimization Tool** — Transform your resume with intelligent analysis and data-driven improvements to land your dream job.

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.1-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com/)

## Features

- **AI-Powered Analysis** — Analyzes your resume against a job description using Google Gemini
- **Match Score** — Percentage-based compatibility with the job requirements
- **Missing Keywords** — Specific terms from the job description absent from your resume
- **ATS Optimization** — Ensures your resume passes Applicant Tracking Systems
- **Optimized Resume Generation** — Rewrites your resume incorporating all suggestions
- **Local Fallback** — Heuristic analysis runs instantly when the backend is unreachable

## Architecture

This is a monorepo with a clear frontend/backend split:

```
ResumeTailorAI/
├── package.json          # Root orchestrator — runs both services via concurrently
├── frontend/             # React 18 + Vite + TypeScript (port 8080)
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui)
│   │   ├── pages/        # Index.tsx — main app page
│   │   ├── services/     # gemini.ts — HTTP client calling the backend
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts    # Proxies /api/* → http://localhost:3001
│   └── package.json
└── backend/              # Express + TypeScript (port 3001)
    ├── src/
    │   ├── index.ts          # Server entry point
    │   ├── services/
    │   │   └── gemini.ts     # Gemini SDK calls (API key never sent to browser)
    │   └── routes/
    │       └── resume.ts     # POST /api/analyze, POST /api/generate-improved
    └── package.json
```

The Gemini API key lives exclusively in `backend/.env` and is never bundled into the frontend.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| AI provider | Google Gemini (`gemini-1.5-flash-latest`) |
| File parsing | pdfjs-dist, mammoth |
| PDF export | jspdf + html2canvas |

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ResumeTailorAI
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure the backend API key**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and set your key:
   # GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```

4. **Start both servers**
   ```bash
   npm run dev
   ```

5. **Open the app**
   Navigate to `http://localhost:8080`

## API Key Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in and click **Get API Key** → **Create API Key**
3. Copy the key and paste it into `backend/.env`:
   ```
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```

The key is only used server-side — it is never sent to the browser.

## Available Scripts

Run these from the **project root**:

```bash
npm run dev            # Start frontend (8080) + backend (3001) together
npm run dev:frontend   # Start only the frontend
npm run dev:backend    # Start only the backend
npm run build          # Production build of the frontend
npm run install:all    # Install deps in both frontend/ and backend/
```

Run these from the **`frontend/`** folder:

```bash
npm run dev            # Vite dev server
npm run build          # Production build → frontend/dist/
npm run preview        # Preview production build
npm run lint           # ESLint
```

Run these from the **`backend/`** folder:

```bash
npm run dev            # tsx watch (auto-restarts on changes)
npm run build          # Compile TypeScript → backend/dist/
npm start              # Run compiled output
```

## API Endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/analyze` | `{ resume, jobDescription }` | Analysis JSON |
| `POST` | `/api/generate-improved` | `{ resume, jobDescription, suggestions }` | `{ improvedResume }` |

## Environment Variables

### `backend/.env`

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `PORT` | Port for the backend server | No (default: 3001) |

### `frontend/.env`

No secrets are stored here. The frontend proxies all `/api/*` requests through Vite to the backend.

## Usage

1. **Paste your resume** into the left panel (plain text, or upload a PDF/Word file)
2. **Paste the job description** into the right panel
3. Click **Analyze Resume** — results appear with match score, missing keywords, strengths, tone and ATS scores
4. Click **Generate Optimized Resume** — the AI rewrites your resume incorporating all suggestions
5. Review and download the improved version

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

## Acknowledgments

- [Google Gemini AI](https://aistudio.google.com/) for AI capabilities
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for the build tooling
