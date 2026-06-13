import json
import os
import google.generativeai as genai
from pydantic import BaseModel

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class SAMPLEOutput(BaseModel):
    """Structured clinical summary for handoff to ground physician."""
    symptoms: str
    allergies: str
    medications: str
    past_medical_history: str
    last_oral_intake: str
    events: str
    raw_translation: str
    detected_language: str

def get_completion(user_message: str, system_prompt: str = None) -> dict:
    """
    Unified model interface for getting completions.
    CRITICAL: This single function abstracts the model call so we can swap
    Gemini → local Gemma later by just changing this implementation.

    Args:
        user_message: The user's input (may be in any language)
        system_prompt: Optional system context

    Returns:
        dict with 'translation' and 'sample' keys
    """
    model = genai.GenerativeModel("gemini-1.5-flash")

    # Build the combined prompt
    full_prompt = f"""{system_prompt or ''}

User message (may be in any language):
{user_message}

Respond with ONLY a valid JSON object (no markdown, no extra text) with this structure:
{{
    "detected_language": "<detected language name>",
    "raw_translation": "<translate the user message to English>",
    "symptoms": "<symptoms mentioned, or 'not specified'>",
    "allergies": "<allergies mentioned, or 'not specified'>",
    "medications": "<medications mentioned, or 'not specified'>",
    "past_medical_history": "<relevant past history, or 'not specified'>",
    "last_oral_intake": "<last food/drink, or 'not specified'>",
    "events": "<events leading to incident, or 'not specified'>"
}}
"""

    try:
        response = model.generate_content(full_prompt)
        response_text = response.text.strip()

        # Try to parse JSON (handle markdown code blocks)
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        data = json.loads(response_text)

        return {
            "success": True,
            "translation": data.get("raw_translation", ""),
            "sample": {
                "symptoms": data.get("symptoms", ""),
                "allergies": data.get("allergies", ""),
                "medications": data.get("medications", ""),
                "past_medical_history": data.get("past_medical_history", ""),
                "last_oral_intake": data.get("last_oral_intake", ""),
                "events": data.get("events", ""),
                "raw_translation": data.get("raw_translation", ""),
                "detected_language": data.get("detected_language", "")
            }
        }
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse model response as JSON: {str(e)}",
            "raw_response": response_text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
