import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import tempfile
from model import get_completion

app = FastAPI(title="In-Flight First-Response Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "In-Flight Assistant API"}

@app.post("/translate")
def translate(request: TranslationRequest):
    """
    Translate a message and extract SAMPLE clinical summary.

    Input: any language
    Output: English translation + structured SAMPLE JSON
    """
    if not request.message or not request.message.strip():
        from model import SAMPLEOutput
        return {
            "success": False,
            "error": "Message cannot be empty",
            "translation": "",
            "sample": SAMPLEOutput().model_dump()
        }

    system_prompt = """You are a medical translation assistant for in-flight emergencies.
Your job is to:
1. Detect the language of the input
2. Translate it to English
3. Extract structured clinical information into the SAMPLE format

Do NOT diagnose or recommend clinical actions. Only translate and extract facts."""

    result = get_completion(request.message, system_prompt)
    return result

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Voice input: transcribe audio (auto-detecting language), then run the
    same translation + SAMPLE extraction pipeline as /translate.

    Input: audio file (m4a/wav/etc.) recorded on the device
    Output: transcription + detected language + English translation + SAMPLE
    """
    # Import here so the server still starts even if whisper deps are missing
    from transcribe import transcribe_audio

    # Persist the upload to a temp file Whisper can read
    suffix = os.path.splitext(audio.filename or "")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        stt = transcribe_audio(tmp_path)
    except Exception as e:
        return {
            "success": False,
            "error": f"Transcription failed: {str(e)}",
            "transcription": "",
            "sample": {},
        }
    finally:
        os.unlink(tmp_path)

    transcription = stt["text"]
    # Reject when there's no real speech. Two signals:
    #  - empty text after VAD filtering (silence dropped before transcription)
    #  - low language-detection confidence, which Whisper reports when it's
    #    hallucinating a token from silence/noise (~0.3) vs real speech (>0.9)
    LANG_CONF_FLOOR = 0.6
    if not transcription.strip() or stt["language_probability"] < LANG_CONF_FLOOR:
        return {
            "success": False,
            "error": "No speech detected in audio",
            "transcription": "",
            "detected_language_audio": stt["detected_language"],
            "language_probability": stt["language_probability"],
            "sample": {},
        }

    system_prompt = """You are a medical translation assistant for in-flight emergencies.
Your job is to:
1. Detect the language of the input
2. Translate it to English
3. Extract structured clinical information into the SAMPLE format

Do NOT diagnose or recommend clinical actions. Only translate and extract facts."""

    result = get_completion(transcription, system_prompt)
    # Surface what Whisper heard alongside the structured result
    result["transcription"] = transcription
    result["detected_language_audio"] = stt["detected_language"]
    result["language_probability"] = stt["language_probability"]
    return result


@app.get("/health")
def health_check():
    return {"status": "healthy"}
