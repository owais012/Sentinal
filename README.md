# 🛡️ Sentinel AI Agent Framework

> **Autonomous Multi-Agent System with Federated Learning & RAG Capabilities**

The **Sentinel AI Agent Framework** is a sophisticated multi-agent system orchestrating specialized AI workers to solve complex tasks. Built with **FastAPI**, **LangGraph**, and **Streamlit**, it features a "Supervisor" brain that intelligently routes queries to SQL databases, forecasting tools, internal document search (RAG), or the live web.

---

## 🎥 Project Demo

https://github.com/user-attachments/assets/19988f3c-5adf-45fb-be4b-64d4b0b1835b

---

## ✨ Key Features

* **🧠 Supervisor Architecture**: A central "Brain" (built with LangGraph) that analyzes user intent and routes tasks to the most capable agent.
* **📊 SQL & Data Analysis**: Autonomous SQL agent capable of querying databases and extracting insights.
* **📈 Time-Series Forecasting**: Integrated **Prophet** model for predicting trends (sales, revenue, etc.) based on historical data.
* **📚 RAG (Retrieval-Augmented Generation)**: Securely searches internal PDF/TXT documents using local embeddings (`all-MiniLM-L6-v2`) and FAISS.
* **🤝 Federated Learning Loop**: Unique feedback system where user corrections are saved and used to train the model in a decentralized manner.
* **🌐 Web Search**: Access to real-time internet information via Tavily/Google Search.
* **🛠️ Mock Mode**: Fully functional offline mode for testing without API costs.

---

## 🛠️ Tech Stack

* **Backend**: FastAPI, Uvicorn
* **Frontend**: Streamlit
* **AI Orchestration**: LangChain, LangGraph
* **LLMs**: Google Gemini 2.0, Llama 3 (via Ollama)
* **Data Science**: Pandas, Prophet, Plotly
* **Vector DB**: FAISS (CPU)
* **Federated Learning**: Flower (Flwr)

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/owais012/Sentinal.git](https://github.com/owais012/Sentinal.git)
cd Sentinal
