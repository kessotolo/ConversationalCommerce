#!/usr/bin/env python3
"""
Script to download NLTK and spaCy data without SSL verification issues
"""
import ssl
import nltk

# Create an unverified SSL context to bypass certificate validation
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Download NLTK data
print("Downloading NLTK punkt...")
nltk.download('punkt')
print("Downloading NLTK stopwords...")
nltk.download('stopwords')
print("Downloading NLTK averaged_perceptron_tagger...")
nltk.download('averaged_perceptron_tagger')

print("All NLTK downloads completed successfully!")
