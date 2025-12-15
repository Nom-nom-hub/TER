"""
AWS Secrets Manager Secret Backend (Python Implementation)

Integrates with AWS Secrets Manager for secure secret storage.
Supports IAM roles, credentials, and STS authentication.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

from ..secret_manager import SecretBackend, AuditFilter, AuditEntry


@dataclass
class AWSConfig:
    """AWS Secrets Manager configuration"""
    region: str  # e.g., us-east-1
    auth: Dict[str, Any]  # Auth config
    retry_policy: Optional[Dict[str, Any]] = None
    kms_key_id: Optional[str] = None  # Optional KMS key for encryption


class AWSSecretsManagerBackend(SecretBackend):
    """
    AWS Secrets Manager Backend Implementation

    Supports authentication methods:
    - IAM: Default IAM role (EC2, Lambda, ECS)
    - Credentials: Access key + secret key
    - STS: Assume role via STS
    """

    def __init__(self, config: AWSConfig):
        """Initialize AWS Secrets Manager backend"""
        self.config = config
        self.client = None
        self.initialized = False

        if not self.config.region:
            raise ValueError('AWS region is required')

        if not self.config.retry_policy:
            self.config.retry_policy = {
                'max_retries': 3,
                'backoff_multiplier': 2,
                'initial_delay_ms': 100,
                'max_delay_ms': 5000,
            }

    @property
    def name(self) -> str:
        return 'aws-secrets-manager'

    async def is_available(self) -> bool:
        """Check if AWS Secrets Manager is available"""
        try:
            await self._ensure_initialized()
            return True
        except Exception:
            return False

    async def get_secret(self, key: str) -> Optional[str]:
        """Get a secret from AWS Secrets Manager"""
        await self._ensure_initialized()

        try:
            response = await self._with_retry(
                lambda: self.client.get_secret_value(SecretId=key)
            )

            # Return string value or parse JSON secret
            if 'SecretString' in response:
                secret_string = response['SecretString']
                try:
                    parsed = json.loads(secret_string)
                    return secret_string if isinstance(parsed, str) else json.dumps(parsed)
                except json.JSONDecodeError:
                    return secret_string

            # Binary secret
            if 'SecretBinary' in response:
                return response['SecretBinary']

            return None
        except Exception as e:
            if 'ResourceNotFoundException' in str(e):
                return None
            raise

    async def put_secret(self, key: str, value: str) -> None:
        """Put a secret in AWS Secrets Manager"""
        await self._ensure_initialized()

        try:
            # Check if secret exists
            secret_exists = False
            try:
                self.client.describe_secret(SecretId=key)
                secret_exists = True
            except Exception as e:
                if 'ResourceNotFoundException' not in str(e):
                    raise

            if secret_exists:
                # Update existing secret
                await self._with_retry(
                    lambda: self.client.update_secret(
                        SecretId=key,
                        SecretString=value,
                        ClientRequestToken=self._generate_token(),
                    )
                )
            else:
                # Create new secret
                params = {
                    'Name': key,
                    'SecretString': value,
                    'ClientRequestToken': self._generate_token(),
                }

                if self.config.kms_key_id:
                    params['KmsKeyId'] = self.config.kms_key_id

                await self._with_retry(lambda: self.client.create_secret(**params))
        except Exception as e:
            raise RuntimeError(f"Failed to put secret '{key}' in AWS: {e}")

    async def delete_secret(self, key: str) -> None:
        """Delete a secret from AWS Secrets Manager"""
        await self._ensure_initialized()

        try:
            # Schedule for deletion with immediate purge
            await self._with_retry(
                lambda: self.client.delete_secret(
                    SecretId=key,
                    ForceDeleteWithoutRecovery=True,
                )
            )
        except Exception as e:
            if 'ResourceNotFoundException' not in str(e):
                raise RuntimeError(f"Failed to delete secret '{key}' from AWS: {e}")

    async def list_secrets(self, pattern: Optional[str] = None) -> List[str]:
        """List secrets in AWS Secrets Manager"""
        await self._ensure_initialized()

        try:
            secrets = []
            next_token = None

            while True:
                params: Dict[str, Any] = {}
                if pattern:
                    params['Filters'] = [{'Key': 'name', 'Values': [pattern]}]
                if next_token:
                    params['NextToken'] = next_token

                response = await self._with_retry(lambda: self.client.list_secrets(**params))

                secrets.extend([s['Name'] for s in response.get('SecretList', [])])

                next_token = response.get('NextToken')
                if not next_token:
                    break

            return secrets
        except Exception as e:
            raise RuntimeError(f"Failed to list secrets from AWS: {e}")

    async def rotate_secret(self, key: str) -> str:
        """Rotate a secret in AWS Secrets Manager"""
        await self._ensure_initialized()

        try:
            import secrets
            new_value = secrets.token_hex(32)

            # Update secret with new value
            await self.put_secret(key, new_value)

            # Optional: Configure automatic rotation via Lambda
            # This would require Lambda function setup
            return new_value
        except Exception as e:
            raise RuntimeError(f"Failed to rotate secret '{key}' in AWS: {e}")

    async def get_audit_log(self, filter: Optional[AuditFilter] = None) -> List[AuditEntry]:
        """Get audit log from AWS CloudTrail"""
        # AWS CloudTrail provides audit logs
        # This is a placeholder for CloudTrail integration
        return []

    async def close(self) -> None:
        """Close connection"""
        self.initialized = False
        self.client = None

    # Private helpers

    async def _ensure_initialized(self) -> None:
        """Ensure AWS client is initialized"""
        if self.initialized:
            return

        try:
            import boto3
            from botocore.config import Config

            # Create client config with retry policy
            config = Config(
                region_name=self.config.region,
                retries={'max_attempts': self.config.retry_policy['max_retries']},
            )

            auth_config = self.config.auth
            method = auth_config.get('method')

            if method == 'credentials':
                self.client = boto3.client(
                    'secretsmanager',
                    region_name=self.config.region,
                    aws_access_key_id=auth_config.get('access_key_id'),
                    aws_secret_access_key=auth_config.get('secret_access_key'),
                    aws_session_token=auth_config.get('session_token'),
                    config=config,
                )
            elif method == 'sts':
                # Use STS to assume role
                sts_client = boto3.client('sts')
                assumed_role = sts_client.assume_role(
                    RoleArn=auth_config.get('role_arn'),
                    RoleSessionName=auth_config.get('session_name'),
                    DurationSeconds=auth_config.get('duration', 3600),
                )

                credentials = assumed_role['Credentials']
                self.client = boto3.client(
                    'secretsmanager',
                    region_name=self.config.region,
                    aws_access_key_id=credentials['AccessKeyId'],
                    aws_secret_access_key=credentials['SecretAccessKey'],
                    aws_session_token=credentials['SessionToken'],
                    config=config,
                )
            else:  # method == 'iam'
                self.client = boto3.client(
                    'secretsmanager',
                    region_name=self.config.region,
                    config=config,
                )

            self.initialized = True
        except ImportError:
            raise RuntimeError(
                'Failed to initialize AWS Secrets Manager. '
                'Install boto3 to use AWS backend.'
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize AWS Secrets Manager: {e}")

    async def _with_retry(self, fn, attempt: int = 0) -> Any:
        """Execute function with retry logic"""
        policy = self.config.retry_policy

        try:
            return fn()
        except Exception as e:
            # Don't retry on specific error codes
            if any(x in str(e) for x in ['InvalidParameterException', 'ResourceNotFoundException']):
                raise

            if attempt < policy['max_retries']:
                delay = policy['initial_delay_ms'] / 1000
                delay *= policy['backoff_multiplier'] ** attempt
                delay = min(delay, policy['max_delay_ms'] / 1000)

                import asyncio
                await asyncio.sleep(delay)

                return await self._with_retry(fn, attempt + 1)

            raise

    @staticmethod
    def _generate_token() -> str:
        """Generate random token for request deduplication"""
        import secrets
        return secrets.token_hex(8)
