from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class CallBase(BaseModel):
    user_id: Optional[int] = None
    diagnosis_given: Optional[str] = None
    transcript: Optional[str] = None
    correctness: Optional[int] = None

class Call(CallBase):
    model_config = ConfigDict(from_attributes=True)
    call_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    state: str
    severity: str = "UNKNOWN"

class CallStartRequest(BaseModel):
    user_id: int

class CallUpdateRequest(BaseModel):
    diagnosis_given: Optional[str] = None
    transcript: Optional[str] = None
    end_time: Optional[datetime] = None
    correctness: Optional[int] = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    diagnosis_triggered: bool = False

class DiagnosisSubmitRequest(BaseModel):
    diagnosis_given: str
    resource_type: Optional[str] = None
