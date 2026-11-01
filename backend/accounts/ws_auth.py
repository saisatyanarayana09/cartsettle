import logging
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string: str):
    """
    Validates a SimpleJWT access token and returns the corresponding User object.
    Returns AnonymousUser if token is missing, expired, or invalid.
    """
    if not token_string:
        return AnonymousUser()
    try:
        validated_token = AccessToken(token_string)
        user_id = validated_token.get('user_id')
        if not user_id:
            return AnonymousUser()
        user = User.objects.get(id=user_id, is_active=True)
        return user
    except (InvalidToken, TokenError) as e:
        logger.debug("WebSocket JWT validation failed: %s", e)
        return AnonymousUser()
    except User.DoesNotExist:
        logger.debug("WebSocket JWT user does not exist or is inactive (user_id=%s)", user_id)
        return AnonymousUser()
    except Exception as e:
        logger.error("Unexpected error in get_user_from_token: %s", e)
        return AnonymousUser()


class JwtAuthMiddleware:
    """
    Custom ASGI Middleware for authenticating WebSocket connections using SimpleJWT.
    Extracts the JWT access token from:
      1. Query parameters: ?token=<jwt_access_token>
      2. Headers: Authorization: Bearer <jwt_access_token>
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "websocket":
            token = None

            # 1. Check Query String (?token=...)
            query_string = scope.get("query_string", b"").decode("utf-8")
            if query_string:
                query_params = parse_qs(query_string)
                if "token" in query_params and query_params["token"]:
                    token = query_params["token"][0]

            # 2. Fallback to Authorization Header
            if not token:
                headers = dict(scope.get("headers", []))
                auth_header = headers.get(b"authorization", b"").decode("utf-8")
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ", 1)[1].strip()

            scope["user"] = await get_user_from_token(token)

        return await self.inner(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    """Convenience wrapper matching Channels naming convention."""
    return JwtAuthMiddleware(inner)
