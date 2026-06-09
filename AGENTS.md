# AGENTS.md — AI Agent Guidelines for RideSync

## Purpose
This file tells AI coding agents (Claude, Copilot, etc.)
how to work on this codebase correctly.

## Project Context
RideSync is a 2-person hackathon project — an internal office
carpooling app built with FastAPI + MySQL + React + Vite.

## Stack Rules
- Python version: 3.11 only (not 3.12, not 3.14)
- Use py -3.11 -m uvicorn to start backend
- React: functional components and hooks only
- No external UI libraries (no MUI, no Tailwind, no Chakra)
- All styling in inline styles or plain CSS

## Backend Rules
- All routes go in main.py
- Models in models.py, schemas in schemas.py
- Never hardcode credentials — always use .env
- Every protected route must use Depends(get_current_user)
- Return proper HTTP status codes (400, 401, 404, not just 200)

## Frontend Rules
- API calls go in services/api.js only — never fetch inside components
- Pages go in src/pages/, reusable UI in src/components/
- Never use localStorage for anything except the JWT token
- Always handle loading and error states in every page

## Database Rules
- Never drop tables in production
- All schema changes via SQLAlchemy models — not raw SQL
- The DB name is commuteconnect

## Zones (Hyderabad)
Valid pickup zones used in matching:
Banjara Hills, Jubilee Hills, Madhapur,
Hitech City, Kondapur, Gachibowli,
Film Nagar, Somajiguda

## AI Suggestions
- AI endpoint is GET /ai/suggest
- Uses Claude API via ai_suggestions.py
- Must include user zone, preferred time, savings so far
- Response is a single natural language string (max 2 sentences)

## What NOT to do
- Do not install new pip packages without updating requirements.txt
- Do not add new npm packages without updating package.json
- Do not push to main directly — always go through dev
- Do not expose the SECRET_KEY or DATABASE_URL in any file