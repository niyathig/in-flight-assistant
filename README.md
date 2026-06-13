# In-Flight First-Response Assistant

A portfolio project demonstrating end-to-end product thinking for an offline, on-device medical emergency translation tool.

**What it does:**
- Real-time translation between cabin crew and a sick passenger (any language → English)
- Extracts clinical information into a structured SAMPLE summary (Symptoms, Allergies, Medications, Past history, Last intake, Events)
- Does NOT diagnose or recommend clinical actions (intentional product boundary)

**Current phase:** Milestone 1 — text-based translation + SAMPLE extraction using Gemini API.

## Tech Stack

- **Backend:** Python, FastAPI
- **Frontend:** HTML, vanilla JavaScript
- **Model:** Google Gemini (swap to local Ollama/Gemma at Milestone 3)
- **Model abstraction:** Single `get_completion()` function (easy API → local swap)

## Setup

### Prerequisites
- Python 3.9+
- Gemini API key (free at https://aistudio.google.com/apikey)

### Installation

1. **Clone and navigate:**
   ```bash
   git clone https://github.com/niyathig/in-flight-assistant.git
   cd in-flight-assistant
   ```

2. **Create Python virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Create `.env` file in project root:**
   ```
   GEMINI_API_KEY=your_actual_gemini_key_here
   ```

### Running

**Terminal 1 — Backend (FastAPI):**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
Open `frontend/index.html` in your browser (or run a simple server):
```bash
cd frontend
python -m http.server 5000
# Then visit http://localhost:5000
```

## Usage

1. Type a message in any language (e.g., Spanish, Mandarin, French)
2. Click "Translate & Extract"
3. See:
   - Detected language
   - English translation
   - Structured SAMPLE clinical summary

## Project Roadmap

- **Milestone 1 ✅ (Done):** Text loop end-to-end
- **Milestone 2:** Reliable JSON output (Gemini → local Gemma swap preparation)
- **Milestone 3:** Swap API → local Ollama/Gemma
- **Milestone 4:** Browser voice (STT/TTS) + UI polish

## Architecture

```
backend/
  ├── model.py        # Model abstraction (get_completion function)
  ├── main.py         # FastAPI app
  └── requirements.txt

frontend/
  ├── index.html      # UI
  └── script.js       # Client logic

.env                  # API keys (create this, don't commit)
```

## Key Design Decision

The `get_completion()` function in `backend/model.py` abstracts the model call. This lets us:
- Start with Gemini API today (free, works immediately)
- Swap to local Gemma in 2-3 lines at Milestone 3 (no refactor needed)

## Notes

- Mac M2, 8GB RAM target (tight memory — Gemma will be Q4 quantized)
- Voice and UI polish are Milestone 4
- Product thesis: translate only, extract facts, no clinical recommendations
