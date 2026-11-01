from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners to edit objects.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_active', True)
            and not getattr(request.user, 'is_locked', False)
            and (request.user.is_owner or request.user.is_staff)
        )

class IsOwnerUser(permissions.BasePermission):
    """
    Custom permission to only allow owners to access the view.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_active', True)
            and not getattr(request.user, 'is_locked', False)
            and (request.user.is_owner or request.user.is_staff)
        )


class IsCustomerUser(permissions.BasePermission):
    """Allow cart and checkout operations for customer accounts as well as staff and owners."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_locked', False):
            return False
        return bool(
            getattr(request.user, 'is_customer', True) or 
            request.user.is_staff or 
            request.user.is_superuser or 
            getattr(request.user, 'is_owner', False)
        )


class IsDeliveryPartnerUser(permissions.BasePermission):
    """Allow access to delivery partner portal operations."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_locked', False):
            return False
        return bool(
            getattr(request.user, 'is_delivery_partner', False) or
            request.user.is_staff or
            request.user.is_superuser or
            getattr(request.user, 'is_owner', False)
        )

