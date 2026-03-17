from pydantic import BaseModel
from datetime import datetime

class BookingBase(BaseModel):
    call_id: int
    resource_type: str
    status: str = "pending"

class Booking(BaseModel):
    booking_id: int
    call_id: int
    resource_type: str
    status: str
    allotted_time: datetime
    class Config:
        from_attributes = True
