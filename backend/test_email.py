import asyncio
import os
from app.utils.email_utils import send_welcome_email

async def main():
    test_email = input("Enter email address to send test to: ")
    print(f"\n--- Dignova Email Diagnostic ---")
    print(f"SIMULATE_EMAIL: {os.getenv('SIMULATE_EMAIL', 'False')}")
    print(f"RESEND_API_KEY present: {bool(os.getenv('RESEND_API_KEY'))}")
    print(f"MAIL_USERNAME: {os.getenv('MAIL_USERNAME')}")
    print(f"----------------------------------\n")
    
    print("Attempting to send branded welcome email...")
    send_welcome_email(
        to=test_email,
        user_name="Test User",
        verify_url="https://dignova.ai/verify-test",
        role="user"
    )
    
    print("\nCheck your console logs for 'RESEND SUCCESS' or 'SMTP SUCCESS'.")
    print("Note: This is an async fire-and-forget task. Wait a few seconds.")
    await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
