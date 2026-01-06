"""
Rate Limiting Service - Sliding window rate limiting using Redis
Prevents API abuse and protects against brute force attacks.

Features:
- Per-user rate limiting
- Per-IP rate limiting
- Per-endpoint rate limiting
- Configurable limits and windows
- Redis-backed for distributed systems
"""

import time
import logging
from typing import Tuple, Optional
from functools import wraps
from fastapi import HTTPException, status

from app.services.redis_stream import get_redis_stream_manager

logger = logging.getLogger("sentineliq.rate_limiter")


class RateLimiter:
    """Sliding window rate limiter using Redis."""
    
    def __init__(self, redis_manager=None):
        self.redis = redis_manager or get_redis_stream_manager()
        self.default_window_size = 60  # seconds
        self.default_max_requests = 100  # requests per window
    
    def get_key(self, identifier: str, endpoint: str, window_type: str = "user") -> str:
        """Generate rate limit key for Redis."""
        return f"rate_limit:{window_type}:{identifier}:{endpoint}"
    
    def is_allowed(
        self,
        identifier: str,
        endpoint: str,
        max_requests: int = None,
        window_size: int = None,
        window_type: str = "user"
    ) -> Tuple[bool, dict]:
        """
        Check if request is allowed under rate limit.
        
        Args:
            identifier: User ID, IP address, or unique identifier
            endpoint: API endpoint path (e.g., "/auth/login")
            max_requests: Max requests allowed in window (default: 100)
            window_size: Time window in seconds (default: 60)
            window_type: "user", "ip", or "endpoint"
        
        Returns:
            Tuple of (is_allowed: bool, info: dict with rate limit details)
        """
        max_requests = max_requests or self.default_max_requests
        window_size = window_size or self.default_window_size
        
        key = self.get_key(identifier, endpoint, window_type)
        current_time = time.time()
        window_start = current_time - window_size
        
        try:
            # Get Redis connection
            r = self.redis.get_redis()
            
            # Remove expired entries (older than window)
            r.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            request_count = r.zcard(key)
            
            # Get remaining requests
            remaining = max(0, max_requests - request_count)
            
            # Build response info
            info = {
                "limit": max_requests,
                "remaining": remaining,
                "reset_at": int(current_time + window_size),
                "window_size": window_size
            }
            
            # If at limit, reject
            if request_count >= max_requests:
                logger.warning(
                    f"Rate limit exceeded for {window_type}={identifier} on {endpoint}",
                    extra={
                        "identifier": identifier,
                        "endpoint": endpoint,
                        "current_count": request_count,
                        "limit": max_requests
                    }
                )
                return False, info
            
            # Add current request to window
            r.zadd(key, {str(current_time): current_time})
            r.expire(key, window_size + 1)  # Auto-expire after window
            
            info["remaining"] = remaining - 1  # Account for this request
            return True, info
            
        except Exception as e:
            logger.error(f"Rate limiter error: {str(e)}", extra={"error": str(e)})
            # Fail open on Redis errors (don't block requests if Redis down)
            return True, {"error": "rate_limiter_unavailable"}
    
    def reset_limit(self, identifier: str, endpoint: str, window_type: str = "user") -> bool:
        """Reset rate limit for a specific identifier (e.g., after account unlock)."""
        try:
            key = self.get_key(identifier, endpoint, window_type)
            r = self.redis.get_redis()
            r.delete(key)
            logger.info(f"Reset rate limit for {window_type}={identifier} on {endpoint}")
            return True
        except Exception as e:
            logger.error(f"Error resetting rate limit: {str(e)}")
            return False
    
    def get_status(self, identifier: str, endpoint: str, window_type: str = "user") -> Optional[dict]:
        """Get current rate limit status for an identifier."""
        try:
            key = self.get_key(identifier, endpoint, window_type)
            r = self.redis.get_redis()
            ttl = r.ttl(key)
            count = r.zcard(key)
            
            if count == 0:
                return None
            
            return {
                "current_count": count,
                "expires_in": ttl if ttl > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error getting rate limit status: {str(e)}")
            return None


# Global rate limiter instance
_rate_limiter = None


def get_rate_limiter() -> RateLimiter:
    """Get or create global rate limiter instance."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


def rate_limit(
    max_requests: int = 100,
    window_size: int = 60,
    by: str = "user",
    endpoint: Optional[str] = None
):
    """
    Decorator for rate limiting FastAPI endpoints.
    
    Args:
        max_requests: Max requests in window (default: 100)
        window_size: Time window in seconds (default: 60)
        by: "user", "ip", or "endpoint"
        endpoint: Custom endpoint name (auto-detected if None)
    
    Example:
        @app.post("/auth/login")
        @rate_limit(max_requests=5, window_size=60, by="ip")
        def login(creds: LoginRequest):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Extract identifier and request
            from fastapi import Request
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                return await func(*args, **kwargs)
            
            # Determine identifier based on 'by' parameter
            if by == "ip":
                identifier = request.client.host if request.client else "unknown"
            elif by == "user":
                # Try to get user from request state
                identifier = getattr(request.state, "user_id", None) or request.client.host
            else:
                identifier = request.client.host
            
            ep = endpoint or request.url.path
            limiter = get_rate_limiter()
            allowed, info = limiter.is_allowed(
                identifier=identifier,
                endpoint=ep,
                max_requests=max_requests,
                window_size=window_size,
                window_type=by
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(info["reset_at"])
                    }
                )
            
            # Store rate limit info in request state
            request.state.rate_limit_info = info
            
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Extract identifier and request
            from fastapi import Request
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                return func(*args, **kwargs)
            
            # Determine identifier
            if by == "ip":
                identifier = request.client.host if request.client else "unknown"
            elif by == "user":
                identifier = getattr(request.state, "user_id", None) or request.client.host
            else:
                identifier = request.client.host
            
            ep = endpoint or request.url.path
            limiter = get_rate_limiter()
            allowed, info = limiter.is_allowed(
                identifier=identifier,
                endpoint=ep,
                max_requests=max_requests,
                window_size=window_size,
                window_type=by
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(info["reset_at"])
                    }
                )
            
            request.state.rate_limit_info = info
            return func(*args, **kwargs)
        
        # Use async wrapper if function is async, else sync
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Specific rate limit presets for common scenarios
RATE_LIMITS = {
    "auth_login": {"max_requests": 5, "window_size": 60},      # 5 per minute
    "auth_register": {"max_requests": 3, "window_size": 300},  # 3 per 5 minutes
    "password_reset": {"max_requests": 3, "window_size": 3600},  # 3 per hour
    "api_default": {"max_requests": 100, "window_size": 60},   # 100 per minute
    "api_burst": {"max_requests": 10, "window_size": 10},      # 10 per 10 seconds
}


import asyncio
