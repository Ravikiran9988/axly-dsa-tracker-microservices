import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Very basic LLM Provider abstraction with fallback
class LLMProviderError(Exception):
    pass

class RateLimitError(LLMProviderError):
    pass

class LLMProvider:
    def __init__(self):
        # We assume standard OpenAI-compatible endpoints
        self.primary_api_key = os.getenv("OPENAI_API_KEY", "dummy_openai_key")
        self.primary_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        
        self.fallback_api_key = os.getenv("ANTHROPIC_API_KEY", "dummy_anthropic_key")
        self.fallback_base_url = os.getenv("FALLBACK_BASE_URL", "https://api.anthropic.com/v1")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, RateLimitError))
    )
    async def _call_provider(self, base_url: str, api_key: str, payload: dict) -> str:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Mocking the actual call for MVP since we don't have real keys
            if api_key.startswith("dummy"):
                logger.info(f"Mocking LLM call to {base_url}")
                return "This is a mocked AI response. Provide real API keys to connect to an LLM."
                
            response = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
            
            if response.status_code == 429:
                raise RateLimitError("Rate limit exceeded")
                
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def generate_response(self, prompt: str, system_message: str = "") -> str:
        payload = {
            "model": "gpt-4-turbo",
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ]
        }

        try:
            # Try primary
            return await self._call_provider(self.primary_base_url, self.primary_api_key, payload)
        except Exception as e:
            logger.warning(f"Primary LLM failed: {e}. Attempting fallback...")
            try:
                # Naive fallback routing
                payload["model"] = "claude-3-opus-20240229" # Example fallback model mapping
                return await self._call_provider(self.fallback_base_url, self.fallback_api_key, payload)
            except Exception as fallback_err:
                logger.error(f"Fallback LLM also failed: {fallback_err}")
                raise LLMProviderError("All LLM providers failed to generate a response.")
