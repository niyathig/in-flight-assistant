# In-Flight First-Response Assistant

A portfolio project demonstrating end-to-end product thinking for an offline, on-device medical emergency translation tool.

**What it does:**
- Real-time translation between cabin crew and a sick passenger (any language → English)
- Extracts clinical information into a structured SAMPLE summary (Symptoms, Allergies, Medications, Past history, Last intake, Events)
- Does NOT diagnose or recommend clinical actions (intentional product boundary)

**Current phase:** Milestone 3 — local Ollama/Mistral backend (offline-capable).

## Tech Stack

- **Backend:** Python, FastAPI
- **Frontend:** HTML, vanilla JavaScript
- **Model:** Local Ollama/Mistral (fully offline, no API keys needed)
- **Model abstraction:** Single `get_completion()` function (swapped Gemini → Ollama at Milestone 3)

## Setup

### Prerequisites
- Python 3.9+
- Ollama (https://ollama.ai) with Mistral model pulled

### Installation

1. **Install Ollama:**
   ```bash
   # Download and install from https://ollama.ai
   # Then pull the model:
   ollama pull mistral
   ```

2. **Start Ollama server (runs in background on port 11434):**
   ```bash
   ollama serve
   ```

3. **Clone and navigate:**
   ```bash
   git clone https://github.com/niyathig/in-flight-assistant.git
   cd in-flight-assistant
   ```

4. **Create Python virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

5. **Install dependencies:**
   ```bash
   pip install -r backend/requirements.txt
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

- **Milestone 1 ✅ (Done):** Text loop end-to-end with Gemini API
- **Milestone 2 ✅ (Done):** Reliable JSON output with retry logic and error handling
- **Milestone 3 ✅ (Done):** Swap API → local Ollama/Mistral (fully offline)
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
- Start with Gemini API (Milestone 1-2) ✅
- Swap to local Ollama/Mistral (Milestone 3) ✅ — **Now fully offline, no API keys needed**

## Notes

- Mac M2, 8GB RAM target (Mistral 7B runs smoothly on modest hardware)
- Voice and UI polish are Milestone 4
- Product thesis: translate only, extract facts, no clinical recommendations
- **Milestone 3 complete:** Fully offline, no API calls or keys needed
