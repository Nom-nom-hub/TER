"""
Secret Manager for TER (Python Implementation)

Provides a unified interface for managing secrets from multiple backends.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class AuditFilter:
    """Filter for audit log queries"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    action: Optional[str] = None  # 'get', 'put', 'delete', 'rotate'
    key: Optional[str] = None
    user: Optional[str] = None


@dataclass
class AuditEntry:
    """Audit log entry"""
    timestamp: datetime
    action: str  # 'get', 'put', 'delete', 'rotate'
    key: str
    status: str  # 'success', 'failed'
    user: Optional[str] = None
    error: Optional[str] = None


@dataclass
class CacheConfig:
    """Cache configuration"""
    enabled: bool = True
    ttl: int = 5000  # milliseconds
    max_size: int = 100  # max secrets to cache


class SecretBackend(ABC):
    """Abstract base class for secret backends"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the backend"""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if backend is available"""
        pass

    @abstractmethod
    async def get_secret(self, key: str) -> Optional[str]:
        """Retrieve a secret"""
        pass

    @abstractmethod
    async def put_secret(self, key: str, value: str) -> None:
        """Store a secret"""
        pass

    @abstractmethod
    async def delete_secret(self, key: str) -> None:
        """Delete a secret"""
        pass

    @abstractmethod
    async def list_secrets(self, pattern: Optional[str] = None) -> List[str]:
        """List secrets"""
        pass

    async def rotate_secret(self, key: str) -> str:
        """Rotate a secret (optional, may not be supported by all backends)"""
        raise NotImplementedError(f'{self.name} does not support secret rotation')

    async def get_audit_log(self, filter: Optional[AuditFilter] = None) -> List[AuditEntry]:
        """Get audit log entries (optional, may not be supported by all backends)"""
        return []

    @abstractmethod
    async def close(self) -> None:
        """Close connection and cleanup"""
        pass


@dataclass
class _CachedSecret:
    """Internal cached secret wrapper"""
    value: str
    timestamp: int


class SecretManager:
    """Manages secrets across multiple backends with fallback support"""

    def __init__(
        self,
        backends: List[SecretBackend],
        failover: bool = True,
        cache: Optional[CacheConfig] = None,
        audit: bool = True,
    ):
        """Initialize SecretManager"""
        self.backends = backends
        self.failover = failover
        self.cache_config = cache or CacheConfig()
        self.audit_enabled = audit
        self.cache: Dict[str, _CachedSecret] = {}
        self.audit_log: List[AuditEntry] = []

    async def get_secret(self, key: str) -> str:
        """Get a secret from the first available backend"""
        import time

        # Check cache first
        if self.cache_config.enabled:
            cached = self.cache.get(key)
            if cached and not self._is_cache_expired(cached):
                self._record_audit('get', key, 'success')
                return cached.value

        # Try each backend
        for backend in self.backends:
            try:
                if not await backend.is_available():
                    continue

                value = await backend.get_secret(key)
                if value is not None:
                    # Cache the result
                    if self.cache_config.enabled:
                        self._set_cache_entry(key, value)
                    self._record_audit('get', key, 'success')
                    return value
            except Exception as e:
                self._record_audit('get', key, 'failed', str(e))
                if not self.failover:
                    raise
                continue

        raise RuntimeError(f"Secret '{key}' not found in any backend")

    async def put_secret(self, key: str, value: str) -> None:
        """Store a secret in all configured backends"""
        errors = []

        for backend in self.backends:
            try:
                if not await backend.is_available():
                    continue
                await backend.put_secret(key, value)
                self._record_audit('put', key, 'success')
            except Exception as e:
                self._record_audit('put', key, 'failed', str(e))
                errors.append(e)
                if not self.failover:
                    raise

        # Update cache
        if self.cache_config.enabled:
            self._set_cache_entry(key, value)

        if errors and len(errors) == len(self.backends):
            raise RuntimeError(f"Failed to store secret '{key}' in all backends")

    async def delete_secret(self, key: str) -> None:
        """Delete a secret from all backends"""
        self.cache.pop(key, None)
        errors = []

        for backend in self.backends:
            try:
                if not await backend.is_available():
                    continue
                await backend.delete_secret(key)
                self._record_audit('delete', key, 'success')
            except Exception as e:
                self._record_audit('delete', key, 'failed', str(e))
                errors.append(e)
                if not self.failover:
                    raise

        if errors and len(errors) == len(self.backends):
            raise RuntimeError(f"Failed to delete secret '{key}' from all backends")

    async def list_secrets(self, pattern: Optional[str] = None) -> List[str]:
        """List secrets from the first available backend"""
        for backend in self.backends:
            try:
                if not await backend.is_available():
                    continue
                return await backend.list_secrets(pattern)
            except Exception:
                if not self.failover:
                    raise
                continue

        raise RuntimeError('No backends available for listing secrets')

    async def rotate_secret(self, key: str) -> str:
        """Rotate a secret"""
        for backend in self.backends:
            try:
                if not await backend.is_available():
                    continue

                new_value = await backend.rotate_secret(key)
                self.cache.pop(key, None)
                self._record_audit('rotate', key, 'success')
                return new_value
            except NotImplementedError:
                continue
            except Exception as e:
                self._record_audit('rotate', key, 'failed', str(e))
                if not self.failover:
                    raise
                continue

        raise RuntimeError(f"Secret '{key}' rotation not supported in any backend")

    def get_audit_log(self, filter: Optional[AuditFilter] = None) -> List[AuditEntry]:
        """Get audit log entries"""
        entries = self.audit_log

        if filter:
            if filter.start_time:
                entries = [e for e in entries if e.timestamp >= filter.start_time]
            if filter.end_time:
                entries = [e for e in entries if e.timestamp <= filter.end_time]
            if filter.action:
                entries = [e for e in entries if e.action == filter.action]
            if filter.key:
                entries = [e for e in entries if e.key == filter.key]
            if filter.user:
                entries = [e for e in entries if e.user == filter.user]

        return entries

    def clear_audit_log(self) -> None:
        """Clear audit log"""
        self.audit_log = []

    async def close(self) -> None:
        """Close all backends"""
        for backend in self.backends:
            await backend.close()
        self.cache.clear()

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'size': len(self.cache),
            'max_size': self.cache_config.max_size,
            'ttl': self.cache_config.ttl,
            'entries': [
                {
                    'key': key,
                    'age': self._current_time_ms() - cached.timestamp,
                    'expired': self._is_cache_expired(cached),
                }
                for key, cached in self.cache.items()
            ],
        }

    def clear_cache(self) -> None:
        """Clear cache"""
        self.cache.clear()

    # Private helpers

    def _set_cache_entry(self, key: str, value: str) -> None:
        """Set a cache entry with LRU eviction"""
        if not self.cache_config.enabled:
            return

        # Evict if cache is full
        if self.cache_config.max_size and len(self.cache) >= self.cache_config.max_size:
            first_key = next(iter(self.cache))
            del self.cache[first_key]

        self.cache[key] = _CachedSecret(
            value=value,
            timestamp=self._current_time_ms(),
        )

    def _is_cache_expired(self, cached: _CachedSecret) -> bool:
        """Check if cache entry has expired"""
        if not self.cache_config.ttl:
            return False
        return self._current_time_ms() - cached.timestamp > self.cache_config.ttl

    def _record_audit(
        self,
        action: str,
        key: str,
        status: str,
        error: Optional[str] = None,
    ) -> None:
        """Record audit log entry"""
        if not self.audit_enabled:
            return

        import os

        entry = AuditEntry(
            timestamp=datetime.now(),
            action=action,
            key=key,
            status=status,
            error=error,
            user=os.getenv('USER'),
        )

        self.audit_log.append(entry)

        # Keep audit log size bounded (last 1000 entries)
        if len(self.audit_log) > 1000:
            self.audit_log = self.audit_log[-1000:]

    @staticmethod
    def _current_time_ms() -> int:
        """Get current time in milliseconds"""
        import time
        return int(time.time() * 1000)
