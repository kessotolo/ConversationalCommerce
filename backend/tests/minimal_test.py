"""
A minimal test to verify pytest execution without hanging.
Run this with: python -m pytest tests/minimal_test.py -v
"""
import os
import pytest
import logging
import asyncio

# Force testing mode to skip heavy imports
os.environ['TESTING'] = 'true'

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Simple synchronous test that doesn't use any fixtures
def test_minimal():
    """Most basic test to verify pytest works"""
    print("\n==== MINIMAL TEST RUNNING ====")
    assert 1 == 1
    print("==== MINIMAL TEST PASSED ====\n")
    
# Simple async test that doesn't use any fixtures
@pytest.mark.asyncio
async def test_minimal_async():
    """Simple async test without fixtures"""
    print("\n==== MINIMAL ASYNC TEST RUNNING ====")
    await asyncio.sleep(0.1)  # Very short sleep
    assert 1 == 1
    print("==== MINIMAL ASYNC TEST PASSED ====\n")
