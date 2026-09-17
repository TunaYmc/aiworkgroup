import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO
from app.core.config import settings

class S3StorageService:
    """
    Manages isolated object storage for tenants in S3/MinIO.
    """

    def __init__(self):
        self.bucket = settings.S3_BUCKET_NAME
        self.s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.s3.create_bucket(Bucket=self.bucket)
        except Exception:
            pass

    def upload_file(self, file_obj: BinaryIO, storage_key: str, content_type: str) -> str:
        self.s3.upload_fileobj(
            file_obj,
            self.bucket,
            storage_key,
            ExtraArgs={"ContentType": content_type}
        )
        return storage_key

    def download_file(self, storage_key: str) -> Optional[bytes]:
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=storage_key)
            return response["Body"].read()
        except ClientError:
            return None

    def delete_file(self, storage_key: str) -> bool:
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=storage_key)
            return True
        except ClientError:
            return False

    @staticmethod
    def generate_storage_key(organization_id: str, agent_id: Optional[str], file_id: str, filename: str) -> str:
        clean_name = os.path.basename(filename)
        if agent_id:
            return f"tenants/{organization_id}/agents/{agent_id}/files/{file_id}_{clean_name}"
        return f"tenants/{organization_id}/files/{file_id}_{clean_name}"

storage_service = S3StorageService()
