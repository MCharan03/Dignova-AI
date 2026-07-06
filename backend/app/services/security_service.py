import re
from datetime import datetime, timedelta, timezone
from typing import Set, Dict
from fastapi import Request, HTTPException

# Jailed IP store: IP -> jail_expiry_time
_jailed_ips: Dict[str, datetime] = {}

# Intrusion Detection Signatures (Regexes)
SIGNATURES = {
    "sql_injection": re.compile(
        r"(\b(SELECT|INSERT|UPDATE|DELETE|UNION|DROP|ALTER|LIMIT)\b)|([\';\"#])|(--)",
        re.IGNORECASE
    ),
    "path_traversal": re.compile(
        r"(\.\./)|(\.\.\\)|(/etc/passwd)|(boot\.ini)|(win\.ini)",
        re.IGNORECASE
    ),
    "cross_site_scripting": re.compile(
        r"(<script>)|(javascript:)|(onerror=)|(onload=)|(<iframe)",
        re.IGNORECASE
    )
}

class SecurityShieldService:
    @staticmethod
    def jail_ip(ip_address: str, minutes: int = 10):
        expiry = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        _jailed_ips[ip_address] = expiry
        print(f"[SECURITY ALERT] Jailed IP: {ip_address} until {expiry}")

    @staticmethod
    def is_ip_jailed(ip_address: str) -> bool:
        if ip_address in _jailed_ips:
            expiry = _jailed_ips[ip_address]
            now = datetime.now(timezone.utc)
            # Support both naive and aware datetimes stored
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if now < expiry:
                return True
            else:
                del _jailed_ips[ip_address]  # Expired
        return False

    @classmethod
    def scan_string(cls, content: str) -> bool:
        """Scan a single string for security violations. Returns True if malicious."""
        if not content:
            return False
        import urllib.parse
        decoded_content = urllib.parse.unquote(content)
        for attack_type, pattern in SIGNATURES.items():
            if pattern.search(decoded_content):
                print(f"[SECURITY SHIELD DETECTED] Signature match: {attack_type} in '{decoded_content[:100]}'")
                return True
        return False

    @classmethod
    async def enforce_shield(cls, request: Request):
        """Enforces IP check and payload intrusion inspection."""
        ip = request.client.host if request.client else "unknown"
        
        # 1. Check if IP is jailed
        if cls.is_ip_jailed(ip):
            raise HTTPException(
                status_code=403,
                detail="Access Denied: Your IP has been temporarily blacklisted due to security policy violations."
            )

        # 2. Inspect Query Parameters
        query_params = str(request.query_params)
        if cls.scan_string(query_params):
            cls.jail_ip(ip)
            raise HTTPException(status_code=400, detail="Security Exception: Malicious query syntax detected.")

        # 3. Inspect Headers (specifically User-Agent and Authorization)
        user_agent = request.headers.get("User-Agent", "")
        if cls.scan_string(user_agent):
            cls.jail_ip(ip)
            raise HTTPException(status_code=400, detail="Security Exception: Invalid User-Agent header.")
