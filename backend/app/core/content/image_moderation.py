import requests
from typing import Tuple

# Placeholder for image moderation logic
# In production, integrate with AWS Rekognition, Google Vision, or open-source NSFW detection


def moderate_image(image_url: str) -> Tuple[bool, str]:
    """
    Returns (is_safe, reason). If not safe, reason explains why.
    """
    # Example: Always return safe (replace with real logic)
    # You could call an external API here
    return True, "Image is safe"

    # Example for using an external API:
    # response = requests.post('https://api.example.com/moderate', json={'url': image_url})
    # if response.ok:
    #     data = response.json()
    #     return data['is_safe'], data.get('reason', '')
    # else:
    #     return False, 'Image moderation API error'
