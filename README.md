# RideSync 🚗

> Smart office carpooling — match, ride, save.

RideSync is an internal carpooling platform that matches employees
by zone and schedule, reducing commute costs and carbon emissions.

## Features
- Smart ride matching by zone + time (scored 0–100)
- Post and join rides in seconds
- Savings tracker (₹ saved vs solo cab)
- CO₂ avoided counter
- AI-powered personalized ride suggestions
- Ride history and recurring ride support

## Tech Stack
- **Frontend:** React 18, Vite
- **Backend:** FastAPI, Python 3.11
- **Database:** MySQL 8
- **Auth:** JWT
- **AI:** Claude API (Anthropic)

## Quick Start

### Prerequisites
- Python 3.11
- Node.js 18+
- MySQL 8

### Backend
```bash
cd backend
# create .env (see .env.example)
py -3.11 -m pip install -r requirements.txt
py -3.11 -m uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### URLs
- App: 
- API docs: 

## Project Structure