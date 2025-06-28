#!/usr/bin/env python3
"""
Script to patch heavy dependencies and run tests.
Run this instead of pytest directly when tests are hanging.
"""

import os

os.environ["HF_HUB_OFFLINE"] = "1"  # Force HuggingFace to use offline mode
os.environ["TRANSFORMERS_OFFLINE"] = "1"  # Force transformers to use offline mode
os.environ["TRANSFORMERS_CACHE"] = (
    "/tmp/nonexistent_path"  # Point to non-existent cache
)
os.environ["PYTHONUNBUFFERED"] = "1"  # Ensure unbuffered output
os.environ["TOKENIZERS_PARALLELISM"] = "false"  # Disable tokenizer parallelism warnings
os.environ["TESTING"] = "true"  # Ensure testing mode is set
os.environ["PYTEST_RUNNING"] = "true"

import sys
import unittest.mock
from unittest.mock import MagicMock
import subprocess

print("Applying patches for heavy dependencies BEFORE they can be imported...")

os.environ["PYTEST_RUNNING"] = "true"


# Create patch for heavy NLP libraries before they are imported
class MockDetoxify:
    def __init__(self, *args, **kwargs):
        pass

    def predict(self, text):
        return {
            "toxicity": 0.01,
            "severe_toxicity": 0.01,
            "obscene": 0.01,
            "identity_attack": 0.01,
            "insult": 0.01,
            "threat": 0.01,
            "sexual_explicit": 0.01,
        }


# Create a mock module for detoxify
detoxify_mock = MagicMock()
detoxify_mock.Detoxify = MockDetoxify
sys.modules["detoxify"] = detoxify_mock


