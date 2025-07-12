#!/usr/bin/env python3
"""
Patched script to execute a single pytest test with aggressive dependency mocking
"""
import os
import sys
import unittest.mock
import asyncio
import importlib
import logging
import signal
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    filename="test_execution.log",
    filemode="w",
)
logger = logging.getLogger("TEST_RUNNER")

# Add the backend directory to Python path
backend_dir = str(Path(__file__).parent.parent)
sys.path.insert(0, backend_dir)

# Set critical environment variables early
os.environ["TESTING"] = "true"
os.environ["PYTHONUNBUFFERED"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["NLTK_DATA"] = "/tmp/nltk_data"
os.environ["TOKENIZERS_PARALLELISM"] = "false"


# Register SIGALRM handler for timeout
def timeout_handler(signum, frame):
    print("Test execution timed out!")
    logger.critical("Test execution timed out after 30 seconds!")
    sys.exit(1)


signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(30)  # 30 second timeout


def info(msg):
    print(f"[INFO] {msg}")
    logger.info(msg)
    sys.stdout.flush()


def apply_aggressive_mocks():
    """Apply extremely aggressive mocking to block all external dependencies"""
    info("Applying aggressive mocks")

    # 1. Mock urllib3 to block ALL network requests
    info("Mocking urllib3...")
    urllib3_mock = unittest.mock.MagicMock()
    urllib3_mock.PoolManager = unittest.mock.MagicMock()
    urllib3_mock.exceptions = unittest.mock.MagicMock()
    sys.modules["urllib3"] = urllib3_mock

    # 2. Mock requests to block network
    info("Mocking requests library...")
    requests_mock = unittest.mock.MagicMock()
    requests_mock.get = unittest.mock.MagicMock(
        return_value=unittest.mock.MagicMock(
            status_code=200, text="Mocked response", json=lambda: {"status": "mocked"}
        )
    )
    sys.modules["requests"] = requests_mock

    # 3. Mock heavyweight NLP libraries
    try:
        info("Mocking spacy...")
        spacy_mock = unittest.mock.MagicMock()
        spacy_mock.load = unittest.mock.MagicMock(
            return_value=unittest.mock.MagicMock()
        )
        sys.modules["spacy"] = spacy_mock
    except Exception as e:
        info(f"Error mocking spacy: {e}")

    try:
        info("Mocking transformers...")
        # Create dummy classes for all the common transformers imports
        transformers_mock = unittest.mock.MagicMock()
        transformers_mock.AutoTokenizer = unittest.mock.MagicMock()
        transformers_mock.AutoTokenizer.from_pretrained = unittest.mock.MagicMock(
            return_value=unittest.mock.MagicMock()
        )
        transformers_mock.AutoModel = unittest.mock.MagicMock()
        transformers_mock.AutoModel.from_pretrained = unittest.mock.MagicMock(
            return_value=unittest.mock.MagicMock()
        )
        sys.modules["transformers"] = transformers_mock
        sys.modules["transformers.modeling_utils"] = unittest.mock.MagicMock()
    except Exception as e:
        info(f"Error mocking transformers: {e}")

    try:
        info("Mocking detoxify...")
        detoxify_mock = unittest.mock.MagicMock()
        detoxify_mock.Detoxify = unittest.mock.MagicMock(
            return_value=unittest.mock.MagicMock(
                predict=unittest.mock.MagicMock(
                    return_value={
                        "toxicity": 0.0,
                        "severe_toxicity": 0.0,
                        "obscene": 0.0,
                        "identity_attack": 0.0,
                        "insult": 0.0,
                        "threat": 0.0,
                        "sexual_explicit": 0.0,
                    }
                )
            )
        )
        sys.modules["detoxify"] = detoxify_mock
    except Exception as e:
        info(f"Error mocking detoxify: {e}")

    # 4. Mock huggingface_hub
    try:
        info("Mocking huggingface_hub...")
        hf_hub_mock = unittest.mock.MagicMock()
        hf_hub_mock.hf_hub_download = unittest.mock.MagicMock(
            side_effect=Exception("Mocked to block downloads")
        )
        sys.modules["huggingface_hub"] = hf_hub_mock
    except Exception as e:
        info(f"Error mocking huggingface_hub: {e}")

    info("All mocks applied successfully")


def execute_single_test():
    """Execute a single test with all mocking in place"""
    info("Preparing to run test...")

    # Apply all mocks
    apply_aggressive_mocks()

    # Directly import pytest only after mocking
    import pytest

    info("Pytest imported successfully")

    # Patch content analysis in app
    info("Patching app.core.content.content_analysis...")
    try:
        from tests.mocks.mock_content_analysis import mock_content_analysis_service
        from backend.app.core.content import content_analysis

        content_analysis.content_analysis_service = mock_content_analysis_service
    except Exception as e:
        info(f"Error patching content analysis: {e}")

    # Add args for pytest
    test_args = [
        "-xvs",  # Exit on first failure, verbose, no capture
        "--no-header",
        "--log-cli-level=DEBUG",
        "tests/api/test_create_order.py::test_create_order_minimum_fields",
    ]

    # Run the test
    info(f"Running test with args: {test_args}")
    pytest.main(test_args)


if __name__ == "__main__":
    info("Starting patched test execution")
    execute_single_test()
    info("Test execution complete")
    # Clear the alarm
    signal.alarm(0)
