##  Tiger Code Editor — Collaborative GenAI Code Platform

Tiger Code Editor is a real-time collaborative code editor built with FastAPI, MongoDB, Redis, React, and Monaco Editor. It supports both authenticated and anonymous users, live multi-user editing with cursor/selection visibility, and AI-powered suggestions via Google Gemini API.



## Features

- User authentication (signup/login)
- Anonymous session joining via shareable link
- Real-time collaboration (cursors + selection highlight)
- AI code suggestions (via Gemini API)
- Redis-based in-memory code store for active sessions
- Automatic sync to MongoDB when sessions end or are saved

---

## Tech Stack

| Layer        | Stack                           |
|--------------|----------------------------------|
| Frontend     | React + Chakra UI + Monaco Editor |
| Backend      | FastAPI (Python)                 |
| Database     | MongoDB (persistent session data) |
| Cache Store  | Redis (live session code + cursor) |
| Realtime     | WebSockets                       |
| AI Assistant | Google Gemini API(Gemini Flash 2.0)|
| Auth         | JWT                              |

---

##  Low-Level System Design

### Components Overview

```
+---------------------------+
|         Frontend         |
| React + Monaco + Chakra  |
+------------+--------------+
             |
             | REST / WebSocket
             ▼
+---------------------------+
|         Backend           |
| FastAPI + JWT + Gemini    |
+------------+--------------+
     | MongoDB      | Redis
     ▼              ▼
+----------+   +------------+
| Sessions |   | Code Cache |
| Users    |   | Cursors    |
+----------+   +------------+
```

---

##  Data Models

###  User (MongoDB)
```json
{
  "username": "john_doe",
  "password": "<hashed_password>"
}
```

###  Session (MongoDB)
```json
{
  "_id": "uuid-session-id",
  "name": "Demo Project",
  "owner": "john_doe",
  "code": "final saved code"
}
```

###  Redis Keys

- `code:<session_id>` → Latest code for session
- `collab:<session_id>` → Hash of all active user states:
```json
{
  "<user_id>": {
    "name": "John",
    "cursor": { "line": 3, "column": 5 },
    "selection": {
      "startLine": 3, "startColumn": 2,
      "endLine": 4, "endColumn": 10
    }
  }
}
```

---

##  Setup Instructions (Docker)

### 1. Clone the Repo
```bash
git clone https://github.com/swapnilj01/genai-collab-editor.git
cd genai-collab-editor
```

### 2. Environment Variables

Create a `.env` file in `backend/`:

```
MONGO_URI=mongodb://mongo:27017
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

---

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

This will spin up:
- `frontend`: React dev server
- `backend`: FastAPI app on `localhost:8000`
- `mongo`: MongoDB
- `redis`: Redis store

---

### 4. Open the App

Frontend:
```
http://localhost:3000
```

Backend (API/docs):
```
http://localhost:8000/docs
```

---

##  Gemini AI Prompt Format

Tiger Code Editor sends the following prompt to Gemini:

```
You are a helpful AI code reviewer.

Analyze this code and return suggestions in this JSON format:
[
  {
    "line": 2,
    "text": "Use 'with' statement",
    "type": "info"
  }
]
Here is the code:
"""
<code>
"""
```

---

##  Folder Structure

```
.
├── backend/
│   ├── main.py
│   ├── routes.py
│   ├── websocket.py
│   ├── schemas.py
│   ├── auth.py
│   ├── database.py
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── pages/Editor.js
│   │   ├── components/ui/Navbar.js
│   │   └── ...
├── docker-compose.yml
```

---

##  Authentication

- JWT stored in localStorage
- Anonymous users prompted for name on join
- Token sent via Bearer header in protected API routes

---

##  Scripts

```bash
# Run FastAPI manually (without docker)
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Run React frontend
cd frontend
npm install
npm start
```
