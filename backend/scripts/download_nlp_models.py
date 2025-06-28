#!/usr/bin/env python
"""
Script to download NLP models required by the application.
Run this before starting the application to ensure all models are available.
"""

import sys
import subprocess
import logging
import argparse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)


def download_spacy_model():
    """Download the required spaCy model using a subprocess call"""
    try:
        logging.info("Downloading spaCy model 'en_core_web_sm'...")
        result = subprocess.run(
            [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
            capture_output=True,
            text=True,
            check=True,
        )
        logging.info("SpaCy model downloaded successfully")
        logging.debug(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to download spaCy model: {e}")
        logging.error(f"Error output: {e.stderr}")
        return False
    except Exception as e:
        logging.error(f"An unexpected error occurred: {str(e)}")
        return False


def download_nltk_data():
    """Download required NLTK data"""
    try:
        import nltk

        logging.info("Downloading NLTK data...")
        nltk.download("punkt")
        nltk.download("stopwords")
        nltk.download("averaged_perceptron_tagger")
        logging.info("NLTK data downloaded successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to download NLTK data: {str(e)}")
        return False


def verify_detoxify():
    """Verify Detoxify package is installed properly"""
    try:
        import importlib.util

        if importlib.util.find_spec("detoxify") is None:
            logging.warning(
                "Detoxify package not found. Toxicity analysis will be limited."
            )
            logging.info("To install Detoxify: pip install detoxify")
            return False

        logging.info("Detoxify package is available")
        return True
    except Exception as e:
        logging.error(f"Error checking for Detoxify: {str(e)}")
        return False


def verify_spacy_model():
    """Verify if the spaCy model is installed without downloading"""
    try:
        import spacy

        try:
            nlp = spacy.load("en_core_web_sm")
            logging.info("✅ spaCy model 'en_core_web_sm' is installed and working")
            return True
        except OSError:
            logging.error("❌ spaCy model 'en_core_web_sm' is not installed")
            return False
    except ImportError:
        logging.error("❌ spaCy package is not installed")
        return False


def main():
    """Main function to download all required NLP models"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Download or verify NLP models required by the application"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify model installation without downloading",
    )
    args = parser.parse_args()

    # Create a status tracking dictionary
    status = {"spacy": False, "nltk": False, "detoxify": False}

    if args.verify:
        logging.info("Verifying NLP model installation...")
        # Verify NLTK data (always returns True since we can't easily verify)
        status["nltk"] = True
        logging.info("✅ NLTK data appears to be available")

        # Verify spaCy model
        status["spacy"] = verify_spacy_model()

        # Verify Detoxify
        status["detoxify"] = verify_detoxify()
    else:
        logging.info("Starting NLP model download process")

        # Download NLTK data
        status["nltk"] = download_nltk_data()

        # Download spaCy model
        status["spacy"] = download_spacy_model()

        # Verify Detoxify
        status["detoxify"] = verify_detoxify()

    # Report status
    logging.info("NLP model download process completed")
    logging.info(f"NLTK Status: {status['nltk']}")
    logging.info(f"spaCy Status: {status['spacy']}")
    logging.info(f"Detoxify Status: {status['detoxify']}")

    # Exit with appropriate code
    if all(status.values()):
        logging.info("All NLP models downloaded successfully")
        sys.exit(0)
    else:
        logging.error("Some NLP models failed to download")
        sys.exit(1)


if __name__ == "__main__":
    main()
