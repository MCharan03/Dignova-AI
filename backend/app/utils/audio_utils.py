import base64
import io
from pydub import AudioSegment

def audio_to_pcm(base64_payload: str, format: str = "webm") -> bytes:
    """
    Decodes base64 audio and converts it to raw PCM (16kHz, 16-bit, mono).
    Used for in-app calling audio processing.
    """
    audio_data = base64.b64decode(base64_payload)
    buffer = io.BytesIO(audio_data)
    
    # Browsers often send webm/opus. Pydub can convert this.
    try:
        audio = AudioSegment.from_file(buffer, format=format)
    except:
        # Fallback to general detection if format fails
        audio = AudioSegment.from_file(buffer)
        
    # Standardize to 16kHz, 16-bit, Mono for Gemini
    audio = audio.set_frame_rate(16000).set_sample_width(2).set_channels(1)
    
    return audio.raw_data

def pcm_to_audio(pcm_bytes: bytes, format: str = "wav") -> str:
    """
    Converts raw PCM (16kHz, 16-bit, mono) to a web-friendly format.
    Returns base64 encoded audio string.
    """
    audio = AudioSegment(
        data=pcm_bytes,
        sample_width=2,
        frame_rate=16000,
        channels=1
    )
    
    out = io.BytesIO()
    audio.export(out, format=format)
    
    return base64.b64encode(out.getvalue()).decode("utf-8")
