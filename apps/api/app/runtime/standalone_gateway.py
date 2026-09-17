import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("OPENCLAW_PORT", 8080))
    uvicorn.run("app.runtime.gateway:gateway_app", host="0.0.0.0", port=port, reload=False)
