import pytest
from unittest.mock import patch, MagicMock
import json
import hashlib
from fastapi import Request, Response
from starlette import status
from app.core.http.response_optimization import (
    generate_etag,
    set_cache_headers,
    handle_conditional_request,
    optimize_response,
    conditional_response
)

class TestResponseOptimization:
    """Test suite for the HTTP response optimization module."""
    
    def test_generate_etag(self):
        """Test ETag generation for different data types."""
        # Test with dict
        data_dict = {"id": 1, "name": "Test"}
        data_str = json.dumps(data_dict, sort_keys=True)
        expected_etag = hashlib.md5(data_str.encode()).hexdigest()
        
        etag = generate_etag(data_dict)
        assert etag == expected_etag
        
        # Test with list
        data_list = [1, 2, 3]
        data_str = json.dumps(data_list, sort_keys=True)
        expected_etag = hashlib.md5(data_str.encode()).hexdigest()
        
        etag = generate_etag(data_list)
        assert etag == expected_etag
        
        # Test with string
        data_str = "test string"
        expected_etag = hashlib.md5(data_str.encode()).hexdigest()
        
        etag = generate_etag(data_str)
        assert etag == expected_etag
    
    def test_set_cache_headers(self):
        """Test setting cache headers on a response."""
        # Setup
        response = Response()
        
        # Test with default values
        set_cache_headers(response)
        assert response.headers["Cache-Control"] == "public, max-age=300"
        assert "Date" in response.headers
        
        # Test with custom values
        set_cache_headers(
            response=response,
            cache_control="private",
            max_age=600,
            etag="abc123",
            vary="Accept-Language"
        )
        assert response.headers["Cache-Control"] == "private, max-age=600"
        assert response.headers["ETag"] == "abc123"
        assert response.headers["Vary"] == "Accept-Language"
    
    def test_handle_conditional_request_match(self):
        """Test handling conditional request with matching ETag."""
        # Setup
        request = MagicMock()
        response = Response()
        request.headers = {"If-None-Match": "abc123"}
        
        # Execute
        result = handle_conditional_request(request, response, "abc123")
        
        # Verify
        assert result is True
        assert response.status_code == status.HTTP_304_NOT_MODIFIED
        assert response.headers["ETag"] == "abc123"
        assert response.body == b""
        assert "Content-Length" not in response.headers
        assert "Content-Type" not in response.headers
    
    def test_handle_conditional_request_no_match(self):
        """Test handling conditional request with non-matching ETag."""
        # Setup
        request = MagicMock()
        response = Response()
        request.headers = {"If-None-Match": "old-etag"}
        
        # Execute
        result = handle_conditional_request(request, response, "new-etag")
        
        # Verify
        assert result is False
        assert response.status_code == 200  # Default status code
    
    def test_optimize_response(self):
        """Test optimizing a response with caching headers."""
        # Setup
        request = MagicMock()
        response = Response()
        request.headers = {}
        
        data = {"id": 1, "name": "Test"}
        etag = generate_etag(data)
        
        # Execute
        result = optimize_response(data, request, response)
        
        # Verify
        assert result == data
        assert response.headers["ETag"] == etag
        assert response.headers["Cache-Control"] == "public, max-age=300"
        assert response.headers["Vary"] == "Accept, Accept-Encoding, X-Tenant-ID"
    
    def test_optimize_response_with_304(self):
        """Test optimizing a response with 304 Not Modified."""
        # Setup
        request = MagicMock()
        response = Response()
        
        data = {"id": 1, "name": "Test"}
        etag = generate_etag(data)
        request.headers = {"If-None-Match": etag}
        
        # Execute
        result = optimize_response(data, request, response)
        
        # Verify
        assert result is None
        assert response.status_code == status.HTTP_304_NOT_MODIFIED
    
    @pytest.mark.asyncio
    async def test_conditional_response_decorator(self):
        """Test the conditional_response decorator."""
        # Setup
        data = {"id": 1, "name": "Test Product"}
        etag = generate_etag(data)
        
        request = MagicMock()
        response = MagicMock()
        request.headers = {}
        
        # Create decorated function
        @conditional_response(cache_control="public", max_age=600)
        async def test_function(request, response):
            return data
        
        # Execute
        result = await test_function(request, response)
        
        # Verify
        assert result == data
        response.headers.__setitem__.assert_any_call("ETag", etag)
        response.headers.__setitem__.assert_any_call("Cache-Control", "public, max-age=600")
    
    @pytest.mark.asyncio
    async def test_conditional_response_with_304(self):
        """Test the conditional_response decorator with 304 response."""
        # Setup
        data = {"id": 1, "name": "Test Product"}
        etag = generate_etag(data)
        
        request = MagicMock()
        response = MagicMock()
        request.headers = {"If-None-Match": etag}
        
        # Create decorated function
        @conditional_response(cache_control="public", max_age=600)
        async def test_function(request, response):
            return data
        
        # Execute
        result = await test_function(request, response)
        
        # Verify
        assert result is None
        assert hasattr(response, 'status_code')
        assert response.status_code == status.HTTP_304_NOT_MODIFIED
