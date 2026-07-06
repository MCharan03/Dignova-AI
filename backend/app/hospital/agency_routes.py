from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from ..services.agency_service import stream_agency_events

router = APIRouter(prefix="/agency", tags=["Agency"])

@router.get("/stream")
async def agency_stream():
    """
    Real-time SSE stream of Agency Events for the dashboard.
    """
    return StreamingResponse(
        stream_agency_events(),
        media_type="text/event-stream"
    )
