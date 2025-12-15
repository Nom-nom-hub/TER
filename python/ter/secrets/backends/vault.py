"""
HashiCorp Vault Secret Backend (Python Implementation)

Integrates with HashiCorp Vault for secure secret storage.
Supports token, AppRole, JWT, and Kubernetes authentication.
"""

from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass
import asyncio
import json
from abc import ABC

from ..secret_manager import SecretBackend, AuditFilter, AuditEntry


@dataclass
class VaultConfig:
    """Vault configuration"""
    address: str  # e.g., https://vault.example.com:8200
    secret_path: str = 'secret'  # e.g., secret/data
    auth: Dict[str, Any] = None  # Auth config (see below)
    tls_skip_verify: bool = False
    timeout: int = 5  # seconds


class VaultBackend(SecretBackend):
    """
    Vault Secret Backend Implementation

    Supports authentication methods:
    - Token: Direct token auth
    - AppRole: Role ID + Secret ID
    - JWT: JWT token with role
    - Kubernetes: K8s service account token
    """

    def __init__(self, config: VaultConfig):
        """Initialize Vault backend"""
        self.config = config
        self.config.address = self.config.address.rstrip('/')
        self.token: Optional[str] = None
        self.token_expiry: float = 0

        if not self.config.address:
            raise ValueError('Vault address is required')

        if not self.config.auth:
            raise ValueError('Vault auth configuration is required')

    @property
    def name(self) -> str:
        return 'vault'

    async def is_available(self) -> bool:
        """Check if Vault is available and authenticated"""
        try:
            # If we have a valid token, we're good
            import time
            if self.token and time.time() < self.token_expiry:
                return True

            # Try to authenticate
            await self._authenticate()
            return True
        except Exception:
            return False

    async def get_secret(self, key: str) -> Optional[str]:
        """Get a secret from Vault"""
        await self._ensure_authenticated()

        url = f"{self.config.address}/v1/{self.config.secret_path}/data/{key}"
        response = await self._request('GET', url)

        if response['status'] == 404:
            return None

        if response['status'] != 200:
            raise RuntimeError(
                f"Failed to get secret from Vault: {response['status']} {response.get('message')}"
            )

        data = json.loads(response.get('data', '{}'))
        # KV v2 API returns data.data.{key}
        return data.get('data', {}).get('data', {}).get(key)

    async def put_secret(self, key: str, value: str) -> None:
        """Put a secret in Vault"""
        await self._ensure_authenticated()

        url = f"{self.config.address}/v1/{self.config.secret_path}/data/{key}"
        body = json.dumps({'data': {key: value}})

        response = await self._request('POST', url, body)

        if response['status'] != 200:
            raise RuntimeError(
                f"Failed to put secret in Vault: {response['status']} {response.get('message')}"
            )

    async def delete_secret(self, key: str) -> None:
        """Delete a secret from Vault"""
        await self._ensure_authenticated()

        url = f"{self.config.address}/v1/{self.config.secret_path}/data/{key}"
        response = await self._request('DELETE', url)

        if response['status'] != 204:
            raise RuntimeError(
                f"Failed to delete secret from Vault: {response['status']} {response.get('message')}"
            )

    async def list_secrets(self, pattern: Optional[str] = None) -> List[str]:
        """List secrets in Vault"""
        await self._ensure_authenticated()

        if pattern:
            base_path = f"{self.config.secret_path}/data/{pattern}"
        else:
            base_path = f"{self.config.secret_path}/data"

        url = f"{self.config.address}/v1/{base_path}"
        response = await self._request('LIST', url)

        if response['status'] == 404:
            return []

        if response['status'] != 200:
            raise RuntimeError(
                f"Failed to list secrets from Vault: {response['status']} {response.get('message')}"
            )

        data = json.loads(response.get('data', '{}'))
        return data.get('data', {}).get('keys', [])

    async def rotate_secret(self, key: str) -> str:
        """Rotate a secret in Vault"""
        await self._ensure_authenticated()

        # Generate new value
        import secrets
        new_value = secrets.token_hex(32)

        # Update secret
        await self.put_secret(key, new_value)
        return new_value

    async def get_audit_log(self, filter: Optional[AuditFilter] = None) -> List[AuditEntry]:
        """Get audit log from Vault"""
        # Vault audit logs require special endpoint and permissions
        # Returning empty list as placeholder
        return []

    async def close(self) -> None:
        """Close connection"""
        self.token = None

    # Private helpers

    async def _ensure_authenticated(self) -> None:
        """Ensure we have a valid token"""
        import time
        if self.token and time.time() < self.token_expiry:
            return

        await self._authenticate()

    async def _authenticate(self) -> None:
        """Authenticate to Vault using configured method"""
        auth_config = self.config.auth
        method = auth_config.get('method')

        if method == 'token':
            self.token = auth_config.get('token')
            import time
            self.token_expiry = time.time() + 24 * 60 * 60  # 24 hours

        elif method == 'approle':
            await self._authenticate_approle(auth_config)

        elif method == 'jwt':
            await self._authenticate_jwt(auth_config)

        elif method == 'kubernetes':
            await self._authenticate_kubernetes(auth_config)

        else:
            raise ValueError(f"Unknown Vault auth method: {method}")

    async def _authenticate_approle(self, auth: Dict[str, Any]) -> None:
        """Authenticate using AppRole"""
        url = f"{self.config.address}/v1/auth/approle/login"
        body = json.dumps({
            'role_id': auth.get('role_id'),
            'secret_id': auth.get('secret_id'),
        })

        response = await self._request('POST', url, body, skip_auth=True)

        if response['status'] != 200:
            raise RuntimeError(
                f"AppRole authentication failed: {response['status']} {response.get('message')}"
            )

        data = json.loads(response.get('data', '{}'))
        self.token = data.get('auth', {}).get('client_token')
        lease_duration = data.get('auth', {}).get('lease_duration', 3600)

        import time
        self.token_expiry = time.time() + lease_duration

        if not self.token:
            raise RuntimeError('No token received from Vault')

    async def _authenticate_jwt(self, auth: Dict[str, Any]) -> None:
        """Authenticate using JWT"""
        jwt_token = auth.get('jwt')

        # If JWT is callable, call it to get the token
        if callable(jwt_token):
            jwt_token = await jwt_token() if asyncio.iscoroutinefunction(jwt_token) else jwt_token()

        url = f"{self.config.address}/v1/auth/jwt/login"
        body = json.dumps({
            'role': auth.get('role'),
            'jwt': jwt_token,
        })

        response = await self._request('POST', url, body, skip_auth=True)

        if response['status'] != 200:
            raise RuntimeError(
                f"JWT authentication failed: {response['status']} {response.get('message')}"
            )

        data = json.loads(response.get('data', '{}'))
        self.token = data.get('auth', {}).get('client_token')
        lease_duration = data.get('auth', {}).get('lease_duration', 3600)

        import time
        self.token_expiry = time.time() + lease_duration

        if not self.token:
            raise RuntimeError('No token received from Vault')

    async def _authenticate_kubernetes(self, auth: Dict[str, Any]) -> None:
        """Authenticate using Kubernetes service account"""
        # Read service account token from Kubernetes
        service_account_path = auth.get('service_account_path', '/var/run/secrets/kubernetes.io/serviceaccount')
        
        try:
            with open(f"{service_account_path}/token", 'r') as f:
                jwt_token = f.read().strip()
        except IOError as e:
            raise RuntimeError(f"Failed to read Kubernetes service account token: {e}")

        url = f"{self.config.address}/v1/auth/kubernetes/login"
        body = json.dumps({
            'role': auth.get('role'),
            'jwt': jwt_token,
        })

        response = await self._request('POST', url, body, skip_auth=True)

        if response['status'] != 200:
            raise RuntimeError(
                f"Kubernetes authentication failed: {response['status']} {response.get('message')}"
            )

        data = json.loads(response.get('data', '{}'))
        self.token = data.get('auth', {}).get('client_token')
        lease_duration = data.get('auth', {}).get('lease_duration', 3600)

        import time
        self.token_expiry = time.time() + lease_duration

        if not self.token:
            raise RuntimeError('No token received from Vault')

    async def _request(
        self,
        method: str,
        url: str,
        body: Optional[str] = None,
        skip_auth: bool = False,
    ) -> Dict[str, Any]:
        """Make HTTP request to Vault"""
        import aiohttp

        headers: Dict[str, str] = {
            'X-Vault-Request': 'true',
            'Content-Type': 'application/json',
        }

        if self.token and not skip_auth:
            headers['X-Vault-Token'] = self.token

        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method,
                    url,
                    data=body,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.config.timeout),
                    ssl=not self.config.tls_skip_verify,
                ) as response:
                    data = await response.text()
                    return {
                        'status': response.status,
                        'message': response.reason,
                        'data': data,
                    }
        except Exception as e:
            raise RuntimeError(f"Vault request failed: {e}")
