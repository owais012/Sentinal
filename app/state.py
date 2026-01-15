import operator
from typing import Annotated, List, Dict, Any, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage


class AgentState(TypedDict, total=False):
    """Shared state passed between agents in the LangGraph workflow."""

    # Conversation history
    messages: Annotated[List[BaseMessage], operator.add]

    # Raw user query (first prompt)
    query: str

    # Supervisor routing decision
    agent_decision: str

    # SQL context returned from SQL agent
    sql_context: List[Dict[str, Any]]

    # Forecasting results from forecasting agent
    forecast_result: Optional[Any]

    # Legacy / compatibility fields used in existing nodes
    next: str
    sql_data: List[Dict[str, Any]]
    
    # Loop prevention counter
    supervisor_count: int