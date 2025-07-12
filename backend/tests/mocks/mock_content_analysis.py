"""Mock implementation of content analysis service for testing."""

from typing import Dict, Any, List, Optional
from unittest.mock import MagicMock
from backend.app.models.content_filter import ContentFilterRule, ContentAnalysisResult


class MockContentAnalysisService:
    """A mock implementation of ContentAnalysisService for tests."""

    def __init__(self):
        """Initialize with mocked dependencies instead of real NLP models."""
        # Don't load any real NLP models
        self.stop_words = set(["the", "and", "a", "to", "of"])  # Minimal set

    async def analyze_content(
        self,
        tenant_id: str,
        content_type: str,
        content_id: str,
        field: str,
        content: str,
        rules: Optional[List[ContentFilterRule]] = None,
    ) -> ContentAnalysisResult:
        """Mock the content analysis with simple approved result."""
        return ContentAnalysisResult(
            tenant_id=tenant_id,
            content_type=content_type,
            content_id=content_id,
            field=field,
            original_content=content,
            analysis_result={
                "status": "approved",
                "score": 0.1,
                "reason": "Mock analysis for testing",
            },
            status="approved",
        )

    def _get_rules(self, tenant_id: str, content_type: str) -> List[ContentFilterRule]:
        """Mock getting filter rules."""
        return []

    def _analyze_rule(self, rule: ContentFilterRule, content: str) -> Dict[str, Any]:
        """Mock rule analysis."""
        return {"match": False, "score": 0.1}

    def _get_analysis_type(self, condition: str) -> str:
        """Mock analysis type determination."""
        return "text"

    def _perform_analysis(
        self, analysis_type: str, content: str, value: str
    ) -> Dict[str, Any]:
        """Mock analysis performance."""
        return {"match": False, "score": 0.1}

    def _analyze_text(self, content: str, pattern: str) -> Dict[str, Any]:
        """Mock text analysis."""
        return {"match": False, "score": 0.1}

    def _analyze_sentiment(self, content: str) -> Dict[str, Any]:
        """Mock sentiment analysis."""
        return {"polarity": 0.0, "subjectivity": 0.0}

    def _analyze_language(self, content: str) -> Dict[str, Any]:
        """Mock language analysis."""
        return {"tags": {}}

    def _analyze_toxicity(self, content: str) -> Dict[str, Any]:
        """Mock toxicity analysis without loading Detoxify."""
        return {
            "toxicity": 0.01,
            "severe_toxicity": 0.01,
            "obscene": 0.01,
            "identity_attack": 0.01,
            "insult": 0.01,
            "threat": 0.01,
            "sexual_explicit": 0.01,
        }

    def _determine_status(self, result: Dict[str, Any], rule: ContentFilterRule) -> str:
        """Mock status determination."""
        return "approved"

    def _create_notification(self, analysis_result: ContentAnalysisResult) -> None:
        """Mock notification creation."""
        pass

    def _format_notification_message(
        self, analysis_result: ContentAnalysisResult
    ) -> str:
        """Mock notification message formatting."""
        return "Mock notification"

    def _get_notification_priority(self, analysis_result: ContentAnalysisResult) -> str:
        """Mock notification priority determination."""
        return "low"


# Create mock instance to be patched during tests
mock_content_analysis_service = MockContentAnalysisService()


# Async function for mocking analyze_content_async
async def mock_analyze_content_async(*args, db=None):
    """Mock implementation of analyze_content_async."""
    return {"status": "approved", "score": 0.1, "reason": "Mock analysis for testing"}
