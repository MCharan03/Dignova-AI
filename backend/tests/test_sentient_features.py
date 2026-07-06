import pytest
import asyncio
import httpx
from app.main import app
from app.extensions import AsyncSessionLocal
from app.models import User, TelemetrySession, AgencyTask
from app.services.security_service import _jailed_ips
from sqlalchemy import select, delete, update

@pytest.fixture(autouse=True)
def clear_security_jail():
    """Clear jailed IPs blacklist before and after each test to ensure test isolation."""
    _jailed_ips.clear()
    yield
    _jailed_ips.clear()

@pytest.mark.asyncio
async def test_telemetry_flow():
    """Test logging telemetry and verifying stress calculation."""
    email = "telemetry_test@dignova.com"
    
    # Strict isolation cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User).where(User.email == email))
        await db.execute(delete(TelemetrySession))
        await db.commit()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        reg_payload = {
            "email": email,
            "password": "Password123!",
            "name": "Telemetry Tester",
            "phone_number": "+1234567890",
            "role": "user"
        }
        reg_res = await ac.post("/api/auth/register", json=reg_payload)
        assert reg_res.status_code == 200
        
        # Verify user directly in database to bypass email verification
        async with AsyncSessionLocal() as db:
            await db.execute(update(User).where(User.email == email).values(is_verified=True))
            await db.commit()
        
        # Login
        login_res = await ac.post("/api/auth/login", data={
            "username": email,
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Post telemetry log
        log_payload = {
            "wpm": 75.0,
            "avg_hold_time": 120.0,
            "avg_flight_time": 250.0,
            "backspace_ratio": 0.15
        }
        res = await ac.post("/api/telemetry/log", json=log_payload, headers=headers)
        assert res.status_code == 200
        res_data = res.json()
        assert "stress_score" in res_data
        
        # Cleanup test user & telemetry session
        async with AsyncSessionLocal() as db:
            await db.execute(delete(TelemetrySession))
            await db.execute(delete(User).where(User.email == email))
            await db.commit()

@pytest.mark.asyncio
async def test_passive_awareness_routes():
    """Test GET context and POST trigger for screen awareness."""
    email = "awareness_test@dignova.com"
    
    # Strict isolation cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User).where(User.email == email))
        await db.commit()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        reg_payload = {
            "email": email,
            "password": "Password123!",
            "name": "Awareness Tester",
            "phone_number": "+1234567890",
            "role": "user"
        }
        reg_res = await ac.post("/api/auth/register", json=reg_payload)
        assert reg_res.status_code == 200
        
        # Verify user directly in database to bypass email verification
        async with AsyncSessionLocal() as db:
            await db.execute(update(User).where(User.email == email).values(is_verified=True))
            await db.commit()
            
        login_res = await ac.post("/api/auth/login", data={
            "username": email,
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test context endpoint
        res = await ac.get("/api/awareness/context", headers=headers)
        assert res.status_code == 200
        assert "active_patient" in res.json()

        # Test trigger scan endpoint
        trigger_res = await ac.post("/api/awareness/trigger", headers=headers)
        assert trigger_res.status_code == 200
        assert trigger_res.json()["status"] == "scan_initiated"

        # Cleanup
        async with AsyncSessionLocal() as db:
            await db.execute(delete(User).where(User.email == email))
            await db.commit()

@pytest.mark.asyncio
async def test_ghost_agency_queue():
    """Test background task creation and scheduling."""
    email = "agency_test@dignova.com"
    
    # Strict isolation cleanup
    async with AsyncSessionLocal() as db:
        await db.execute(delete(User).where(User.email == email))
        await db.execute(delete(AgencyTask))
        await db.commit()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        reg_payload = {
            "email": email,
            "password": "Password123!",
            "name": "Agency Tester",
            "phone_number": "+1234567890",
            "role": "user"
        }
        reg_res = await ac.post("/api/auth/register", json=reg_payload)
        assert reg_res.status_code == 200
        
        # Verify user directly in database to bypass email verification
        async with AsyncSessionLocal() as db:
            await db.execute(update(User).where(User.email == email).values(is_verified=True))
            await db.commit()
            
        login_res = await ac.post("/api/auth/login", data={
            "username": email,
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create background task
        task_payload = {
            "title": "Audit Database Integrity",
            "description": "Scan clinical core records for anomalies."
        }
        res = await ac.post("/api/agency/tasks/create", json=task_payload, headers=headers)
        assert res.status_code == 200
        task_id = res.json()["id"]

        # Verify task is created in list
        list_res = await ac.get("/api/agency/tasks", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) > 0
        assert any(t["id"] == task_id for t in list_res.json())

        # Cleanup
        async with AsyncSessionLocal() as db:
            await db.execute(delete(AgencyTask).where(AgencyTask.id == task_id))
            await db.execute(delete(User).where(User.email == email))
            await db.commit()

@pytest.mark.asyncio
async def test_security_intrusion_prevention():
    """Test Intrusion Detection System (IDS) blocking malicious injections."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Send query containing SQL injection signature
        res = await ac.get("/api/auth/me?param=UNION+SELECT+*+FROM+users")
        # Should be blocked by security middleware (status code 400 - Malicious syntax)
        assert res.status_code == 400
        assert "Security Exception" in res.json()["detail"]

        # Clear jail so we can test the next signature from the same IP
        _jailed_ips.clear()

        # 2. Send query containing Path Traversal signature
        res_traversal = await ac.get("/api/auth/me?file=../../etc/passwd")
        assert res_traversal.status_code == 400

if __name__ == "__main__":
    import sys
    sys.exit(pytest.main(["-v", __file__]))
