from sqlalchemy import Column, Integer, String
from database import Base

# User ORM model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# Coding session ORM model
class CodeSession(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    owner = Column(String)
