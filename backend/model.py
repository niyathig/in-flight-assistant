import json
import os
import re
import google.generativeai as genai
from pydantic import BaseModel, ValidationError

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class SAMPLEOutput(BaseModel):
    """Structured clinical summary for handoff to ground physician."""
    symptoms: str = "not specified"
    allergies: str = "not specified"
    medications: str = "not specified"
    past_medical_history: str = "not specified"
    last_oral_intake: str = "not specified"
    events: str = "not specified"
    raw_translation: str = ""
    detected_language: str = "unknown"

def repair_json(text: str) -> str:
    """
    Attempt to repair common JSON malformations.
    Handles: trailing commas, single quotes, unescaped newlines.
    """
    # Remove markdown code blocks
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    # Fix common issues
    text = re.sub(r',\s*}', '}', text)  # Remove trailing commas before }
    text = re.sub(r',\s*]', ']', text)  # Remove trailing commas before ]
    text = text.replace("'", '"')  # Single quotes to double quotes

    # Fix unescaped newlines in strings
    text = re.sub(r':\s*"([^"]*)\n([^"]*)"', r': "\1\\n\2"', text)

    return text

def extract_json_from_text(text: str) -> dict:
    """
    Extract JSON from text, handling cases where JSON is embedded in other content.
    """
    # Try to find JSON object { ... }
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def parse_json_robust(response_text: str) -> dict | None:
    """
    Try multiple strategies to parse JSON from response.
    Returns parsed dict or None if all strategies fail.
    """
    strategies = [
        lambda t: json.loads(t),  # Direct parse
        lambda t: json.loads(repair_json(t)),  # Repair then parse
        lambda t: json.loads(extract_json_from_text(t)),  # Extract then parse
        lambda t: json.loads(repair_json(extract_json_from_text(t))),  # Both
    ]

    for strategy in strategies:
        try:
            return strategy(response_text)
        except (json.JSONDecodeError, ValueError):
            continue

    return None

def get_completion(user_message: str, system_prompt: str = None, retry_count: int = 0) -> dict:
    """
    Unified model interface for getting completions with robust JSON handling.
    CRITICAL: This single function abstracts the model call so we can swap
    Gemini → local Gemma later by just changing this implementation.

    Args:
        user_message: The user's input (may be in any language)
        system_prompt: Optional system context
        retry_count: Internal retry counter

    Returns:
        dict with 'success', 'translation', and 'sample' keys
    """
    MAX_RETRIES = 2
    model = genai.GenerativeModel("gemini-1.5-flash")

    full_prompt = f"""{system_prompt or ''}

User message (may be in any language):
{user_message}

Respond with ONLY a valid JSON object (no markdown, no extra text, no explanation) with this exact structure:
{{
    "detected_language": "<language name>",
    "raw_translation": "<English translation of the message>",
    "symptoms": "<symptoms or 'not specified'>",
    "allergies": "<allergies or 'not specified'>",
    "medications": "<medications or 'not specified'>",
    "past_medical_history": "<past history or 'not specified'>",
    "last_oral_intake": "<last food/drink or 'not specified'>",
    "events": "<events or 'not specified'>"
}}
"""

    try:
        response = model.generate_content(full_prompt)
        response_text = response.text.strip()

        # Try to parse JSON robustly
        data = parse_json_robust(response_text)

        if data is None:
            # If JSON parsing completely failed and we have retries, try again
            if retry_count < MAX_RETRIES:
                return get_completion(user_message, system_prompt, retry_count + 1)
            else:
                # Fallback: return empty SAMPLE with error
                return {
                    "success": False,
                    "error": "Could not extract structured data",
                    "translation": "",
                    "sample": SAMPLEOutput().model_dump()
                }

        # Validate and fill in defaults
        try:
            sample = SAMPLEOutput(**data)
        except ValidationError:
            # Partial validation failed, but we got some data
            sample = SAMPLEOutput(**{k: data.get(k, "") for k in SAMPLEOutput.model_fields})

        return {
            "success": True,
            "translation": sample.raw_translation,
            "sample": sample.model_dump()
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing request: {str(e)}",
            "translation": "",
            "sample": SAMPLEOutput().model_dump()
        }
