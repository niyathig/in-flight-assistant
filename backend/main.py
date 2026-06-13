import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
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

@app.get("/health")
def health_check():
    return {"status": "healthy"}
