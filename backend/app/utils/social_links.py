def generate_whatsapp_link(phone_number: str, product_name: str, caption: str = None) -> str:
    from urllib.parse import quote
    base_url = f"https://wa.me/{phone_number.lstrip('+')}"
    text = caption or f"Hi, I'm interested in {product_name}!"
    return f"{base_url}?text={quote(text)}"


def generate_instagram_dm_link(instagram_handle: str) -> str:
    return f"https://instagram.com/direct/t/{instagram_handle}" if instagram_handle else None


def generate_facebook_page_link(facebook_page: str) -> str:
    return f"https://facebook.com/{facebook_page}" if facebook_page else None


def generate_tiktok_profile_link(tiktok_handle: str) -> str:
    return f"https://www.tiktok.com/@{tiktok_handle}" if tiktok_handle else None
