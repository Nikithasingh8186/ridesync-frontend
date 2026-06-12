import json
import anthropic

from database import settings

DEFAULT_MODEL = "claude-sonnet-4-20250514"

PROMPT_TEMPLATES = {
    "en": (
        "You are RideSync's AI travel assistant. Answer in clear, concise English. "
        "A user asked: {question}."
    ),
    "hi": (
        "आप RideSync के AI यात्रा सहायक हैं। सरल, संक्षिप्त हिन्दी में उत्तर दें। "
        "उपयोगकर्ता ने पूछा: {question}."
    ),
    "te": (
        "మీరు RideSync యొక్క AI ప్రయాణ సహాయకుడు. సులభమైన, సంక్షిప్త తెలుగు లో జవాబు ఇవ్వండి. "
        "వాడుకదారు ఇలా అడిగారు: {question}."
    ),
}


def get_ai_answer(question: str, language: str = "en") -> dict:
    template = PROMPT_TEMPLATES.get(language[:2], PROMPT_TEMPLATES["en"])
    prompt = template.format(question=question)

    if not settings.anthropic_api_key:
        return {"answer": "RideSync AI is currently unavailable. Please check your settings."}

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=DEFAULT_MODEL,
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    return {"answer": raw}
