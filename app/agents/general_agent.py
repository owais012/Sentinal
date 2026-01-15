from langchain_core.messages import AIMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

from app.llm_provider import get_llm

def general_node(state):
    llm = get_llm(temperature=0.7)
    
    # Add system context
    system_msg = SystemMessage(content="""You are a helpful AI assistant in a multi-agent system.
You handle general questions and conversations that don't require database queries or forecasting.
Be concise, friendly, and helpful.""")
    
    # Combine system message with conversation history
    messages = [system_msg] + state.get("messages", [])
    
    # Direct invocation
    response = llm.invoke(messages)
    
    return {
        "messages": [response],
        "agent_decision": state.get("agent_decision") or "General_Agent",
        "next": "General_Agent",
    }