import flwr as fl

def main():
    print("\n🚀 STARTING FEDERATED SERVER")
    print("Waiting for clients to connect on port 8080...\n")

    strategy = fl.server.strategy.FedAvg(
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=1,
        min_evaluate_clients=1,
        min_available_clients=1,
    )

    # FIX: Increase message limit to 2GB
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=3),
        strategy=strategy,
        grpc_max_message_length=2_000_000_000,  # ~2GB, within 32-bit signed limit
    )

if __name__ == "__main__":
    main()