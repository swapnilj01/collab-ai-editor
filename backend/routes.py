from fastapi import APIRouter, HTTPException, Depends, Request
from database import mongo_db, redis_client
from helper import call_gemini_api
from auth import create_token, get_current_user, get_optional_user
from schemas import UserCreate, SessionCreate, SuggestionRequest, SaveSessionRequest
from fastapi.security import OAuth2PasswordRequestForm
import uuid
from passlib.context import CryptContext
import logging
from typing import Optional
logging.basicConfig(level=logging.INFO)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/signup")
async def signup(user: UserCreate):
    existing = await mongo_db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = pwd_context.hash(user.password)
    await mongo_db.users.insert_one({"username": user.username, "password": hashed})
    return {"message": "User created"}

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await mongo_db.users.find_one({"username": form_data.username})
    if not user or not pwd_context.verify(form_data.password, user['password']):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = await create_token({"sub": user['username']})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/create_session")
async def create_session(session: SessionCreate, username: str = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    await mongo_db.sessions.insert_one({
        "_id": session_id,
        "name": session.name,
        "owner": username,
        "code": ""  # start with empty
    })
    redis_client.set(session_id, "")
    return {"session_id": session_id}

@router.post("/suggest")
async def suggest_code(request: SuggestionRequest,username: Optional[str] = Depends(get_optional_user)):
    session_id = request.session_id

    code = redis_client.get(f"code:{session_id}")

    if not code:
        session = await mongo_db.sessions.find_one({"_id": session_id})
        if session.get("owner") != username and username is not None:
            raise HTTPException(status_code=403, detail="Unauthorized to view this session")
        code = session.get("code", "")

    if not code:
        raise HTTPException(status_code=404, detail="No code found for session")

    # Step 3: Call Gemini API (replace with real logic)
    logging.info(f"Generating suggestions for session {session_id}")
    
    # Example Gemini logic (mocked)
    suggestions = [
        {"line": 0, "text": "Start by defining a function", "type": "info"},
        {"line": 3, "text": "Consider renaming variable for clarity", "type": "warning"},
    ]

    gemini_suggestions = call_gemini_api(code)
    logging.info(f"Received suggestions {gemini_suggestions} for code {code}")

    return {"suggestions": gemini_suggestions}


@router.post("/save_session")
async def save_session(request: SaveSessionRequest, username: str = Depends(get_current_user)):
    session_id = request.session_id
    code = redis_client.get(f"code:{session_id}")
    if not code:
        return {"message": "No code found in Redis"}

    await mongo_db.sessions.update_one({"_id": session_id}, {"$set": {"code": code}})
    return {"message": "Session manually saved"}

@router.get("/sessions")
async def get_user_sessions(username: str = Depends(get_current_user)):
    sessions = await mongo_db.sessions.find({"owner": username}).to_list(length=100)
    return sessions

@router.get("/sessions/{session_id}")
async def get_session_code(
    session_id: str,
    username: Optional[str] = Depends(get_optional_user)
):
    redis_code = redis_client.get(f"code:{session_id}")
    if redis_code is not None:
        return {"code": redis_code}

    session = await mongo_db.sessions.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if username is None or username == session["owner"]:
        return {"code": session.get("code", "")}

    raise HTTPException(status_code=403, detail="Access denied to this session")


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, username: str = Depends(get_current_user)):
    session = await mongo_db.sessions.find_one({"_id": session_id})
    if not session or session["owner"] != username:
        raise HTTPException(status_code=403, detail="Not allowed to delete this session")

    # Delete from Mongo
    await mongo_db.sessions.delete_one({"_id": session_id})

    # Also delete from Redis if still active
    redis_client.delete(session_id)

    return {"message": "Session deleted"}
