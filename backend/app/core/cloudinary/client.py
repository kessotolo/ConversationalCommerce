import os
from typing import Any, Dict, Optional

import aiofiles
import cloudinary.api
import cloudinary.uploader
from fastapi import UploadFile


class CloudinaryClient:
    @staticmethod
    async def upload_file(
        file: UploadFile,
        folder: str = "conversational_commerce",
        resource_type: str = "auto",
        **options: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Upload a file to Cloudinary.

        Args:
            file: The file to upload
            folder: The folder to upload to
            resource_type: The type of resource (auto, image, video, raw)
            **options: Additional options for the upload

        Returns:
            Dict containing the upload response
        """
        # Create a temporary file
        temp_file = f"/tmp/{file.filename}"
        try:
            # Save the uploaded file temporarily
            async with aiofiles.open(temp_file, "wb") as out_file:
                content = await file.read()
                await out_file.write(content)

            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                temp_file, folder=folder, resource_type=resource_type, **options
            )

            return result
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file):
                os.remove(temp_file)

    @staticmethod
    def get_image_url(
        public_id: str, transformation: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Get a Cloudinary URL for an image with optional transformations.

        Args:
            public_id: The public ID of the image
            transformation: Optional transformation parameters

        Returns:
            The URL of the transformed image
        """
        return cloudinary.utils.cloudinary_url(
            public_id, transformation=transformation
        )[0]

    @staticmethod
    def delete_file(public_id: str) -> Dict[str, Any]:
        """
        Delete a file from Cloudinary.

        Args:
            public_id: The public ID of the file to delete

        Returns:
            Dict containing the deletion response
        """
        return cloudinary.uploader.destroy(public_id)
