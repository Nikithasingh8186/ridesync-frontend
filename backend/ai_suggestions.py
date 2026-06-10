"""
AI-powered ride suggestions using Anthropic Claude.

Given a user's commute pattern, Claude returns structured suggestions
about optimal carpool timing, pickup strategy, and cost sharing.
"""

import json
import anthropic

from database import settings


def get_ride_suggestions(
    origin_address: str,
    destination_address: str,
    preferred_departure: str,
    available_rides: list[dict],
) -> dict:
    """
    Ask Claude to analyse available rides and suggest the best matches
    along with personalised commute advice.

    Args:
        origin_address: human-readable origin string
        destination_address: human-readable destination string
        preferred_departure: time string e.g. "08:30"
        available_rides: list of ride dicts (id, driver_name, departure_time,
                         origin_address, available_seats, cost_per_person)

    Returns:
        dict with keys: top_pick_id, reasoning, tips (list of strings)
    """
    if not settings.anthropic_api_key:
        return _fallback_suggestion(available_rides)

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    rides_json = json.dumps(available_rides, indent=2, default=str)

    prompt = f"""You are a commute optimiser for RideSync, a corporate carpooling app.

A user wants to travel from "{origin_address}" to "{destination_address}", 
preferring to leave around {preferred_departure}.

Here are the available matching rides:
{rides_json}

Respond ONLY with a JSON object — no preamble, no markdown fences — with these keys:
- top_pick_id: integer (the ride id you recommend most, or null if none suit)
- reasoning: string (1-2 sentences explaining your pick)
- tips: array of 2-3 short strings with practical carpooling advice for this commute

Example format:
{{"top_pick_id": 3, "reasoning": "...", "tips": ["...", "..."]}}"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
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