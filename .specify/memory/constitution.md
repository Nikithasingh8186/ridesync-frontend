# RideSync Constitution

## Project Identity
- Name: RideSync
- Type: Internal office carpooling platform
- Stack: FastAPI + MySQL + React + Vite + Claude AI
- Team Size: 2 (Hackathon project)

## Core Values
1. Simplicity — every feature must serve the demo
2. Reliability — working demo beats half-built features
3. Impact — always tie features back to cost/CO2 savings

## Non-Negotiables
- JWT auth on every protected route
- Match score must always be visible to user
- AI suggestion must feel personal, not generic
- Mobile-friendly UI minimum

## Decisions Made
- Python 3.11 only (not 3.12, not 3.14)
- Use py -3.11 -m uvicorn to start backend
- Zone-based matching with neighbor map for Hyderabad zones
- Claude API for AI suggestions
- No external UI libraries — plain CSS and inline styles only
- All API calls go through services/api.js only