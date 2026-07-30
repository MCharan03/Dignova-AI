import httpx
import json
from typing import Generator

def process_ollama_stream(
    base_url: str,
    model: str,
    system_instruction: str,
    prompt: str,
    is_voice: bool = True
) -> Generator[str, None, None]:
    """
    Streams a response from the local Ollama agent.
    Injects a strict brevity constraint for voice to drastically reduce latency and prevent stage directions.
    """
    
    sys_instruction = system_instruction
    if is_voice:
        # Force the local agent to be extremely brief to cut down latency for voice.
        brevity_constraint = (
            "\n\nCRITICAL HARD CONSTRAINT FOR LOCAL INFERENCE:\n"
            "You are running on limited local compute. "
            "Keep your response EXTREMELY brief. 1-2 short sentences maximum. "
            "Get straight to the point. NEVER use brackets, stage directions, or actions like [waiting for patient's response]. "
            "Speak naturally but as quickly and concisely as possible."
        )
        sys_instruction += brevity_constraint
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_instruction},
            {"role": "user", "content": prompt}
        ],
        "stream": True
    }
    
    with httpx.Client(timeout=120.0) as http_client:
        with http_client.stream(
            "POST",
            f"{base_url}/v1/chat/completions",
            json=payload
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_data = json.loads(data_str)
                        content = chunk_data["choices"][0]["delta"].get("content", "")
                        if content:
                            yield content
                    except Exception:
                        pass
