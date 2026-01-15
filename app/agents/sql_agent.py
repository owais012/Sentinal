import os
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
import json

# Load environment variables
load_dotenv()

from app.llm_provider import get_llm

def get_sql_agent():
    # 1. Connect to Database
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "owais")
    host = os.getenv("MYSQL_HOST", "localhost")
    port = os.getenv("MYSQL_PORT", "3306")
    db_name = os.getenv("MYSQL_DATABASE", "employees")
    
    db = SQLDatabase.from_uri(f"mysql+pymysql://{user}:{password}@{host}:{port}/{db_name}")

    # 2. Use shared LLM provider (llama3.2:3b)
    llm = get_llm(temperature=0)

    # 3. Create Toolkit (Auto-handles schema & execution)
    toolkit = SQLDatabaseToolkit(db=db, llm=llm)
    tools = toolkit.get_tools()

    # 4. Create the React Agent
    return create_react_agent(llm, tools)