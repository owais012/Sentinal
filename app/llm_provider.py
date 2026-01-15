"""
LLM Provider Factory
Allows switching between Gemini API and Ollama based on environment configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()


def get_llm(temperature: float = 0.0, model_override: str = None):
    """
    Get LLM instance based on configured provider
    
    Args:
        temperature: Model temperature (0.0 = deterministic, 1.0 = creative)
        model_override: Optional model name to override default (e.g., "llama3.1:8b", "llama3.2:3b")
    
    Returns:
        LLM instance (ChatGoogleGenerativeAI or ChatOllama)
    """
    
    if LLM_PROVIDER == "ollama":
        return get_ollama_llm(temperature, model_override)
    else:
        return get_gemini_llm(temperature, model_override)


def get_gemini_llm(temperature: float = 0.0, model_override: str = None):
    """Get Google Gemini LLM"""
    from langchain_google_genai import ChatGoogleGenerativeAI
    
    model = model_override or os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature
    )


def get_ollama_llm(temperature: float = 0.0, model_override: str = None):
    """Get Ollama LLM (local)"""
    from langchain_ollama import ChatOllama
    
    model = model_override or os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    return ChatOllama(
        model=model,
        base_url=base_url,
        temperature=temperature
    )

