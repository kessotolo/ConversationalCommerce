from urllib.parse import quote, urlencode
from typing import Dict, Optional, Any


def generate_whatsapp_link(phone_number: str, product_name: str, caption: str = None) -> str:
    """
    Generate a WhatsApp share link with the given text.
    
    Args:
        phone_number: The business WhatsApp number (with or without +)
        product_name: Name of the product (used if no caption is provided)
        caption: Optional custom message to include
        
    Returns:
        WhatsApp share link
    """
    # Clean phone number - remove any non-numeric characters except for the leading +
    clean_number = phone_number.lstrip('+')
    # Ensure it only has digits
    if not clean_number.isdigit():
        clean_number = ''.join(c for c in clean_number if c.isdigit())
        
    base_url = f"https://wa.me/{clean_number}"
    text = caption or f"Hi, I'm interested in {product_name}!"
    return f"{base_url}?text={quote(text)}"


def generate_instagram_share(instagram_handle: str, caption: str = None, image_url: str = None) -> Dict[str, str]:
    """
    Generate Instagram sharing information. Note that Instagram doesn't support direct
    sharing through URLs (except for posts) due to their API limitations.
    
    Returns both a DM link and instructions for Stories sharing.
    """
    dm_link = f"https://instagram.com/direct/t/{instagram_handle}" if instagram_handle else None
    profile_link = f"https://instagram.com/{instagram_handle.lstrip('@')}" if instagram_handle else None
    
    return {
        "dm_link": dm_link,
        "profile_link": profile_link,
        "caption": caption,
        "image_url": image_url,
        "instructions": "To share on Instagram Stories, save the product image and upload it to your Story, then add a link sticker with the product URL."
    }


def generate_facebook_share_link(url: str, quote: str = None, hashtag: str = None) -> str:
    """
    Generate a Facebook share link for the given URL.
    
    Args:
        url: The URL to share
        quote: Optional text to accompany the shared link
        hashtag: Optional hashtag (without the # symbol)
        
    Returns:
        Facebook share link
    """
    base_url = "https://www.facebook.com/sharer/sharer.php"
    params = {"u": url}
    
    if quote:
        params["quote"] = quote
    if hashtag:
        params["hashtag"] = f"#{hashtag}" if not hashtag.startswith('#') else hashtag
        
    return f"{base_url}?{urlencode(params)}"


def generate_facebook_page_link(facebook_page: str) -> str:
    """
    Generate a link to a Facebook page.
    """
    return f"https://facebook.com/{facebook_page}" if facebook_page else None


def generate_tiktok_share(tiktok_handle: str, caption: str = None) -> Dict[str, str]:
    """
    Generate TikTok sharing information. Like Instagram, TikTok doesn't support
    direct URL sharing (except for profile links).
    
    Returns profile link and sharing instructions.
    """
    profile_link = f"https://www.tiktok.com/@{tiktok_handle.lstrip('@')}" if tiktok_handle else None
    
    return {
        "profile_link": profile_link,
        "caption": caption,
        "instructions": "To share on TikTok, create a video showcasing the product and add the product URL to your bio or comment section."
    }


def generate_twitter_share_link(url: str, text: str = None, hashtags: list = None, via: str = None) -> str:
    """
    Generate a Twitter (X) share link for the given URL.
    
    Args:
        url: The URL to share
        text: Optional text for the tweet
        hashtags: Optional list of hashtags (without the # symbol)
        via: Optional Twitter username to attribute the share to
        
    Returns:
        Twitter share link
    """
    base_url = "https://twitter.com/intent/tweet"
    params = {"url": url}
    
    if text:
        params["text"] = text
    if hashtags and isinstance(hashtags, list):
        params["hashtags"] = ",".join(h.lstrip('#') for h in hashtags)
    if via:
        params["via"] = via.lstrip('@')
        
    return f"{base_url}?{urlencode(params)}"


def generate_telegram_share_link(url: str, text: str = None) -> str:
    """
    Generate a Telegram share link for the given URL.
    
    Args:
        url: The URL to share
        text: Optional text to accompany the URL
        
    Returns:
        Telegram share link
    """
    base_url = "https://t.me/share/url"
    params = {"url": url}
    
    if text:
        params["text"] = text
        
    return f"{base_url}?{urlencode(params)}"
