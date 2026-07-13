import struct
import math

def calculate_rms(pcm_data: bytes) -> float:
    """
    Calculate the Root Mean Square (RMS) of 16-bit PCM audio bytes to determine voice activity.
    Provides a fast, pure-python implementation compatible with Python 3.11 and 3.13+.
    """
    if not pcm_data:
        return 0.0
    count = len(pcm_data) // 2
    if count == 0:
        return 0.0
    try:
        shorts = struct.unpack(f"<{count}h", pcm_data[:count * 2])
        sum_squares = sum(s * s for s in shorts)
        return math.sqrt(sum_squares / count)
    except Exception:
        return 0.0
