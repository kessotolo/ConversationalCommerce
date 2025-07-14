import logging
import os
import re
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock

import nltk
import spacy
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from textblob import TextBlob

from app.core.notifications.notification_service import (
    Notification,
    NotificationChannel,
    NotificationPriority,
    notification_service,
)
from app.db.async_session import get_async_session_local
from app.models.content_filter import ContentAnalysisResult, ContentFilterRule

# Skip heavy downloads in test mode
IS_TESTING = os.environ.get("TESTING", "false").lower() == "true"

# Download required NLTK data only if not in testing mode
if not IS_TESTING:
    nltk.download("punkt")
    nltk.download("stopwords")
    nltk.download("averaged_perceptron_tagger")

# Conditionally import Detoxify (very heavy model - 418MB)
if IS_TESTING:
    # Create a mock for Detoxify in test mode
    class MockDetoxify(MagicMock):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)

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

    # Use the mock instead of importing the real Detoxify
    Detoxify = MockDetoxify
    logging.info("Using MockDetoxify for testing")
else:
    try:
        # Only import the heavy model in production
        from detoxify import Detoxify

        logging.info("Imported Detoxify successfully")
    except ImportError:
        logging.error("Failed to import Detoxify; toxicity analysis will be limited")

        # Fallback mock if import fails
        class FallbackDetoxify(MagicMock):
            def predict(self, text):
                return {"toxicity": 0.5}

        Detoxify = FallbackDetoxify

# SpaCy model initialization with proper error handling


