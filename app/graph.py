import re
import json
from typing import Literal
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Import your agents
from app.state import AgentState
from app.llm_provider import get_llm
from app.agents.sql_agent import get_sql_agent
from app.agents.forecast_agent import get_forecast_agent  # FIXED: import matches renamed file
from app.agents.general_agent import general_node
from app.agents.rag_agent import get_rag_agent
from app.agents.web_search_agent import get_web_agent

# --- 1. The Supervisor (The Brain) ---
def supervisor_node(state: AgentState):
    # Initialize LLM via provider (Gemini or Ollama)
    llm = get_llm(temperature=0)
    
    messages = state.get("messages", [])
    # Check both keys for safety
    sql_data = state.get("sql_context") or state.get("sql_data", [])
    has_data = bool(sql_data and len(sql_data) > 0)
    
    # CRITICAL: Track how many times supervisor has been called
    supervisor_count = state.get("supervisor_count", 0) + 1
    print(f"[SUPERVISOR] Call #{supervisor_count}, has_data={has_data}, msg_count={len(messages)}")
    
    # Safety: if supervisor called too many times, force END
    if supervisor_count > 3:
        print("[SUPERVISOR] ⚠️ Max iterations reached, routing to General to finish")
        return {"next": "General_Agent", "agent_decision": "General_Agent", "supervisor_count": supervisor_count}
    
    system_prompt = f"""You are a Supervisor routing user queries to specialized agents.

Available Workers:
1. **SQL_Agent**: Query MySQL database (employees, salaries, departments, etc.)
2. **Forecast_Agent**: Time-series predictions using Prophet (requires data)
3. **RAG_Agent**: Search internal PDF/TXT documents in knowledge base
4. **Web_Agent**: Search the internet for latest news/information
5. **General_Agent**: General conversation and explanations

CONTEXT:
- Data Available in State: {has_data}

ROUTING RULES:
- Database queries (employee, salary, count, highest, who earns, department, etc.) → SQL_Agent
- Forecast/prediction requests WITH data available → Forecast_Agent
- Forecast/prediction requests WITHOUT data → SQL_Agent (to fetch data first)
- Document/policy/PDF/knowledge base searches → RAG_Agent (handled separately)
- Web/latest/news/internet searches → Web_Agent (handled separately)
- General questions, explanations, greetings → General_Agent

Output ONLY ONE of: SQL_Agent, Forecast_Agent, General_Agent
(Note: RAG_Agent and Web_Agent are handled by keyword triggers before this prompt)
"""
    
    last_user_msg = messages[-1].content if messages else ""
    last_lower = last_user_msg.lower()
    
    # Fast keyword-based routing to reduce LLM overhead for obvious intents
    sql_keywords = ["database", "employee", "salary", "department", "count", "highest", "lowest", "earns", "select", "query", "table", "record"]
    rag_triggers = ["document", "policy", "pdf", "file", "manual", "knowledge", "kb", "rag", "retrieve"]
    web_triggers = ["web", "google", "bing", "latest", "news", "internet", "online", "search the web", "web search", "browse"]

    # Check SQL keywords first (highest priority for DB queries)
    # BUT if data already exists, don't loop back to SQL - go to General to summarize
    if any(keyword in last_lower for keyword in sql_keywords):
        if not has_data:
            print(f"[SUPERVISOR] Routing to SQL_Agent (no data yet)")
            return {"next": "SQL_Agent", "agent_decision": "SQL_Agent", "supervisor_count": supervisor_count}
        else:
            # Data already fetched, route to General to present it
            print(f"[SUPERVISOR] Data exists, routing to General_Agent")
            return {"next": "General_Agent", "agent_decision": "General_Agent", "supervisor_count": supervisor_count}
    
    if any(trigger in last_lower for trigger in rag_triggers):
        return {"next": "RAG_Agent", "agent_decision": "RAG_Agent", "supervisor_count": supervisor_count}
    if any(trigger in last_lower for trigger in web_triggers):
        return {"next": "Web_Agent", "agent_decision": "Web_Agent", "supervisor_count": supervisor_count}

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"User Query: {last_user_msg}")
    ])
    
    decision = response.content.strip()
    print(f"[SUPERVISOR] LLM decision: {decision}")
    
    # Robust fallback routing
    if "SQL" in decision: return {"next": "SQL_Agent", "agent_decision": "SQL_Agent", "supervisor_count": supervisor_count}
    if "Forecast" in decision: return {"next": "Forecast_Agent", "agent_decision": "Forecast_Agent", "supervisor_count": supervisor_count}
    if "RAG" in decision or "Document" in decision: return {"next": "RAG_Agent", "agent_decision": "RAG_Agent", "supervisor_count": supervisor_count}
    if "Web" in decision or "Search" in decision: return {"next": "Web_Agent", "agent_decision": "Web_Agent", "supervisor_count": supervisor_count}
    return {"next": "General_Agent", "agent_decision": "General_Agent", "supervisor_count": supervisor_count}

