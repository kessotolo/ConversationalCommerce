from enum import Enum
from typing import Dict, Any

class MessageType(Enum):
    TEXT = "text"
    LOCATION = "location"
    # Add more types as needed (image, file, etc.)

class MessageBuilder:
    def text_message(self, text: str) -> Dict[str, Any]:
        return {
            "type": MessageType.TEXT.value,
            "text": text
        }

    def location_message(self, latitude: float, longitude: float, name: str = "Location") -> Dict[str, Any]:
        return {
            "type": MessageType.LOCATION.value,
            "latitude": latitude,
            "longitude": longitude,
            "name": name
        }