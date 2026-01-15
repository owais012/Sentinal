import os
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv

load_dotenv()

from app.llm_provider import get_llm

# Get your free key from tavily.com (1,000 free searches/month)
# os.environ["TAVILY_API_KEY"] = "tvly-..."

def get_web_agent():
    # 1. The Pre-Built Tool
    # 'max_results=5' gets the top 5 pages and their summaries
    tool = TavilySearchResults(max_results=5)

    # 2. The LLM (use shared provider: Gemini or Ollama)
    llm = get_llm(temperature=0.7)

    # 3. Create Agent
    # This automatically handles "Search" -> "Read" -> "Answer"
    return create_react_agent(llm, [tool])