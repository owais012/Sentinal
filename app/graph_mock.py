"""
Mock graph for offline/local testing.
Provides the same interface as the compiled LangGraph app with a minimal
heuristic response so the API can run without external LLM dependencies.
"""
import asyncio
from langchain_core.messages import AIMessage


class _MockAgentApp:
    async def ainvoke(self, state):
        query = state.get("query") or (state.get("messages", [{}])[-1].content if state.get("messages") else "")
        lower_q = query.lower() if isinstance(query, str) else ""

        if "forecast" in lower_q or "predict" in lower_q:
            agent = "Forecast_Agent"
            content = "[MOCK] Forecast: trend looks stable over the next period."
        elif "sql" in lower_q or "data" in lower_q or "select" in lower_q:
            agent = "SQL_Agent"
            content = "[MOCK] SQL result placeholder (no real database in mock mode)."
        else:
            agent = "General_Agent"
            content = "[MOCK] Hello! This is a mock response."

        return {
            "messages": [AIMessage(content=content)],
            "agent_decision": agent,
            "next": agent,
            "sql_context": [],
            "sql_data": [],
            "forecast_result": content if agent == "Forecast_Agent" else None,
        }

    def invoke(self, state):
        return asyncio.get_event_loop().run_until_complete(self.ainvoke(state))


app = _MockAgentApp()
