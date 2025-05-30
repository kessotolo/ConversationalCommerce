#!/usr/bin/env python
"""
NLP Dependencies Downloader
--------------------------
This script downloads all required NLP models and data files
for the Conversational Commerce platform.

Run this script as part of your deployment process:
python download_nlp_models.py
"""
import os
import sys
import logging
import subprocess

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def download_spacy_model():
    """Download the SpaCy English model."""
    try:
        logger.info("Downloading SpaCy model: en_core_web_sm")
        import spacy
        spacy_version = spacy.__version__
        logger.info(f"SpaCy version: {spacy_version}")
        
        # Check if model is already downloaded
        try:
            spacy.load("en_core_web_sm")
            logger.info("SpaCy model already installed.")
            return True
        except OSError:
            # Model not found, download it
            logger.info("SpaCy model not found. Downloading...")
            result = subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("SpaCy model downloaded successfully.")
                return True
            else:
                logger.error(f"Failed to download SpaCy model: {result.stderr}")
                return False
    except Exception as e:
        logger.error(f"Error downloading SpaCy model: {str(e)}")
        return False

def download_nltk_data():
    """Download required NLTK data."""
    try:
        logger.info("Downloading NLTK data...")
        import nltk
        nltk.download('punkt')
        nltk.download('stopwords')
        nltk.download('averaged_perceptron_tagger')
        nltk.download('wordnet')
        logger.info("NLTK data downloaded successfully.")
        return True
    except Exception as e:
        logger.error(f"Error downloading NLTK data: {str(e)}")
        return False

def check_detoxify():
    """Check if Detoxify is installed and functional."""
    try:
        logger.info("Checking Detoxify installation...")
        import detoxify
        logger.info(f"Detoxify version: {detoxify.__version__}")
        logger.info("Detoxify is properly installed.")
        return True
    except ImportError:
        logger.warning("Detoxify not installed. Toxicity detection will be disabled.")
        logger.info("To install Detoxify, run: pip install detoxify==0.5.2")
        return False
    except Exception as e:
        logger.error(f"Error with Detoxify installation: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting NLP model download process...")
    
    # Track overall success
    success = True
    
    # Download SpaCy model
    if not download_spacy_model():
        success = False
    
    # Download NLTK data
    if not download_nltk_data():
        success = False
    
    # Check Detoxify
    if not check_detoxify():
        logger.warning("Detoxify check failed, but continuing as it's optional")
    
    if success:
        logger.info("All required NLP models downloaded successfully!")
        sys.exit(0)
    else:
        logger.error("Failed to download some NLP models. Check logs for details.")
        sys.exit(1)
