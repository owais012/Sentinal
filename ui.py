import os
import json
import requests
import streamlit as st

API_URL = "http://127.0.0.1:8000/chat"
DATA_PATH = os.path.join("federated", "train_data.json")

st.set_page_config(page_title="Sentinel V2 - Autonomous AI System", layout="wide")

def save_feedback(user_input: str, ideal_response: str) -> None:
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                data = []
    except FileNotFoundError:
        data = []
    data.append({"instruction": user_input, "output": ideal_response})
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Sidebar
st.sidebar.header("System Status")
st.sidebar.markdown("🟢 **Online**")
st.sidebar.selectbox("Model", ["Gemini 2.0 (demo)", "Llama 3 (demo)"], index=0)

if "messages" not in st.session_state:
    st.session_state.messages = []

def reset_conversation():
    st.session_state.messages = []

if st.sidebar.button("Reset Conversation", type="primary"):
    reset_conversation()
    st.experimental_rerun()

st.title("Sentinel V2 - Autonomous AI System")
st.caption("Chat UI powered by Streamlit; backend served by FastAPI.")

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

user_input = st.chat_input("Ask Sentinel...")

def render_response(content: str):
    """Render JSON/Tabular responses nicely; fallback to markdown."""
    try:
        parsed = json.loads(content)
        if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
            st.dataframe(parsed)
        elif isinstance(parsed, (dict, list)):
            st.json(parsed)
        else:
            st.markdown(str(content))
    except Exception:
        st.markdown(content)

if user_input:
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    assistant_reply = ""
    with st.spinner("Contacting backend..."):
        try:
            resp = requests.post(API_URL, json={"query": user_input}, timeout=60)
            resp.raise_for_status()
            payload = resp.json()
            assistant_reply = payload.get("response", "No response received.")
            agent_used = payload.get("agent_used")
            if agent_used:
                assistant_reply = f"{assistant_reply}\n\n_Agent: {agent_used}_"
        except Exception as e:
            try:
                # Try to show server response text if available
                server_text = resp.text if 'resp' in locals() else ""
                assistant_reply = f"Error contacting backend: {e}\n{server_text}"
            except Exception:
                assistant_reply = f"Error contacting backend: {e}"

    st.session_state.messages.append({"role": "assistant", "content": assistant_reply})
    with st.chat_message("assistant"):
        render_response(assistant_reply)

# Feedback & Data Collection
if st.session_state.messages and st.session_state.messages[-1]["role"] == "assistant":
    last_assistant = st.session_state.messages[-1]["content"]
    last_user = next(
        (msg["content"] for msg in reversed(st.session_state.messages[:-1]) if msg["role"] == "user"),
        ""
    )
    with st.expander("📝 Correct this answer for Training"):
        st.text_area("Original Question", value=last_user, height=80, disabled=True, key="original_question")
        ideal_response = st.text_area(
            "Ideal Response",
            value=last_assistant,
            height=160,
            key="ideal_response_feedback"
        )
        if st.button("💾 Save to Training Data", key="save_feedback_button"):
            save_feedback(last_user, ideal_response)
            st.success("✅ Data saved! The model will learn this in the next Federated round.")
