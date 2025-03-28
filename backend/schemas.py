from pydantic import BaseModel

# User registration
class UserCreate(BaseModel):
    username: str
    password: str

# User token
class Token(BaseModel):
    access_token: str
    token_type: str

# Coding session
class SessionCreate(BaseModel):
    name: str

# Code suggestion request
class SuggestionRequest(BaseModel):
    session_id: str
    code: str

class SaveSessionRequest(BaseModel):
    session_id: str