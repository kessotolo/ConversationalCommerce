from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Backend is live 🎯"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
