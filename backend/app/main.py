from fastapi import FastAPI
from app.routers import dashboard  # import your new router


app = FastAPI()

# Register the route
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"message": "Backend is live 🎯"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
