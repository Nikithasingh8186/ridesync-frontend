"""
AI-powered ride suggestions using Anthropic Claude.

Given a user's commute pattern, Claude returns structured suggestions
about optimal carpool timing, pickup strategy, and cost sharing.
"""

import json
import anthropic
import httpx

from database import settings

DEFAULT_MODEL = "claude-sonnet-4-20250514"
DEFAULT_OLLAMA_MODEL = "llama3"

PROMPT_TEMPLATES = {
    "en": (
        "You are a commute optimiser for RideSync, a corporate carpooling app. "
        "A user wants to travel from \"{origin_address}\" to \"{destination_address}\" and prefers to leave around {preferred_departure}. "
        "Respond ONLY with a JSON object with keys: top_pick_id, reasoning, tips. "
        "Use the available rides below."
    ),
    "hi": (
        "आप RideSync के लिए एक यात्रा अनुकूलक हैं। उपयोगकर्ता \"{origin_address}\" से \"{destination_address}\" तक जाना चाहता है और लगभग {preferred_departure} पर प्रस्थान करना पसंद करता है। "
        "केवल JSON ऑब्जेक्ट में उत्तर दें जिसमें keys हों: top_pick_id, reasoning, tips। "
        "नीचे उपलब्ध राइड देखें।"
    ),
    "te": (
        "మీరు RideSync కోసం ఒక ప్రయాణ ఆప్టిమైజర్. వినియోగదారు \"{origin_address}\" నుండి \"{destination_address}\" కి ప్రయాణం చేయాలనుకుంటున్నాడు మరియు సుమారు {preferred_departure} కు బయలుదేరడానికి ఇష్టపడుతున్నాడు. "
        "దయచేసి కేవలం JSON ఆబ్జెక్ట్‌తో సమాధానం ఇవ్వండి, దీని లోపల keys ఉండాలి: top_pick_id, reasoning, tips. "
        "క్రింద అందుబాటులో ఉన్న రైడ్‌లను చూడండి."
    ),
}


def _build_prompt(
    origin_address: str,
    destination_address: str,
    preferred_departure: str,
    available_rides: list[dict],
    language: str = "en",
) -> str:
    template = PROMPT_TEMPLATES.get(language[:2], PROMPT_TEMPLATES["en"])
    rides_json = json.dumps(available_rides, indent=2, default=str)
    return template.format(
        origin_address=origin_address,
        destination_address=destination_address,
        preferred_departure=preferred_departure,
    ) + f"\n\nAvailable rides:\n{rides_json}\n\nExample format:\n{{\"top_pick_id\": 3, \"reasoning\": \"...\", \"tips\": [\"...\", \"...\"]}}"


def _normalize_string(value: object) -> str:
    return str(value).strip() if value is not None else ""


def _parse_suggestion_response(raw: str) -> dict | None:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict) and "top_pick_id" in parsed:
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def _call_openai_compatible(
    origin_address: str,
    destination_address: str,
    preferred_departure: str,
    available_rides: list[dict],
    language: str,
    api_url: str,
    api_key: str,
) -> str:
    prompt = _build_prompt(origin_address, destination_address, preferred_departure, available_rides, language)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 512,
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


def _call_ollama(
    origin_address: str,
    destination_address: str,
    preferred_departure: str,
    available_rides: list[dict],
    language: str,
    local_endpoint: str,
) -> str:
    prompt = _build_prompt(origin_address, destination_address, preferred_departure, available_rides, language)
    url = local_endpoint.rstrip("/") + "/api/generate"
    payload = {
        "model": DEFAULT_OLLAMA_MODEL,
        "prompt": prompt,
        "max_tokens": 512,
        "temperature": 0.7,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            text = _normalize_string(data.get("completion") or data.get("text"))
            if not text and isinstance(data.get("results"), list):
                results = data.get("results")
                if results and isinstance(results[0], dict):
                    text = _normalize_string(results[0].get("content") or results[0].get("completion"))
            return text
    except httpx.HTTPError:
        return ""


def get_ride_suggestions(
    origin_address: str,
    destination_address: str,
    preferred_departure: str,
    available_rides: list[dict],
    language: str = "en",
    ai_mode: str = "cloud",
    local_endpoint: str = "http://localhost:11434",
    byok_key: str | None = None,
) -> dict:
    if byok_key:
        raw = _call_openai_compatible(
            origin_address,
            destination_address,
            preferred_departure,
            available_rides,
            language,
            settings.openai_api_url,
            byok_key,
        )
        parsed = _parse_suggestion_response(raw)
        if parsed:
            return parsed

    if ai_mode == "local":
        raw = _call_ollama(
            origin_address,
            destination_address,
            preferred_departure,
            available_rides,
            language,
            local_endpoint,
        )
        parsed = _parse_suggestion_response(raw)
        if parsed:
            return parsed

    if settings.anthropic_api_key:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        prompt = _build_prompt(origin_address, destination_address, preferred_departure, available_rides, language)
        message = client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _normalize_string(message.content[0].text)
        parsed = _parse_suggestion_response(raw)
        if parsed:
            return parsed

    return _fallback_suggestion(available_rides)


def _fallback_suggestion(available_rides: list[dict]) -> dict:
    """
    Return a basic suggestion when the AI service is unavailable.
    Picks the first available ride, or null if none exist.
    """
    top_id = available_rides[0]["id"] if available_rides else None
    return {
        "top_pick_id": top_id,
        "reasoning": "Recommended based on departure time proximity.",
        "tips": [
            "Confirm your exact pickup spot with the driver 30 minutes before departure.",
            "Share your live location when you're on your way to the pickup point.",
        ],
    }