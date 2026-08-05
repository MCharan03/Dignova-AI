import asyncio
import os
from app.utils.email_utils import send_welcome_email

async def main():
    test_email = os.getenv("TEST_EMAIL", "testuser@gmail.com")
    print(f"\n--- Dignova SMTP Diagnostic Tool ---")
    print(f"Target Email: {test_email}")
    print(f"SIMULATE_EMAIL: {os.getenv('SIMULATE_EMAIL', 'False')}")
    print(f"MAIL_SERVER: {os.getenv('MAIL_SERVER', 'smtp.gmail.com')}")
    print(f"MAIL_PORT: {os.getenv('MAIL_PORT', '465')}")
    print(f"-------------------------------------\n")
    
    print("Attempting to send branded welcome email via SMTP...")
    await send_welcome_email(
        to=test_email,
        user_name="Test User",
        verify_url="https://dignova.ai/verify-test",
        role="user"
    )
    
    print("\nCheck your console logs for 'SMTP SUCCESS' or 'SMTP SIMULATION'.")
    print("Note: If it hangs or times out, Render is likely blocking Port 587.")
    print("Wait 5 seconds for the async task to complete...")
    await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
