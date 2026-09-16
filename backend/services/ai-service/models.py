from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class Message(BaseModel):
    role: str = Field(..., description="Role of the sender (user, assistant, system)")
    content: str = Field(..., description="Content of the message")

class CoachRequest(BaseModel):
    history: List[Message]
    question_context: str

class QuestionConstraint(BaseModel):
    difficulty: str
    topic: str
    pattern: Optional[str] = None

class GeneratedQuestion(BaseModel):
    title: str
    description: str
    difficulty: str
    examples: List[Dict[str, str]]
    constraints: List[str]
    starterCode: Dict[str, str]

class ValidationRequest(BaseModel):
    code: str
    language: str
    question_context: str
