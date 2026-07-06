import os
import asyncio
import re
from typing import AsyncGenerator
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class TTSService:
    """
    OpenAI-powered Streaming TTS Service for Dignova AI.
    Provides low-latency audio generation for the Sentient Voice Agent.
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
        self.voice = "nova"  # Options: alloy, echo, fable, onyx, nova, shimmer
        self.model = "tts-1" # tts-1 is faster (low latency), tts-1-hd is higher quality

    async def stream_speech(self, text_stream: AsyncGenerator[str, None]) -> AsyncGenerator[bytes, None]:
        """
        Consumes a text stream from an LLM and yields audio bytes (MP3) in real-time.
        Chunks text into sentences to minimize time-to-first-byte (TTFB).
        """
        if not self.client:
            print("[TTSService] OpenAI API Key missing. Skipping TTS.")
            return

        buffer = ""
        # Sentence enders for chunking
        sentence_enders = re.compile(r'([.!?\n])')

        async for chunk in text_stream:
            buffer += chunk
            
            # Find the last sentence ender in the buffer
            parts = sentence_enders.split(buffer)
            
            # If we found at least one complete sentence
            if len(parts) > 2:
                # Reconstruct completed sentences
                to_speak = ""
                # parts[0] is text, parts[1] is delimiter, parts[2] is text, etc.
                # we join pairs (text + delimiter)
                while len(parts) > 2:
                    to_speak += parts.pop(0) + parts.pop(0)
                
                # Remaining text goes back to buffer
                buffer = "".join(parts)
                
                if to_speak.strip():
                    async with self.client.audio.speech.with_streaming_response.create(
                        model=self.model,
                        voice=self.voice,
                        input=to_speak.strip(),
                        response_format="mp3"
                    ) as response:
                        async for audio_chunk in response.iter_bytes():
                            yield audio_chunk

        # Speak anything left in the buffer at the end
        if buffer.strip() and self.client:
            async with self.client.audio.speech.with_streaming_response.create(
                model=self.model,
                voice=self.voice,
                input=buffer.strip(),
                response_format="mp3"
            ) as response:
                async for audio_chunk in response.iter_bytes():
                    yield audio_chunk

    async def generate_speech_file(self, text: str, filename: str) -> str:
        """
        Generates a static MP3 file from text.
        Used for Telegram voice notes and other non-streaming needs.
        Returns the public URL path.
        """
        if not self.client:
            return ""

        static_dir = os.path.join("app", "static", "audio")
        os.makedirs(static_dir, exist_ok=True)
        file_path = os.path.join(static_dir, filename)

        try:
            response = await self.client.audio.speech.create(
                model=self.model,
                voice=self.voice,
                input=text
            )
            response.write_to_file(file_path)
            return f"/static/audio/{filename}"
        except Exception as e:
            print(f"[TTSService] File generation error: {e}")
            return ""

# Singleton instance
tts_service = TTSService()