def initialize_spacy():
    """Initialize spaCy model with proper error handling and installation attempt"""
    # Return dummy model in testing mode
    if IS_TESTING:
        logging.info("TESTING mode: Returning dummy spaCy model")
        return MagicMock()

    try:
        # Try to load the model directly
        nlp = spacy.load("en_core_web_sm")
        logging.info("Successfully loaded spaCy model 'en_core_web_sm'")
        return nlp
    except OSError:
        logging.warning(
            "SpaCy model 'en_core_web_sm' not found. Attempting to download..."
        )
        try:
            # Try to download the model - proper way using Python API instead of CLI
            import subprocess
            import sys

            logging.info("Downloading spaCy model using subprocess...")
            result = subprocess.run(
                [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                logging.info("Successfully downloaded spaCy model. Loading...")
                nlp = spacy.load("en_core_web_sm")
                logging.info("Successfully loaded spaCy model after download")
                return nlp
            else:
                logging.error(f"Failed to download spaCy model: {result.stderr}")
        except Exception as download_error:
            logging.error(f"Error during spaCy model download: {str(download_error)}")
    except Exception as e:
        logging.error(f"Unknown error loading spaCy model: {str(e)}")

    logging.warning(
        "\n==========================================================\n"
        "IMPORTANT: NLP capabilities will be limited without spaCy model.\n"
        "To enable full NLP analysis, run the following command:\n"
        "python backend/scripts/download_nlp_models.py\n"
        "==========================================================\n"
    )
    return None


# Initialize spaCy model
nlp = initialize_spacy()

logger = logging.getLogger(__name__)

detoxify_model = None
# Only load the actual model if not in testing mode
if not IS_TESTING:
    try:
        from detoxify import Detoxify

        detoxify_model = Detoxify("original")
        logging.info("Loaded Detoxify model successfully")
    except Exception as e:
        logging.warning(
            f"Detoxify not loaded properly. Toxicity detection will be disabled. Error: {e}"
        )
else:
    # In testing mode, use our mock
    detoxify_model = MockDetoxify()
    logging.info("Using MockDetoxify model for testing")


class ContentAnalysisService:
    def __init__(self):
        self.stop_words = set(stopwords.words("english"))

    async def analyze_content(
        self,
        tenant_id: str,
        content_type: str,
        content_id: str,
        field: str,
        content: str,
        rules: Optional[List[ContentFilterRule]] = None,
    ) -> List[ContentAnalysisResult]:
        """Analyze content against filter rules and return results"""
        if not rules:
            rules = await self._get_rules(tenant_id, content_type)

        results = []
        for rule in rules:
            if not rule.enabled:
                continue

            analysis_result = await self._analyze_rule(rule, content)
            if analysis_result:
                results.append(analysis_result)

                # Create notification if content is flagged or rejected
                if analysis_result.status in ["flagged", "rejected"]:
                    await self._create_notification(analysis_result)

        return results

    async def _get_rules(
        self, tenant_id: str, content_type: str
    ) -> List[ContentFilterRule]:
        """Get applicable filter rules for the tenant and content type"""
        db = get_async_session_local()
        try:
            return await db.execute(
                ContentFilterRule.filter(
                    ContentFilterRule.tenant_id == tenant_id,
                    ContentFilterRule.content_type == content_type,
                    ContentFilterRule.enabled,
                )
            )
        finally:
            await db.close()

    async def _analyze_rule(
        self, rule: ContentFilterRule, content: str
    ) -> Optional[ContentAnalysisResult]:
        """Analyze content against a specific rule"""
        try:
            analysis_type = self._get_analysis_type(rule.condition)
            result = await self._perform_analysis(analysis_type, content, rule.value)

            if result:
                return ContentAnalysisResult(
                    tenant_id=rule.tenant_id,
                    rule_id=rule.id,
                    content_type=rule.content_type,
                    field=rule.field,
                    original_content=content,
                    analysis_type=analysis_type,
                    result=result,
                    status=self._determine_status(result, rule),
                    review_status=(
                        "pending" if rule.action == "require_review" else None
                    ),
                )
        except Exception as e:
            logger.error(f"Error analyzing content with rule {rule.id}: {str(e)}")
        return None

    def _get_analysis_type(self, condition: str) -> str:
        """Determine the type of analysis needed based on the condition"""
        if condition in ["contains", "regex"]:
            return "text"
        elif condition == "sentiment":
            return "sentiment"
        elif condition == "language":
            return "language"
        elif condition == "toxicity":
            return "toxicity"
        return "text"

    async def _perform_analysis(
        self, analysis_type: str, content: str, value: str
    ) -> Dict[str, Any]:
        """Perform the specified type of analysis on the content"""
        try:
            if analysis_type == "contains":
                return self._analyze_text(content, value)
            elif analysis_type == "regex":
                return self._analyze_text(content, f"/{value}/")
            elif analysis_type == "sentiment":
                return self._analyze_sentiment(content)
            elif analysis_type == "language":
                result = self._analyze_language(content)
                # If analysis was limited due to missing spaCy, log it
                if result.get("limited_analysis"):
                    logger.info(
                        "Performed limited language analysis due to missing spaCy model"
                    )
                return result
            elif analysis_type == "toxicity":
                return self._analyze_toxicity(content)
            else:
                return {"error": f"Unknown analysis type: {analysis_type}"}
        except Exception as e:
            logger.error(f"Error performing {analysis_type} analysis: {str(e)}")
            return {
                "error": f"Analysis failed: {str(e)}",
                "analysis_type": analysis_type,
            }

    def _analyze_text(self, content: str, pattern: str) -> Dict[str, Any]:
        """Analyze text content for patterns"""
        try:
            # Tokenize and clean text
            tokens = word_tokenize(content.lower())
            tokens = [t for t in tokens if t not in self.stop_words]

            # Check for pattern match
            if pattern.startswith("/") and pattern.endswith("/"):
                # Regex pattern
                regex = pattern[1:-1]
                matches = re.findall(regex, content, re.IGNORECASE)
            else:
                # Simple contains
                matches = [pattern] if pattern.lower() in content.lower() else []

            return {
                "matches": matches,
                "token_count": len(tokens),
                "unique_tokens": len(set(tokens)),
            }
        except Exception as e:
            logger.error(f"Error in text analysis: {str(e)}")
            return {"error": str(e)}

    def _analyze_sentiment(self, content: str) -> Dict[str, Any]:
        """Analyze sentiment of content"""
        try:
            blob = TextBlob(content)
            return {
                "polarity": blob.sentiment.polarity,
                "subjectivity": blob.sentiment.subjectivity,
            }
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {str(e)}")
            return {"error": str(e)}

    def _analyze_language(self, content: str) -> Dict[str, Any]:
        """Analyze language and linguistic features"""
        # If spaCy model is not available, use basic analysis instead
        if nlp is None:
            logger.warning(
                "SpaCy model not available for language analysis, using basic analysis"
            )
            # Fallback to basic TextBlob analysis
            try:
                blob = TextBlob(content)
                return {
                    "entities": [],  # Empty as we can't do NER without spaCy
                    "noun_phrases": blob.noun_phrases,  # TextBlob can extract some noun phrases
                    "pos_tags": blob.tags,  # TextBlob provides basic POS tagging
                    "limited_analysis": True,  # Flag indicating limited analysis
                }
            except Exception as e:
                logger.error(f"Error in fallback language analysis: {str(e)}")
                return {"error": str(e), "limited_analysis": True}

        # If spaCy is available, use full analysis
        try:
            doc = nlp(content)
            return {
                "entities": [ent.text for ent in doc.ents],
                "noun_phrases": [chunk.text for chunk in doc.noun_chunks],
                "pos_tags": [(token.text, token.pos_) for token in doc],
            }
        except Exception as e:
            logger.error(f"Error in language analysis: {str(e)}")
            return {"error": str(e)}

    def _analyze_toxicity(self, content: str) -> Dict[str, Any]:
        """Analyze content for toxic language using Detoxify"""
        if not detoxify_model:
            return {
                "toxicity_score": 0.0,
                "categories": {},
                "error": "Detoxify not installed",
            }
        try:
            results = detoxify_model.predict(content)
            toxicity_score = results.get("toxicity", 0.0)
            return {"toxicity_score": toxicity_score, "categories": results}
        except Exception as e:
            logger.error(f"Error in toxicity analysis: {str(e)}")
            return {"toxicity_score": 0.0, "categories": {}, "error": str(e)}

    def _determine_status(self, result: Dict[str, Any], rule: ContentFilterRule) -> str:
        """Determine the status based on analysis result and rule"""
        if "error" in result:
            return "error"

        if rule.condition == "sentiment":
            threshold = float(rule.value)
            if abs(result["polarity"]) > threshold:
                return "flagged"
        elif rule.condition in ["contains", "regex"]:
            if result["matches"]:
                return "flagged"
        elif rule.condition == "toxicity":
            if result["toxicity_score"] > float(rule.value):
                return "flagged"

        return "passed"

    async def _create_notification(
        self, analysis_result: ContentAnalysisResult
    ) -> None:
        """Create notification for flagged or rejected content"""
        notification = Notification(
            id=str(uuid.uuid4()),
            tenant_id=analysis_result.tenant_id,
            user_id=analysis_result.reviewed_by or "system",
            title=f"Content {analysis_result.status.title()}: {analysis_result.content_type}",
            message=self._format_notification_message(analysis_result),
            priority=self._get_notification_priority(analysis_result),
            channels=[NotificationChannel.IN_APP],
            metadata={
                "content_type": analysis_result.content_type,
                "content_id": analysis_result.content_id,
                "field": analysis_result.field,
                "rule_id": analysis_result.rule_id,
                "analysis_type": analysis_result.analysis_type,
            },
        )
        await notification_service.send_notification(notification)

    def _format_notification_message(
        self, analysis_result: ContentAnalysisResult
    ) -> str:
        """Format notification message for content analysis result"""
        return f"""
Content Analysis Result:
- Type: {analysis_result.content_type}
- Field: {analysis_result.field}
- Status: {analysis_result.status}
- Analysis Type: {analysis_result.analysis_type}

Original Content:
{analysis_result.original_content}

Analysis Results:
{analysis_result.result}

Please review this content and take appropriate action.
"""

    def _get_notification_priority(
        self, analysis_result: ContentAnalysisResult
    ) -> NotificationPriority:
        """Determine notification priority based on analysis result"""
        if analysis_result.status == "rejected":
            return NotificationPriority.HIGH
        return NotificationPriority.MEDIUM


# Create global instance
content_analysis_service = ContentAnalysisService()

# Example async DB access in content analysis


async def analyze_content_async(*args, db=None):
    """
    Async function for analyzing content in the content analysis service.
    This should be implemented to perform content analysis as needed.
    Args:
        *args: Additional arguments for content analysis.
        db: Optional database session or sessionmaker.
    Raises:
        NotImplementedError: This function is a placeholder and must be implemented.
    """
    raise NotImplementedError("analyze_content_async must be implemented.")
