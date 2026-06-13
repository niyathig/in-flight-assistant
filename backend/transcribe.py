"""
Local speech-to-text using faster-whisper.

Whisper auto-detects the spoken language from the audio itself — no manual
language selection needed. This keeps the app fully offline/on-device,
consistent with the local Ollama/Mistral text pipeline.
"""
import os
from faster_whisper import WhisperModel

# "small" (~480MB) gives noticeably better multilingual accuracy and
# language auto-detection than "base", and still runs comfortably on M2/8GB.
# Override with WHISPER_MODEL=base for speed, or =medium for max accuracy.
MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")

# int8 quantization keeps memory low on CPU (no CUDA on Mac).
_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    """Lazy-load the model once and reuse it across requests."""
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    return _model


def transcribe_audio(audio_path: str) -> dict:
    """
    Transcribe an audio file, auto-detecting its language.

    Returns:
        dict with 'text', 'detected_language', and 'language_probability'
    """
    model = get_model()
    # vad_filter uses Silero VAD to strip non-speech audio before transcription.
    # Without it, Whisper hallucinates filler tokens on silence/noise
    # (e.g. "You", "Thank you", "Thanks for watching") — a well-known failure
    # mode. Filtering silence first makes truly-empty audio transcribe to "".
    segments, info = model.transcribe(audio_path, beam_size=5, vad_filter=True)

    # segments is a generator; join all segment texts
    text = "".join(segment.text for segment in segments).strip()

    return {
        "text": text,
        "detected_language": info.language,
        "language_probability": round(info.language_probability, 3),
    }
