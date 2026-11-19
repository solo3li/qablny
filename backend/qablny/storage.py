import io
import logging
from django.conf import settings
from minio import Minio

logger = logging.getLogger("StorageService")

def get_minio_client() -> Minio:
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )

def get_public_url(object_name: str, bucket: str = "qablny-media") -> str:
    base = settings.MINIO_PUBLIC_URL.rstrip('/')
    return f"{base}/{bucket}/{object_name.lstrip('/')}"

def upload_file(file_data: bytes, object_name: str, content_type: str, bucket: str = "qablny-media") -> str:
    client = get_minio_client()
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            policy = f'''{{
                "Version": "2012-10-17",
                "Statement": [
                    {{
                        "Action": ["s3:GetObject"],
                        "Effect": "Allow",
                        "Principal": "*",
                        "Resource": ["arn:aws:s3:::{bucket}/*"]
                    }}
                ]
            }}'''
            client.set_bucket_policy(bucket, policy)

        client.put_object(
            bucket,
            object_name,
            io.BytesIO(file_data),
            length=len(file_data),
            content_type=content_type or "application/octet-stream"
        )
        return get_public_url(object_name, bucket)
    except Exception as e:
        logger.error(f"Error uploading to MinIO: {e}")
        raise e

def delete_file(object_name: str, bucket: str = "qablny-media") -> None:
    client = get_minio_client()
    try:
        client.remove_object(bucket, object_name)
    except Exception as e:
        logger.error(f"Error deleting from MinIO: {e}")
