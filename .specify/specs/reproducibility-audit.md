# Reproducibility Audit

## Goal
Ensure any developer can clone and run RideSync from scratch
in under 15 minutes.

## Environment Requirements

Tool    | Version | Notes
--------|---------|---------------------------
Python  | 3.11.x  | 3.14 has compatibility issues
Node.js | 18+     | For Vite and React
MySQL   | 8.0+    | Local install required
npm     | 9+      | Comes with Node
Git     | Any     | For version control

## Setup Steps

### 1. Clone
git clone <repo-url>
cd ridesync

### 2. MySQL
CREATE DATABASE ridesync;

### 3. Backend
cd backend
Create .env file with:
DATABASE_URL=mysql+pymysql://root:root@localhost:3306/ridesync
SECRET_KEY=anyrandomsecret123

py -3.11 -m pip install -r requirements.txt
py -3.11 -m uvicorn main:app --reload

### 4. Frontend
cd frontend
npm install
npm run dev

### 5. Verify
Backend API docs: http://127.0.0.1:8000/docs
Frontend app:    http://localhost:5173

## Known Issues

Issue                        | Fix
-----------------------------|----------------------------------------
uvicorn not recognized       | Use py -3.11 -m uvicorn
requirements.txt not found   | Check extension is .txt not .text
MySQL access denied          | Check password in .env
package.json not found       | Must be in frontend/ not backend/

## Environment Variables

backend/.env must contain:
DATABASE_URL=mysql+pymysql://root:root@localhost:3306/ridesync
SECRET_KEY=your-random-secret-here

## Files That Must Exist Before Running
- backend/.env
- backend/requirements.txt
- frontend/package.json
- frontend/vite.config.js
- frontend/index.html
- frontend/src/main.jsx