import anthropic
import httpx

from database import settings

DEFAULT_MODEL = "claude-sonnet-4-20250514"
DEFAULT_OLLAMA_MODEL = "llama3"

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
        "మీరు RideSync యొక్క AI ప్రయాణ సహాయకుడు. సులభమైన, సంక్షిప్ట్ తెలుగు లో జవాబు ఇవ్వండి. "
        "వాడుకదారు ఇలా అడిగారు: {question}."
    ),
}


def _build_prompt(question: str, language: str) -> str:
    template = PROMPT_TEMPLATES.get(language[:2], PROMPT_TEMPLATES["en"])
    return template.format(question=question)


def _normalize_string(value: object) -> str:
    return str(value).strip() if value is not None else ""


def _extract_text(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("response", "completion", "text", "content"):
            if key in value and value[key] is not None:
                return _extract_text(value[key])
        if isinstance(value.get("result"), dict):
            return _extract_text(value["result"])
        if isinstance(value.get("results"), list) and value["results"]:
            return _extract_text(value["results"][0])
        if isinstance(value.get("outputs"), list) and value["outputs"]:
            return _extract_text(value["outputs"][0])
    return ""


def _call_openai_compatible(question: str, language: str, api_url: str, api_key: str) -> str:
    prompt = _build_prompt(question, language)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 256,
        "temperature": 0.7,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(api_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices") or []
            if choices:
                first = choices[0]
                message = first.get("message") or {}
                return _normalize_string(message.get("content") or first.get("text"))
            return _normalize_string(data.get("completion") or data.get("text"))
    except httpx.HTTPError:
        return ""


def _call_ollama(question: str, language: str, local_endpoint: str) -> str:
    prompt = _build_prompt(question, language)
    url = local_endpoint.rstrip("/") + "/api/generate"

    payload = {
        "model": DEFAULT_OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            text = _extract_text(data)
            if not text:
                print("OLLAMA RESPONSE:", data)
            return _normalize_string(text)

    except Exception as e:
        print("OLLAMA ERROR:", str(e))
        return ""

def get_ai_answer(
    question: str,
    language: str = "en",
    ai_mode: str = "cloud",
    local_endpoint: str = "http://localhost:11434",
    byok_key: str | None = None,
) -> dict:

    print("QUESTION:", question)
    print("AI MODE:", ai_mode)
    print("LOCAL ENDPOINT:", local_endpoint)

    if byok_key:
        answer = _call_openai_compatible(
            question,
            language,
            settings.openai_api_url,
            byok_key,
        )
        print("BYOK ANSWER:", answer)

        if answer:
            return {"answer": answer}

    if ai_mode == "local":
        answer = _call_ollama(
            question,
            language,
            local_endpoint,
        )

        print("OLLAMA ANSWER:", repr(answer))

        if answer:
            return {"answer": answer}

    print("FALLBACK REACHED")

    if settings.anthropic_api_key:
        print("TRYING ANTHROPIC")
        try:
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            response = client.messages.create(
                model=DEFAULT_MODEL,
                max_tokens_to_sample=256,
                messages=[{"role": "user", "content": _build_prompt(question, language)}],
            )
            anthropic_text = _normalize_string(
                getattr(response, "content", None)
                or (response.get("content") if isinstance(response, dict) else None)
                or (
                    response["message"]["content"]
                    if isinstance(response, dict) and response.get("message")
                    else None
                )
            )
            print("ANTHROPIC ANSWER:", anthropic_text)
            if anthropic_text:
                return {"answer": anthropic_text}
        except Exception as e:
            print("ANTHROPIC ERROR:", str(e))

    return {
        "answer": "RideSync AI is currently unavailable. Please check your settings."
    }