#!/usr/bin/env python3
"""
Minimal test server to verify basic FastAPI functionality
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Set environment variables
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/conversational_commerce")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("REDIS_DISABLED", "true")
os.environ.setdefault("SECRET_KEY", "dev-secret-key")
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_dummy_key_for_development")

# Create a minimal FastAPI app
app = FastAPI(title="Minimal Test Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Minimal server is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/v1/dashboard/stats")
def dashboard_stats():
    return {
        "total_orders": 0,
        "total_revenue": 0,
        "active_customers": 0,
        "conversion_rate": 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
