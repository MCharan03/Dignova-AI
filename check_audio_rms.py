from pydub import AudioSegment
import struct
import math

def calculate_rms(pcm_data: bytes) -> float:
    if not pcm_data:
        return 0.0
    count = len(pcm_data) // 2
    if count == 0:
        return 0.0
    format_str = f"<{count}h"
    try:
        shorts = struct.unpack(format_str, pcm_data)
    except Exception:
        return 0.0
    sum_squares = sum(s * s for s in shorts)
    return math.sqrt(sum_squares / count)

audio = AudioSegment.from_file("D:\\Gemini\\Dignova-AI\\hello_cold.wav")
audio = audio.set_frame_rate(16000).set_sample_width(2).set_channels(1)
pcm = audio.raw_data

print("Total PCM length:", len(pcm))
# Print RMS of chunks
chunk_size = 4000
for i in range(0, len(pcm), chunk_size):
    chunk = pcm[i:i+chunk_size]
    rms = calculate_rms(chunk)
    print(f"Chunk {i//chunk_size}: RMS = {rms:.2f}")
