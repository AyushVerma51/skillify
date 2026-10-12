# Skillify Setup

## 1. Backend Environment

Create `backend/.env` from `.env.example` and add the provider keys:

```env
AI_PROVIDER=groq
AI_FALLBACK_PROVIDER=nvidia
GROQ_API_KEY=your_key
GROQ_MODEL=openai/gpt-oss-20b
NVIDIA_API_KEY=your_key
NVIDIA_MODEL=nvidia/nemotron-3-nano-30b-a3b
DEEPGRAM_API_KEY=your_key
DEEPGRAM_MODEL=nova-2
DATABASE_URL=sqlite:///skillify.db
FRONTEND_URL=http://127.0.0.1:5173
BACKEND_URL=http://127.0.0.1:5000
FLASK_DEBUG=False
```

No authentication configuration is required. SQLite is created automatically in the Flask instance directory.

## 2. Start Backend

```powershell
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend: `http://127.0.0.1:5000`

## 3. Start Frontend

Create `frontend/.env.local`:

```env
VITE_BACKEND_URL=http://127.0.0.1:5000
```

Then run:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend: `http://127.0.0.1:5173`

Career Studio: `http://127.0.0.1:5173/studio`

## 4. Production Variables

Backend:

- `GROQ_API_KEY`
- `NVIDIA_API_KEY`
- `GEMINI_API_KEY`, when Gemini is enabled
- `DEEPGRAM_API_KEY`
- `DATABASE_URL`
- `FRONTEND_URL`
- `BACKEND_URL`
- `RATELIMIT_STORAGE_URI`
- `JOB_MARKET_CACHE_SECONDS`, optional
- `REMOTIVE_CACHE_SECONDS`, optional

Frontend:

- `VITE_BACKEND_URL`

Never add provider keys to variables beginning with `VITE_`.

## 5. Tests

```powershell
cd backend
venv\Scripts\python.exe -m unittest -v test_workflow.py test_resume_review.py

cd ..\frontend
npm run lint
npm run build
```

`test_resume_review.py` covers the resume rubric and imports no third-party
package, so it also runs on a machine without the AI or ML dependencies.

## 6. Release Check

1. Confirm `/api/health` returns `200`.
2. Open the Career Studio without an account prompt.
3. Test interest assessment and target-role continuity.
4. Test live job-market analysis.
5. Review a resume with and without a target role, and confirm the score, section
   checklist, and fix list all appear.
6. Generate a roadmap and refresh to confirm browser-local progress.
7. Test microphone permission, transcription, answer scoring, and final interview feedback.
