import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# The ENCRYPTION_KEY should be a base64-encoded 32-byte key.
# If not found, we use a fallback (FOR DEVELOPMENT ONLY)
# In production, this MUST be a strong, persistent key.
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "7S6p_Iq7-Y-E3eKk_Xq-D9j-o3R-T2w-L1p-Q0x-S4m=")

_fernet = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def encrypt_data(plain_text: str) -> str:
    """
    Encrypts a string using AES-128 (Fernet).
    Returns the base64-encoded ciphertext.
    """
    if not plain_text:
        return plain_text
    return _fernet.encrypt(plain_text.encode()).decode()

def decrypt_data(cipher_text: str) -> str:
    """
    Decrypts a Fernet ciphertext.
    Returns the original plaintext.
    """
    if not cipher_text:
        return cipher_text
    try:
        # Fernet tokens are usually at least 100+ chars and start with 'gAAAA'
        if isinstance(cipher_text, str) and cipher_text.startswith("gAAAA"):
            return _fernet.decrypt(cipher_text.encode()).decode()
        return cipher_text # Likely plaintext
    except Exception as e:
        # Only log if it really looked like a token
        if isinstance(cipher_text, str) and cipher_text.startswith("gAAAA"):
            print(f"Decryption error [{cipher_text[:16]}...]: {e}")
        return cipher_text # Fallback to original
