"""
Applied at the start of pytest to patch heavy dependencies before they're imported.
This file is executed by modifying PYTHONPATH to include its directory and using the -p flag.
"""

import sys
import os
from unittest.mock import MagicMock

# Set testing environment variable
os.environ["TESTING"] = "true"

# Create patch for heavy NLP libraries before they are imported
sys.modules["detoxify"] = MagicMock()


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
sys.modules["detoxify.detoxify"] = MagicMock()
sys.modules["detoxify.detoxify"].Detoxify = MockDetoxify


# Patch spacy before it's imported
class MockNLP:
    def __call__(self, text):
        return MagicMock()


sys.modules["spacy"] = MagicMock()
sys.modules["spacy"].load = lambda model_name: MockNLP()

# Override nltk download to be a no-op
sys.modules["nltk"] = MagicMock()
sys.modules["nltk"].download = lambda *args, **kwargs: None
