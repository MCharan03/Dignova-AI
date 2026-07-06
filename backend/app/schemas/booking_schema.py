from pydantic import BaseModel, ConfigDict
from datetime import datetime

class BookingBase(BaseModel):
    call_id: int
    resource_type: str
    status: str = "pending"

class Booking(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    booking_id: int
    call_id: int
    resource_type: str
    status: str
    allotted_time: datetime
