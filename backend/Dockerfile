FROM python:3.12-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
COPY download_nlp_models.py .

# Install Python dependencies and NLP models
RUN pip install --no-cache-dir -r requirements.txt && \
    python download_nlp_models.py

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