# Block ALL huggingface requests and urllib3 connections
class MockResponse:
    def __init__(self, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def json(self):
        return {}

    def raise_for_status(self):
        pass

    @property
    def status_code(self):
        return 200

    @property
    def headers(self):
        return {}

    @property
    def content(self):
        return b""

    def read(self):
        return b""


# Patch all requests to prevent any network access
requests_mock = MagicMock()
requests_mock.get = lambda *args, **kwargs: MockResponse()
requests_mock.post = lambda *args, **kwargs: MockResponse()
sys.modules["requests"] = requests_mock


# Block urllib3 connections
class MockConnectionPool:
    def __init__(self, *args, **kwargs):
        pass

    def request(self, *args, **kwargs):
        return MockResponse()

    def urlopen(self, *args, **kwargs):
        return MockResponse()


# Create mock urllib3 module
urllib3_mock = MagicMock()
urllib3_mock.PoolManager = lambda *args, **kwargs: MockConnectionPool()
urllib3_mock.HTTPConnectionPool = lambda *args, **kwargs: MockConnectionPool()
urllib3_mock.HTTPSConnectionPool = lambda *args, **kwargs: MockConnectionPool()
sys.modules["urllib3"] = urllib3_mock
sys.modules["urllib3.connectionpool"] = MagicMock()

# Block huggingface_hub
huggingface_mock = MagicMock()
sys.modules["huggingface_hub"] = huggingface_mock
sys.modules["huggingface_hub.file_download"] = MagicMock()
sys.modules["huggingface_hub.utils"] = MagicMock()
sys.modules["huggingface_hub.hf_api"] = MagicMock()

# More aggressive patching for transformers library
try:
    # Create a mock for the entire transformers library
    transformers_mock = MagicMock()

    # Prepare a mock AutoModel that returns a working but non-functional model
    class MockAutoModel:
        @classmethod
        def from_pretrained(cls, *args, **kwargs):
            mock = MagicMock()
            # Add necessary attributes/methods that might be accessed
            mock.eval = lambda: mock
            mock.to = lambda device: mock
            mock.forward = lambda **kwargs: MagicMock()
            return mock

    # Mock the specific transformers classes that might try to download models
    transformers_mock.AutoModel = MockAutoModel
    transformers_mock.AutoModelForSequenceClassification = MockAutoModel
    transformers_mock.AutoModelForCausalLM = MockAutoModel
    transformers_mock.AutoTokenizer = MockAutoModel

    # Mock pipeline
    def mock_pipeline(*args, **kwargs):
        logger.info(f"Mocked pipeline({args}, {kwargs})")
        mock = MagicMock()
        mock.return_value = [{"label": "positive", "score": 0.9}]
        return mock

    transformers_mock.pipeline = mock_pipeline

    # Insert mock into sys.modules
    sys.modules["transformers"] = transformers_mock

    # Block all network requests - more aggressive patching
    import urllib.request
    import urllib3
    import http.client
    import requests
    import socket
    import importlib.util

    # Keep track of blocked URLs for debugging
    blocked_urls = []

    # Block all HTTP/HTTPS connections by patching urllib3
    def patched_urlopen(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        blocked_urls.append(url)
        logger.warning(f"Blocked URL request to: {url}")
        raise urllib.error.URLError(f"[TEST] Blocked URL request to: {url}")

    urllib.request.urlopen = patched_urlopen

    # Block HTTPConnection/HTTPSConnection
    original_http_connect = http.client.HTTPConnection.connect

    def patched_http_connect(self, *args, **kwargs):
        host = self.host
        logger.warning(f"Blocked HTTP connection to: {host}")
        raise ConnectionRefusedError(f"[TEST] Blocked connection to {host}")

    http.client.HTTPConnection.connect = patched_http_connect
    http.client.HTTPSConnection.connect = patched_http_connect

    # Block socket connections
    original_socket_connect = socket.socket.connect

    def patched_socket_connect(self, *args, **kwargs):
        host = args[0] if args else kwargs.get("address", "")
        logger.warning(f"Blocked socket connection to: {host}")
        raise ConnectionRefusedError(f"[TEST] Blocked connection to {host}")

    socket.socket.connect = patched_socket_connect

    # Block requests library
    original_requests_request = requests.Session.request

    def patched_requests(*args, **kwargs):
        url = kwargs.get("url", args[1] if len(args) > 1 else "unknown")
        blocked_urls.append(url)
        logger.warning(f"Blocked requests call to: {url}")
        raise requests.exceptions.ConnectionError(f"[TEST] Blocked request to {url}")

    requests.Session.request = patched_requests

    # Mock HuggingFace hub
    mock_huggingface_hub = MagicMock()
    mock_huggingface_hub.hf_hub_download = MagicMock(
        side_effect=RuntimeError("Mocked hf_hub_download")
    )
    mock_huggingface_hub.snapshot_download = MagicMock(
        side_effect=RuntimeError("Mocked snapshot_download")
    )
    sys.modules["huggingface_hub"] = mock_huggingface_hub

    logger.info("Successfully mocked transformers and huggingface_hub libraries")
except Exception as e:
    logger.error(f"Failed to mock transformers: {e}")


# Need to explicitly monkey patch many common transformer patterns
def mock_module_imports():
    """Mock imports for modules that might attempt to download models"""
    modules_to_mock = [
        "transformers.models.auto.modeling_auto",
        "transformers.models.auto.tokenization_auto",
        "transformers.pipelines",
        "transformers.utils.hub",
        "huggingface_hub.utils._validators",
        "huggingface_hub.file_download",
        "huggingface_hub.hf_api",
    ]

    for module_name in modules_to_mock:
        if module_name not in sys.modules:
            sys.modules[module_name] = MagicMock()
            logger.info(f"Mocked {module_name}")


mock_module_imports()


# Create mock for spacy
class MockNLP:
    def __call__(self, text):
        return MagicMock()

    def __getattr__(self, name):
        return MagicMock()


spacy_mock = MagicMock()
spacy_mock.load = lambda model_name: MockNLP()
sys.modules["spacy"] = spacy_mock

# Override nltk download to be a no-op
nltk_mock = MagicMock()
nltk_mock.download = lambda *args, **kwargs: None
sys.modules["nltk"] = nltk_mock
sys.modules["nltk.tokenize"] = MagicMock()
sys.modules["nltk.corpus"] = MagicMock()

logger.info("All network and model mocks applied! Running pytest with arguments...")

# Run pytest with all args passed to this script
pytest_args = sys.argv[1:]

# Don't allow --log-cli=true flag that's unsupported
if "--log-cli=true" in pytest_args:
    pytest_args.remove("--log-cli=true")
    pytest_args.append("--log-cli-level=DEBUG")  # Use proper flag instead

logger.info(
    f"Running: {sys.executable} -m pytest --log-cli-level=DEBUG {' '.join(pytest_args)}"
)
if len(sys.argv) > 1:
    pytest_args.extend(sys.argv[1:])
else:
    # Default: Run a single test to avoid hanging
    pytest_args.append(
        "tests/api/test_create_order.py::test_create_order_minimum_fields"
    )

result = subprocess.run(
    [sys.executable, "-m", "pytest", "--log-cli-level=DEBUG"] + pytest_args
)
sys.exit(result.returncode)
