import urllib.request
import json

url = "https://openrouter.ai/api/v1/models"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        ids = [m["id"] for m in data["data"]]
        print("Total models:", len(ids))
        print("Gemini models:", [i for i in ids if "gemini" in i])
        print("Claude models:", [i for i in ids if "claude" in i and ("3-7" in i or "3.7" in i or "3-5" in i or "3.5" in i)])
        print("Deepseek models:", [i for i in ids if "deepseek" in i and ("r1" in i or "chat" in i or "v3" in i)])
        print("OpenAI o3/gpt-4o:", [i for i in ids if "openai" in i and ("o3" in i or "gpt-4o" in i)])
except Exception as e:
    print("Error:", e)
