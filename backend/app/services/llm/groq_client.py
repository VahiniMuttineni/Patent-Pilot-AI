import logging
import time
import httpx
from typing import Dict, Any, Tuple
from app.core.config import settings
import asyncio

logger = logging.getLogger(__name__)

class GroqService:
    """
    Dedicated Groq client handling API comms, retries, timeouts, and metrics.
    """
    
    def __init__(self):
        self.api_key = getattr(settings, "GROQ_API_KEY", "mock-groq-key")
        self.model_name = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_content_json(self, prompt: str, schema: Any = None) -> Tuple[str, Dict[str, Any]]:
        """
        Generate content expecting JSON, with retry logic and telemetry.
        """
        metrics = {
            "model": self.model_name,
            "latency_ms": 0,
            "retries": 0,
            "input_tokens": 0,
            "output_tokens": 0,
        }
        
        start_time = time.time()
        max_retries = 2
        last_exception = None
        
        # Mock mode if no key is provided
        if not self.api_key or self.api_key == "mock-groq-key":
            await asyncio.sleep(0.1)
            metrics["latency_ms"] = (time.time() - start_time) * 1000
            return "{}", metrics
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        self.base_url,
                        headers=headers,
                        json=payload
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                metrics["latency_ms"] = (time.time() - start_time) * 1000
                metrics["retries"] = attempt
                
                usage = data.get("usage", {})
                metrics["input_tokens"] = usage.get("prompt_tokens", 0)
                metrics["output_tokens"] = usage.get("completion_tokens", 0)
                
                content = data["choices"][0]["message"]["content"]
                return content, metrics
                
            except Exception as e:
                error_body = ""
                if hasattr(e, 'response') and hasattr(e.response, 'text'):
                    error_body = e.response.text
                logger.error(f"Groq API Error on attempt {attempt+1}: {e} - {error_body}")
                last_exception = e
                await asyncio.sleep(2 ** attempt)
                
        metrics["latency_ms"] = (time.time() - start_time) * 1000
        metrics["retries"] = max_retries
        raise RuntimeError(f"Groq API failed after {max_retries} attempts. Last error: {last_exception}")