# --- 2. Agent Nodes ---
def sql_node(state):
    agent = get_sql_agent()
    
    # Hint injection for Forecasting scenarios
    msgs = state["messages"]
    print(f"[SQL_NODE] Invoking with {len(msgs)} messages")
    is_forecast_request = state.get("next") == "SQL_Agent" and "forecast" in msgs[-1].content.lower()
    
    if is_forecast_request:
        msgs = msgs + [HumanMessage(content="IMPORTANT: Return the data as a raw JSON list with 'ds' (date) and 'y' (value) columns. No markdown.")]
    
    res = agent.invoke({"messages": msgs})
    last_msg = res["messages"][-1]
    print(f"[SQL_NODE] Response: {last_msg.content[:200]}")
    
    # --- JSON EXTRACTION (ONLY for forecasting) ---
    sql_data = []
    content = last_msg.content
    
    if is_forecast_request:
        try:
            # Try finding code blocks first
            match = re.search(r"```json\n(.*?)\n```", content, re.DOTALL)
            if match:
                json_str = match.group(1)
            else:
                # Try finding raw list brackets []
                match = re.search(r"(\[.*?\])", content, re.DOTALL)
                json_str = match.group(1) if match else ""
                
            if json_str:
                sql_data = json.loads(json_str)
                print(f"✅ [SQL Node] Extracted {len(sql_data)} rows for forecasting.")
            else:
                print(f"⚠️ [SQL Node] No JSON found for forecast request")
        except Exception as e:
            print(f"⚠️ [SQL Node] JSON Extraction failed: {e}")
    else:
        # For regular queries, text answer is fine - mark as "completed"
        print(f"✅ [SQL Node] Text answer returned (not a forecast request)")
    
    return {
        "messages": [last_msg],
        "sql_data": sql_data,
        "sql_context": sql_data,
        "agent_decision": state.get("agent_decision") or "SQL_Agent",
        "next": "SQL_Agent",
    }

def forecast_node(state):
    agent = get_forecast_agent()
    # Forecaster needs to see the whole state to find 'sql_data'
    res = agent.invoke(state) 
    last_msg = res["messages"][-1]
    return {
        "messages": [last_msg],
        "forecast_result": getattr(last_msg, "content", None),
        "agent_decision": state.get("agent_decision") or "Forecast_Agent",
        "next": "Forecast_Agent",
    }


def rag_node(state):
    agent = get_rag_agent()
    res = agent.invoke({"messages": state.get("messages", [])})
    last_msg = res["messages"][-1]
    return {
        "messages": [last_msg],
        "agent_decision": state.get("agent_decision") or "RAG_Agent",
        "next": "RAG_Agent",
    }


def web_node(state):
    agent = get_web_agent()
    res = agent.invoke({"messages": state.get("messages", [])})
    last_msg = res["messages"][-1]
    return {
        "messages": [last_msg],
        "agent_decision": state.get("agent_decision") or "Web_Agent",
        "next": "Web_Agent",
    }

# --- 3. Build the Graph ---
workflow = StateGraph(AgentState)

workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("SQL_Agent", sql_node)
workflow.add_node("Forecast_Agent", forecast_node)
workflow.add_node("General_Agent", general_node)
workflow.add_node("RAG_Agent", rag_node)
workflow.add_node("Web_Agent", web_node)

workflow.set_entry_point("Supervisor")

workflow.add_conditional_edges(
    "Supervisor",
    lambda x: x["next"],
    {
        "SQL_Agent": "SQL_Agent",
        "Forecast_Agent": "Forecast_Agent",
        "General_Agent": "General_Agent",
        "RAG_Agent": "RAG_Agent",
        "Web_Agent": "Web_Agent"
    }
)

# --- EDGES CONFIGURATION ---
# SQL can either go to END or back to Supervisor (for forecasting handoff)
def sql_routing(state):
    """Route SQL output: if forecast request, go back to Supervisor; else END"""
    original_query = state.get("query", "").lower()
    if "forecast" in original_query or "predict" in original_query:
        return "Supervisor"
    return "__end__"

workflow.add_conditional_edges(
    "SQL_Agent",
    sql_routing,
    {
        "Supervisor": "Supervisor",
        "__end__": END
    }
)

# Forecast & General & RAG & Web are terminal steps
workflow.add_edge("Forecast_Agent", END)
workflow.add_edge("General_Agent", END)
workflow.add_edge("RAG_Agent", END)
workflow.add_edge("Web_Agent", END)

app = workflow.compile()