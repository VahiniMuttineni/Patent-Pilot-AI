import logging
import time
import httpx
from typing import Dict, Any, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

class OllamaService:
    """
    Dedicated Ollama client handling API comms, retries, timeouts, and metrics.
    """
    
    def __init__(self):
        self.base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.model_name = getattr(settings, "OLLAMA_MODEL", "llama3")

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
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=180.0) as client:
                    response = await client.post(
                        f"{self.base_url}/api/generate",
                        json={
                            "model": self.model_name,
                            "prompt": prompt,
                            "format": "json",
                            "stream": False
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                metrics["latency_ms"] = (time.time() - start_time) * 1000
                metrics["retries"] = attempt
                metrics["input_tokens"] = data.get("prompt_eval_count", 0)
                metrics["output_tokens"] = data.get("eval_count", 0)
                
                return data.get("response", "{}"), metrics
                
            except Exception as e:
                logger.error(f"Ollama API Error on attempt {attempt+1}: {e}")
                last_exception = e
                import asyncio
                await asyncio.sleep(2 ** attempt) # Exponential backoff
                
        metrics["latency_ms"] = (time.time() - start_time) * 1000
        metrics["retries"] = max_retries
        raise RuntimeError(f"Ollama API failed after {max_retries} attempts. Last error: {last_exception}")
