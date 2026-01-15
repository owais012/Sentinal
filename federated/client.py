import os
import json
import torch
from dotenv import load_dotenv  # <--- ADDED THIS
from peft import LoraConfig, get_peft_model, TaskType
from transformers import (
    AutoModelForCausalLM, 
    AutoTokenizer, 
    BitsAndBytesConfig, 
    TrainingArguments, 
    Trainer, 
    DataCollatorForLanguageModeling
)
from datasets import Dataset
import flwr as fl
from collections import OrderedDict

# 1. LOAD ENV VARS (Fixes the missing token error)
load_dotenv()

# CONFIG
# MODEL_NAME = "meta-llama/Llama-3.2-3B-Instruct"
MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"
DATA_PATH = "federated/train_data.json"

class SentinelClient(fl.client.NumPyClient):
    def __init__(self):
        print("📥 Loading Model in 4-bit (QLoRA) to save VRAM...")

        # 2. Get Token safely
        HF_TOKEN = os.getenv("HF_TOKEN")
        if not HF_TOKEN:
            # Fallback: Try to find standard CLI login token if .env is missing
            from huggingface_hub import get_token
            HF_TOKEN = get_token()
            
        if not HF_TOKEN:
            raise RuntimeError("❌ HF_TOKEN not found! Add 'HF_TOKEN=HF_...' to your .env file.")
        
        # 3. 4-Bit Configuration (The Magic for 4GB Cards)
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )

        # 4. Load Tokenizer & Model
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, token=HF_TOKEN)
        self.tokenizer.pad_token = self.tokenizer.eos_token
        
        self.model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            quantization_config=bnb_config,
            device_map="auto", 
            token=HF_TOKEN,
        )
        # Gradient checkpointing saves HUGE memory
        self.model.config.use_cache = False
        self.model.gradient_checkpointing_enable()

        # 5. Apply LoRA
        peft_config = LoraConfig(
            r=8, 
            lora_alpha=16,
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
        )
        self.model = get_peft_model(self.model, peft_config)
        print("✅ Model loaded successfully on GPU.")

    def get_parameters(self, config):
        # Only send the lightweight LoRA adapters, not the full model
        return [val.cpu().numpy() for _, val in self.model.state_dict().items()]

    def set_parameters(self, parameters):
        params_dict = zip(self.model.state_dict().keys(), parameters)
        state_dict = OrderedDict({k: torch.tensor(v) for k, v in params_dict})
        self.model.load_state_dict(state_dict, strict=True)

    def fit(self, parameters, config):
        print("🔄 Syncing weights from Server...")
        self.set_parameters(parameters)
        
        with open(DATA_PATH, 'r') as f:
            raw_data = json.load(f)
        
        texts = [f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{x['instruction']}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n{x['output']}<|eot_id|>" for x in raw_data]
        
        dataset = Dataset.from_dict({"text": texts})
        dataset = dataset.map(lambda x: self.tokenizer(x["text"], padding="max_length", truncation=True, max_length=128), batched=True)

        training_args = TrainingArguments(
            output_dir="outputs",
            per_device_train_batch_size=1, 
            gradient_accumulation_steps=4, 
            warmup_steps=2,
            max_steps=10, 
            learning_rate=2e-4,
            fp16=True,
            logging_steps=1,
            optim="paged_adamw_8bit",
            save_strategy="no",
            gradient_checkpointing=True,
            report_to="none" # Disable WandB logging
        )

        trainer = Trainer(
            model=self.model,
            train_dataset=dataset,
            args=training_args,
            data_collator=DataCollatorForLanguageModeling(self.tokenizer, mlm=False),
        )
        
        print("🏋️ Training locally on RTX 3050...")
        trainer.train()
        
        return self.get_parameters(config={}), len(dataset), {}

    def evaluate(self, parameters, config):
        return 0.0, 1, {"accuracy": 0.0}

def main():
    client = SentinelClient()
    # Align client gRPC message cap with server (~2GB, within 32-bit signed)
    fl.client.start_numpy_client(
        server_address="127.0.0.1:8080", 
        client=client,
        grpc_max_message_length=2_000_000_000,
    )

if __name__ == "__main__":
    main()