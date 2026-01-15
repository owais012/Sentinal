import os
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.tools import Tool
from langgraph.prebuilt import create_react_agent

from app.llm_provider import get_llm

# GLOBAL CACHE (So we don't rebuild index on every request)
_vectorstore_cache = None

def _get_vectorstore():
    global _vectorstore_cache
    if _vectorstore_cache is not None:
        return _vectorstore_cache

    data_dir = os.path.join(os.getcwd(), "data")
    if not os.path.isdir(data_dir):
        print(f"[RAG] ⚠️ Data directory not found: {data_dir}")
        return None

    print("[RAG] 🔄 Indexing Confidential Documents...")
    
    # 1. Load Documents (Supports PDF and TXT)
    # Ensure you have a 'data/' folder with your files
    loader = DirectoryLoader(data_dir, glob="**/*.pdf", loader_cls=PyPDFLoader)
    docs = loader.load()
    
    # Also load text files
    txt_loader = DirectoryLoader(data_dir, glob="**/*.txt", loader_cls=TextLoader)
    docs.extend(txt_loader.load())

    if not docs:
        print("[RAG] ⚠️ No documents found in ./data folder!")
        return None

    # 2. Split into Chunks (Standard 1000 char chunks)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)

    # 3. Create Embeddings (Free Local Model - No API Cost)
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # 4. Build Vector DB
    _vectorstore_cache = FAISS.from_documents(splits, embeddings)
    print(f"[RAG] ✅ Indexed {len(splits)} chunks.")
    return _vectorstore_cache

def get_rag_agent():
    vectorstore = _get_vectorstore()
    
    if not vectorstore:
        # Fallback if no data exists
        llm = get_llm(temperature=0)
        return create_react_agent(llm, [])

    # 1. Create the Standard Retriever Tool
    retriever = vectorstore.as_retriever()
    
    def search_docs(query: str) -> str:
        """Search internal documents and return results."""
        docs = retriever.invoke(query)
        return "\n".join([doc.page_content for doc in docs]) if docs else "No documents found."
    
    tool = Tool(
        name="search_confidential_docs",
        func=search_docs,
        description="Searches internal company documents, policies, and confidential reports."
    )

    # 2. Create Agent
    llm = get_llm(temperature=0)
    return create_react_agent(llm, [tool])