import pandas as pd
from prophet import Prophet
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv

load_dotenv()

from app.llm_provider import get_llm

@tool
def generate_forecast(data: list, periods: int = 90):
    """
    Forecasting tool that generates time-series predictions using Prophet.
    
    ARGS:
    - data: A list of dictionaries representing historical data. 
            Example: [{'ds': '2023-01-01', 'y': 100}, {'ds': '2023-01-02', 'y': 150}]
            YOU MUST EXTRACT THIS DATA FROM THE CHAT HISTORY OR sql_data field.
    - periods: Number of days to predict (default 90).
    
    Returns a forecast prediction for the specified number of periods.
    """
    try:
        if not data or len(data) == 0:
            return "Error: No data provided. I need historical time-series data with date and value columns."

        df = pd.DataFrame(data)
        
        # Intelligent column mapping
        cols = df.columns.str.lower()
        col_mapping = {}
        
        # Map date columns
        for date_col in ['date', 'datetime', 'timestamp', 'time']:
            if date_col in cols:
                col_mapping[date_col] = 'ds'
                break
        
        # Map value columns
        for val_col in ['sales', 'salary', 'value', 'amount', 'revenue', 'y']:
            if val_col in cols:
                col_mapping[val_col] = 'y'
                break
        
        # Apply mapping
        if col_mapping:
            df = df.rename(columns=col_mapping)
        
        # Validate required columns
        if 'ds' not in df.columns or 'y' not in df.columns:
            return f"Error: Data must have date ('ds') and value ('y') columns. Found columns: {df.columns.tolist()}"

        # Convert ds to datetime
        df['ds'] = pd.to_datetime(df['ds'])
        
        # Fit Prophet model
        m = Prophet()
        m.fit(df)
        
        # Generate future dataframe
        future = m.make_future_dataframe(periods=periods)
        forecast = m.predict(future)
        
        # Get last predicted value
        last_val = forecast.iloc[-1]['yhat']
        trend = "increasing" if forecast.iloc[-1]['trend'] > forecast.iloc[0]['trend'] else "decreasing"
        
        return f"✅ Forecast Success!\n- Predicted value in {periods} days: **{last_val:.2f}**\n- Overall trend: {trend}\n- Confidence interval: [{forecast.iloc[-1]['yhat_lower']:.2f}, {forecast.iloc[-1]['yhat_upper']:.2f}]"
        
    except Exception as e:
        return f"❌ Forecast Error: {str(e)}"

def get_forecast_agent():
    llm = get_llm(temperature=0)
    
    system_message = """You are a Time-Series Forecasting Expert using Prophet models.

CRITICAL INSTRUCTIONS:
1. **Finding Data:** Look in the conversation history for data from the SQL Agent. The data may be:
   - In the 'sql_data' field of the state (preferred)
   - In previous messages as JSON or tables
   
2. **Before Forecasting:** Verify the data has:
   - A date/time column (will be mapped to 'ds')
   - A numeric value column (will be mapped to 'y')
   
3. **If no data exists:** Tell the user: "I need historical time-series data first. Please ask the SQL Agent to fetch it."

4. **When you have data:** Call the 'generate_forecast' tool with the data list and desired forecast periods.

5. **Default forecast:** 90 days unless the user specifies otherwise.
"""
    
    return create_react_agent(llm, [generate_forecast])