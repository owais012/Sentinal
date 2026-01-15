# Sentinel AI Agent Framework - Copilot Instructions

## Project Overview
Sentinel is a multi-agent AI system built with **LangGraph** that orchestrates three specialized agents for handling general queries, SQL operations, and time-series forecasting. The framework uses FastAPI for HTTP services and integrates with Google Generative AI (Gemini) as the primary LLM backbone.

## Architecture Principles

### Agent-Based Design
- **Three core agents** defined in `app/agents/`:
  - `general_agent.py` - Handles unstructured queries and conversations
  - `sql_agent.py` - Manages database interactions via natural language
  - `forecasting_agent.py` - Performs time-series forecasting using Prophet
- Agents are orchestrated via **LangGraph workflows** defined in `app/graph.py`
- **State management** centralized in `app/state.py` to maintain context across agent invocations

### State Pattern
- Create a `State` TypedDict in `app/state.py` that defines the shared data structure passed between agents
- Include fields for: `messages`, `query`, `sql_context`, `forecast_result`, `agent_decision`
- State flows through the graph, allowing agents to read inputs and write outputs

### LangGraph Workflow Pattern
- Define the computational graph in `app/graph.py` with explicit node and edge definitions
- Use `add_node(name, function)` for agent entry points
- Use `add_edge(source, target)` for sequential flows and `add_conditional_edges()` for routing logic
- Compile graph with `.compile()` before execution; typically invoked from API endpoints

## Technology Stack

### Core Dependencies
- **LangGraph/LangChain**: Agent orchestration and LLM integration
- **FastAPI + Uvicorn**: HTTP API server for external consumption
- **SQLAlchemy + PyMySQL**: Database abstraction layer for MySQL operations
- **Prophet**: Time-series forecasting library (Facebook's forecasting model)
- **Pandas**: Data manipulation and transformation
- **Python-dotenv**: Environment variable management for API keys (GOOGLE_API_KEY)

### Environment Configuration
- Store `GOOGLE_API_KEY` in `.env` for Gemini API access
- Use `python-dotenv` to load environment variables in initialization code
- Never hardcode API keys; always source from environment

## Development Patterns

### Agent Implementation Pattern
Each agent should follow this structure:
```python
async def agent_name(state: State) -> Dict[str, Any]:
    # 1. Extract relevant data from state
    # 2. Build tools/context if needed
    # 3. Call LLM or execute logic
    # 4. Return dict with updated state fields
    return {"output_field": result}
```

### Tool Definition
- Use LangChain's `@tool` decorator for agent-callable functions
- SQL Agent should bind tools for SELECT, INSERT, UPDATE operations (NOT DROP/DELETE)
- Forecasting Agent should expose: `load_time_series()`, `fit_forecast()`, `get_prediction()`

### Error Handling
- Catch database exceptions and return human-readable error messages in state
- Validate user input (SQL injection prevention for sql_agent)
- Ensure agents degrade gracefully (return error in state rather than raising)

## API & Integration Points

### FastAPI Entry Points (from main.py)
- Plan endpoints like:
  - `POST /query` - Route to appropriate agent(s) via graph
  - `POST /forecast` - Direct forecasting_agent invocation
  - `POST /sql` - SQL query execution with sql_agent
- Pass request body as initial state to the compiled graph
- Return `state.messages` or `state.result` as response

### Database Integration (app/agents/sql_agent.py)
- Use SQLAlchemy ORM for type safety over raw SQL when possible
- For dynamic SQL: create a `create_engine()` from environment-sourced connection string
- Always use parameterized queries to prevent SQL injection

### LLM Integration
- Use `ChatGoogleGenerativeAI` from langchain-google-genai
- Initialize with `temperature=0.7` for general_agent (more deterministic for sql/forecasting)
- Pass agent tools via `bind_tools()` to empower LLM with function calling

## Code Organization
- `app/state.py` - Shared state definition (single source of truth)
- `app/graph.py` - Graph construction and workflow definition
- `app/agents/__init__.py` - Agent function imports
- Each agent gets its own module (general_agent, sql_agent, forecasting_agent)
- `main.py` - FastAPI app initialization and route definitions

## Testing & Debugging
- Test agents individually by calling them with mock State
- Use `graph.invoke()` for synchronous testing; `graph.ainvoke()` for async
- Print state transitions to debug graph flow issues
- Validate Prophet forecasts with `.plot()` before returning predictions

## Key Files to Reference
- `requirements.txt` - All dependencies pinned; update when adding new libraries
- `.env` - Never commit; template with `GOOGLE_API_KEY=<your-key>`
- `app/state.py` - Source of truth for data contracts between agents
