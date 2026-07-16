import asyncio
import httpx
from app.core.config import settings

async def main():
    api_key = settings.GROQ_API_KEY
    if not api_key:
        print("NO API KEY SET")
        return

    payload = {
        "model": "llama3-70b-8192",
        "messages": [
            {"role": "user", "content": "Return a JSON object."}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload
            )
            print("Status:", resp.status_code)
            print("Body:", resp.text)
        except Exception as e:
            print(e)

if __name__ == "__main__":
    asyncio.run(main())
