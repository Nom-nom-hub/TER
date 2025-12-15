"""
TER Secret Management Module

Provides unified interface for managing secrets from multiple backends.
"""

from .secret_manager import SecretManager, SecretBackend, AuditFilter, AuditEntry
from .backends.vault import VaultBackend, VaultConfig
from .backends.aws import AWSSecretsManagerBackend, AWSConfig

__all__ = [
    'SecretManager',
    'SecretBackend',
    'AuditFilter',
    'AuditEntry',
    'VaultBackend',
    'VaultConfig',
    'AWSSecretsManagerBackend',
    'AWSConfig',
]
