import urllib.request
import json

url = "https://openrouter.ai/api/v1/models"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    ids = [m["id"] for m in data["data"]]
    print("OpenAI models:", [i for i in ids if "openai" in i and ("gpt" in i or "astra" in i or "o3" in i or "o4" in i)])
