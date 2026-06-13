# In-Flight Medical Translator — 60-Second Demo Script

A tight screen-recording plan for the NVIDIA PM portfolio demo. Goal: show
**fully-local AI + multi-step reasoning** (speech → translate → structured
clinical extraction → clinician handoff) in under a minute.

## Before you hit record

1. **Start the backend** (anaconda python — the project venv lacks the deps):
   ```
   cd ~/in-flight-assistant/backend
   /opt/anaconda3/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```
2. **Confirm Ollama is up** (`ollama list` shows mistral) and the IP in the app
   matches your Mac's en0. To override without editing code:
   ```
   cd ~/in-flight-assistant/frontend-rn
   EXPO_PUBLIC_API_HOST=http://<your-ip>:8000 npm start
   ```
3. **Do one warm-up run** before recording — the first Whisper + Mistral call is
   slow (model load). The second run is the one you film.
4. Silence notifications / set Do Not Disturb. On Mac: `Cmd+Shift+5` to record the
   screen; pick "Record Selected Portion" around the app window.

## The 60-second flow

| Time | On screen | What you say (voiceover) |
|------|-----------|--------------------------|
| 0:00–0:08 | App open, title + disclaimer visible | "This is an in-flight first-response assistant. A passenger has a medical issue, they don't speak English, and there's no doctor on board — only a flight attendant." |
| 0:08–0:14 | Tap 🎤, speak the Spanish line below | "The passenger describes their symptoms in their own language." |
| 0:14–0:24 | Tap ⏹, "Transcribing…" spinner → results | "Everything runs locally on the device — Whisper for speech, Mistral for reasoning. No cloud, no connectivity needed at 35,000 feet." |
| 0:24–0:40 | Scroll through the SAMPLE fields | "It auto-detected the language, translated to English, and extracted a structured SAMPLE summary — Symptoms, Allergies, Medications, Past history, Last intake, Events. That's the exact format a paramedic expects." |
| 0:40–0:50 | Tap **Copy** → ✓ Copied (or **Share**) | "One tap hands that summary off to a ground physician — copy or share." |
| 0:50–0:60 | Point at footer disclaimer | "And it's deliberately scoped: it translates and extracts, it does not diagnose. That boundary was a product decision, not a limitation." |

## Sample phrases to speak (already verified working)

**Spanish (primary take):**
> "Me duele mucho el pecho desde hace una hora y soy alérgico a la penicilina.
> Tomo medicación para la presión arterial."
>
> _(My chest hurts a lot for the past hour and I'm allergic to penicillin. I take
> blood-pressure medication.)_ — hits Symptoms, Allergies, Medications, Last intake.

**Mandarin (alternate take):**
> "我从昨天开始头很痛，还发烧。我没有过敏。"
>
> _(My head has hurt badly since yesterday, and I have a fever. I have no allergies.)_

## Backup if live audio is risky

If the room is noisy or the mic is flaky, use the **"or type"** path: paste the
Spanish sentence into the text box and tap **Translate & Extract**. Same pipeline,
same output, zero audio risk. Film this as a fallback take so you're never stuck.

## Things to NOT do on camera
- Don't film the cold-start run (slow model load looks broken).
- Don't record silence into the mic — the app correctly rejects it ("No speech
  detected"), which is good engineering but a confusing demo moment.
