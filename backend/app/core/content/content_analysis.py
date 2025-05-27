from typing import Dict, Any, List, Optional
import re
from datetime import datetime
import logging
from textblob import TextBlob
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import spacy
from app.db.session import SessionLocal
from app.models.content_filter import ContentFilterRule, ContentAnalysisResult
from app.core.notifications.notification_service import (
    Notification,
    NotificationPriority,
    NotificationChannel,
    notification_service
)

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('averaged_perceptron_tagger')

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logging.warning("Downloading spaCy model...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

logger = logging.getLogger(__name__)

try:
    from detoxify import Detoxify
    detoxify_model = Detoxify('original')
except ImportError:
    detoxify_model = None
    logging.warning(
        "Detoxify not installed. Toxicity detection will be disabled.")


class ContentAnalysisService:
    def __init__(self):
        self.stop_words = set(stopwords.words('english'))

    async def analyze_content(
        self,
        tenant_id: str,
        content_type: str,
        content_id: str,
        field: str,
        content: str,
        rules: Optional[List[ContentFilterRule]] = None
    ) -> List[ContentAnalysisResult]:
        """Analyze content against filter rules and return results"""
        if not rules:
            rules = self._get_rules(tenant_id, content_type)

        results = []
        for rule in rules:
            if not rule.enabled:
                continue

            analysis_result = await self._analyze_rule(rule, content)
            if analysis_result:
                results.append(analysis_result)

                # Create notification if content is flagged or rejected
                if analysis_result.status in ['flagged', 'rejected']:
                    await self._create_notification(analysis_result)

        return results

    def _get_rules(self, tenant_id: str, content_type: str) -> List[ContentFilterRule]:
        """Get applicable filter rules for the tenant and content type"""
        db = SessionLocal()
        try:
            return db.query(ContentFilterRule).filter(
                ContentFilterRule.tenant_id == tenant_id,
                ContentFilterRule.content_type == content_type,
                ContentFilterRule.enabled == True
            ).all()
        finally:
            db.close()

    async def _analyze_rule(
        self,
        rule: ContentFilterRule,
        content: str
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
                    review_status='pending' if rule.action == 'require_review' else None
                )
        except Exception as e:
            logger.error(
                f"Error analyzing content with rule {rule.id}: {str(e)}")
        return None

    def _get_analysis_type(self, condition: str) -> str:
        """Determine the type of analysis needed based on the condition"""
        if condition in ['contains', 'regex']:
            return 'text'
        elif condition == 'sentiment':
            return 'sentiment'
        elif condition == 'language':
            return 'language'
        elif condition == 'toxicity':
            return 'toxicity'
        return 'text'

    async def _perform_analysis(
        self,
        analysis_type: str,
        content: str,
        value: str
    ) -> Dict[str, Any]:
        """Perform the specified type of analysis on the content"""
        if analysis_type == 'text':
            return self._analyze_text(content, value)
        elif analysis_type == 'sentiment':
            return self._analyze_sentiment(content)
        elif analysis_type == 'language':
            return self._analyze_language(content)
        elif analysis_type == 'toxicity':
            return self._analyze_toxicity(content)
        return {}

    def _analyze_text(self, content: str, pattern: str) -> Dict[str, Any]:
        """Analyze text content for patterns"""
        try:
            # Tokenize and clean text
            tokens = word_tokenize(content.lower())
            tokens = [t for t in tokens if t not in self.stop_words]

            # Check for pattern match
            if pattern.startswith('/') and pattern.endswith('/'):
                # Regex pattern
                regex = pattern[1:-1]
                matches = re.findall(regex, content, re.IGNORECASE)
            else:
                # Simple contains
                matches = [pattern] if pattern.lower(
                ) in content.lower() else []

            return {
                'matches': matches,
                'token_count': len(tokens),
                'unique_tokens': len(set(tokens))
            }
        except Exception as e:
            logger.error(f"Error in text analysis: {str(e)}")
            return {'error': str(e)}

    def _analyze_sentiment(self, content: str) -> Dict[str, Any]:
        """Analyze sentiment of content"""
        try:
            blob = TextBlob(content)
            return {
                'polarity': blob.sentiment.polarity,
                'subjectivity': blob.sentiment.subjectivity
            }
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {str(e)}")
            return {'error': str(e)}

    def _analyze_language(self, content: str) -> Dict[str, Any]:
        """Analyze language and linguistic features"""
        try:
            doc = nlp(content)
            return {
                'entities': [ent.text for ent in doc.ents],
                'noun_phrases': [chunk.text for chunk in doc.noun_chunks],
                'pos_tags': [(token.text, token.pos_) for token in doc]
            }
        except Exception as e:
            logger.error(f"Error in language analysis: {str(e)}")
            return {'error': str(e)}

    def _analyze_toxicity(self, content: str) -> Dict[str, Any]:
        """Analyze content for toxic language using Detoxify"""
        if not detoxify_model:
            return {
                'toxicity_score': 0.0,
                'categories': {},
                'error': 'Detoxify not installed'
            }
        try:
            results = detoxify_model.predict(content)
            toxicity_score = results.get('toxicity', 0.0)
            return {
                'toxicity_score': toxicity_score,
                'categories': results
            }
        except Exception as e:
            logger.error(f"Error in toxicity analysis: {str(e)}")
            return {
                'toxicity_score': 0.0,
                'categories': {},
                'error': str(e)
            }

    def _determine_status(
        self,
        result: Dict[str, Any],
        rule: ContentFilterRule
    ) -> str:
        """Determine the status based on analysis result and rule"""
        if 'error' in result:
            return 'error'

        if rule.condition == 'sentiment':
            threshold = float(rule.value)
            if abs(result['polarity']) > threshold:
                return 'flagged'
        elif rule.condition in ['contains', 'regex']:
            if result['matches']:
                return 'flagged'
        elif rule.condition == 'toxicity':
            if result['toxicity_score'] > float(rule.value):
                return 'flagged'

        return 'passed'

    async def _create_notification(self, analysis_result: ContentAnalysisResult) -> None:
        """Create notification for flagged or rejected content"""
        notification = Notification(
            id=str(uuid.uuid4()),
            tenant_id=analysis_result.tenant_id,
            user_id=analysis_result.reviewed_by or 'system',
            title=f"Content {analysis_result.status.title()}: {analysis_result.content_type}",
            message=self._format_notification_message(analysis_result),
            priority=self._get_notification_priority(analysis_result),
            channels=[NotificationChannel.IN_APP],
            metadata={
                'content_type': analysis_result.content_type,
                'content_id': analysis_result.content_id,
                'field': analysis_result.field,
                'rule_id': analysis_result.rule_id,
                'analysis_type': analysis_result.analysis_type
            }
        )
        await notification_service.send_notification(notification)

    def _format_notification_message(self, analysis_result: ContentAnalysisResult) -> str:
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

    def _get_notification_priority(self, analysis_result: ContentAnalysisResult) -> NotificationPriority:
        """Determine notification priority based on analysis result"""
        if analysis_result.status == 'rejected':
            return NotificationPriority.HIGH
        return NotificationPriority.MEDIUM


# Create global instance
content_analysis_service = ContentAnalysisService()
