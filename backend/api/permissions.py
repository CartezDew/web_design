from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_admin)


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        owner_id = getattr(obj, "client_id", None) or getattr(obj, "owner_id", None)
        if owner_id:
            return owner_id == request.user.id
        project = getattr(obj, "project", None)
        return bool(project and project.client_id == request.user.id)
