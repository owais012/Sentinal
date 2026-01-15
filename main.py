from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Check if we're in mock mode
USE_MOCK = os.getenv("USE_MOCK", "false").lower() == "true"

# Set GOOGLE_API_KEY if needed
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")

if USE_MOCK:
    print("⚠️  MOCK MODE ENABLED - Using offline implementations")
    # Use mock implementations
    from app.graph_mock import app as agent_app
else:
    llm_provider = os.getenv("LLM_PROVIDER", "gemini").upper()
    print(f"✅ PRODUCTION MODE - Using {llm_provider} LLM")
    # Use real implementations
    from app.graph import app as agent_app


app = FastAPI(
    title="Sentinel AI Agent Framework",
    version="1.0.0",
    description="Multi-agent AI system for SQL queries and forecasting"
)


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    response: str
    agent_used: str = "unknown"


@app.get("/")
async def root():
    mode = "MOCK" if USE_MOCK else "PRODUCTION"
    return {
        "message": "Sentinel AI Agent Framework",
        "version": "1.0.0",
        "mode": mode,
        "endpoints": ["/", "/health", "/chat", "/docs"]
    }


@app.get("/health")
async def health():
    mode = "MOCK" if USE_MOCK else "PRODUCTION"
    return {
        "status": "healthy",
        "service": "sentinel-ai",
        "mode": mode
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        from langchain_core.messages import HumanMessage
        
        # Initialize state with proper structure using HumanMessage
        inputs = {
            "messages": [HumanMessage(content=request.query)],
            "query": request.query,
            "next": "",
            "agent_decision": "",
            "sql_data": [],
            "sql_context": [],
            "forecast_result": None,
            "supervisor_count": 0
        }
        
        # Invoke LangGraph
        result = await agent_app.ainvoke(inputs)
        
        # Extract final answer
        last_msg = result["messages"][-1]
        response_text = last_msg.content if hasattr(last_msg, 'content') else str(last_msg)
        
        return ChatResponse(
            response=response_text,
            agent_used=result.get("agent_decision") or result.get("next", "unknown")
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ChatResponse(
            response=f"Error: {str(e)}",
            agent_used="error"
        )


@app.get("/ws/socket.io/")
async def socket_io_handler():
    """Prevent 404 errors from Socket.IO polling"""
    return {"message": "WebSocket not supported"}


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    print(f"\n{'='*60}")
    print(f"Starting Sentinel AI Agent Framework")
    print(f"{'='*60}")
    print(f"Mode: {'MOCK' if USE_MOCK else 'PRODUCTION'}")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Docs: http://localhost:{port}/docs")
    print(f"{'='*60}\n")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level=log_level
    )