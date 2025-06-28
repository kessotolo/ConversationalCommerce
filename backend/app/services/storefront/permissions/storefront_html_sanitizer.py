"""
Storefront HTML Sanitizer

This module contains functions for sanitizing HTML content
to prevent XSS attacks and ensure content safety.
"""

import re
from typing import Dict, List, Set


def sanitize_html_content(content: str) -> str:
    """
    Sanitize HTML content to prevent XSS attacks.

    Args:
        content: HTML content to sanitize

    Returns:
        Sanitized HTML content
    """
    if not content:
        return ""

    # Define allowed tags and attributes
    ALLOWED_TAGS = {
        "a", "b", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
        "i", "img", "li", "ol", "p", "pre", "span", "strong", "table", "tbody",
        "td", "th", "thead", "tr", "ul"
    }

    ALLOWED_ATTRIBUTES: Dict[str, Set[str]] = {
        "a": {"href", "title", "target", "rel"},
        "img": {"src", "alt", "title", "width", "height"},
        "div": {"class", "id", "style"},
        "span": {"class", "id", "style"},
        "table": {"class", "id", "style", "width", "cellpadding", "cellspacing", "border"},
        "td": {"class", "style", "width", "colspan", "rowspan"},
        "th": {"class", "style", "width", "colspan", "rowspan"}
    }

    # Define patterns for tag removal or replacement
    TAG_PATTERN = re.compile(r'<(/?)(\w+)([^>]*?)(/?)>', re.IGNORECASE)
    ATTRIBUTE_PATTERN = re.compile(r'(\w+)(?:\s*=\s*(?:(["\'])([^\\](?:.*?[^\\])?)\2|([^\s>]+)))?', re.IGNORECASE)

    # Remove any script tags and content
    content = re.sub(r'<script\b[^>]*>(.*?)</script>', '', content, flags=re.IGNORECASE | re.DOTALL)

    # Remove any javascript: or data: URLs
    def clean_attribute_value(value: str) -> str:
        value = value.strip()
        lower_value = value.lower()
        if lower_value.startswith(('javascript:', 'data:', 'vbscript:')):
            return ""
        return value

    def sanitize_tag(match):
        tag_close = match.group(1)
        tag_name = match.group(2).lower()
        tag_attrs = match.group(3)
        tag_self_close = match.group(4)

        if tag_name not in ALLOWED_TAGS:
            return ""

        if tag_attrs:
            sanitized_attrs = []
            for attr_match in ATTRIBUTE_PATTERN.finditer(tag_attrs):
                attr_name = attr_match.group(1).lower()
                attr_value = attr_match.group(3) or attr_match.group(4) or ""

                if tag_name in ALLOWED_ATTRIBUTES and attr_name in ALLOWED_ATTRIBUTES[tag_name]:
                    # Clean attribute value
                    clean_value = clean_attribute_value(attr_value)
                    if clean_value:
                        sanitized_attrs.append(f'{attr_name}="{clean_value}"')
            tag_attrs = " " + " ".join(sanitized_attrs) if sanitized_attrs else ""
        else:
            tag_attrs = ""

        return f"<{tag_close}{tag_name}{tag_attrs}{tag_self_close}>"

    # Apply sanitization
    sanitized_content = TAG_PATTERN.sub(sanitize_tag, content)

    return sanitized_content


def is_valid_html(content: str) -> bool:
    """
    Check if HTML content is valid and safe.

    Args:
        content: HTML content to validate

    Returns:
        True if content is valid and safe, False otherwise
    """
    # Simple check for balanced tags
    stack = []
    tag_pattern = re.compile(r'<(/?)(\w+)([^>]*?)(/?)>', re.IGNORECASE)

    for match in tag_pattern.finditer(content):
        is_closing = match.group(1) == '/'
        tag_name = match.group(2).lower()
        is_self_closing = match.group(4) == '/'

        # Ignore self-closing tags
        if is_self_closing:
            continue

        if is_closing:
            # Check for matching opening tag
            if not stack or stack.pop() != tag_name:
                return False
        else:
            # Skip void elements that don't need closing
            if tag_name not in ['img', 'br', 'hr', 'input', 'meta', 'link']:
                stack.append(tag_name)

    # All tags should be balanced
    return len(stack) == 0
