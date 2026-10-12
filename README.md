# Skillify

Skillify is an account-free career operating system that connects career discovery, live job-market evidence, personalized roadmaps, course recommendations, and voice-based mock interviews inside one guided Career Studio.

## Product Experience

The interface has three top-level destinations:

- **Home** explains the connected workflow.
- **Career Studio** contains every interactive career tool.
- **About** explains the data sources, architecture, and product principles.

Inside the Studio, users move through six connected steps:

1. **Discover**: select five interests and receive a machine-learning career direction.
2. **Validate**: inspect current openings, recurring skills, locations, companies, and seniority.
3. **Review**: upload a resume and get an estimated compatibility score plus a fix list.
4. **Plan**: generate a weekly roadmap with milestones, projects, and completion criteria.
5. **Learn**: search the local course catalogue for role and skill gaps.
6. **Practice**: upload a resume or enter a role, answer questions aloud, and receive feedback.

The selected target role is shared between tools. Roadmap progress is saved in browser storage, so no signup, login, password, or user profile is required.

## Architecture

- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Backend: Flask and SQLAlchemy.
- Primary text AI: Groq.
- Optional fallback text AI: NVIDIA NIM or Gemini.
- Speech-to-text: Deepgram.
- Career model: Scikit-learn with `stud_training.csv` and `stud_testing.csv`.
- Resume review: a deterministic rubric in `resume_review.py`; an AI provider only adds narrative.
- Course catalogue: local `Courser.csv` ranking.
- Job-market data: cached Arbeitnow, Remotive, and The Muse listings with source attribution.
- Persistence: browser-local roadmap state and anonymous interview sessions.

All provider secrets remain in the backend. The frontend receives only the public backend URL.

## Local Development

### Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Minimum backend configuration:

```env
AI_PROVIDER=groq
AI_FALLBACK_PROVIDER=nvidia
GROQ_API_KEY=your_groq_api_key
NVIDIA_API_KEY=your_nvidia_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
DATABASE_URL=sqlite:///skillify.db
FRONTEND_URL=http://127.0.0.1:5173
BACKEND_URL=http://127.0.0.1:5000
FLASK_DEBUG=False
```

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env.local
npm run dev -- --host 127.0.0.1 --port 5173
```

```env
VITE_BACKEND_URL=http://127.0.0.1:5000
```

Local URLs:

- Frontend: `http://127.0.0.1:5173`
- Career Studio: `http://127.0.0.1:5173/studio`
- Backend: `http://127.0.0.1:5000`
- Health check: `http://127.0.0.1:5000/api/health`

## Main APIs

- `GET /api/health`
- `GET /api/career/options`
- `POST /api/career/recommend`
- `GET /api/job-market?role=<role>&location=<location>&remote=<true|false>`
- `GET /api/courses?q=<role-or-skill>`
- `POST /api/resume/review`
- `POST /api/roadmaps/generate`
- `POST /api/chat`
- `POST /api/mock/analyze-profile`
- `POST /api/mock/start`
- `POST /api/mock/transcribe`
- `POST /api/mock/answer`
- `POST /api/mock/finish`

## Verification

```powershell
cd backend
venv\Scripts\python.exe -m unittest -v test_workflow.py test_resume_review.py

cd ..\frontend
npm run lint
npm run build
```

## Deployment

- `vercel.json` builds the React frontend from the repo root on Vercel.
- `render.yaml` configures the Flask API on Render.
- Production PostgreSQL is hosted on Neon Free and supplied to Render through the protected `DATABASE_URL` environment variable.
- The existing `skillify-db` Render database is retained temporarily as an unconnected rollback resource and can expire without affecting the app.
- `frontend/vercel.json` still preserves React Router routes if you deploy the frontend subfolder directly.
- Set `VITE_BACKEND_URL` to the deployed Flask API URL.
- Set backend `FRONTEND_URLS` to the comma-separated list of allowed HTTPS frontend origins and `BACKEND_URL` to the Flask API URL.
- Store Groq, NVIDIA, Gemini, and Deepgram keys only in backend secret settings.
- The frontend performs a shared health check and waits through Render free-tier cold starts before sending feature requests.
- Use Redis for `RATELIMIT_STORAGE_URI` when running multiple backend instances.

## Privacy And Limits

- Roadmap progress and the last resume review stay in the current browser.
- Resume files are read in memory for a review or an interview and are never stored by the backend.
- Anonymous interview sessions and provider diagnostics are stored by the backend database.
- Resume text and interview transcripts can contain personal information; define retention and deletion policies before a public launch.
- Career recommendations, market activity, and interview scores are informational and do not guarantee employment outcomes.
