from django.contrib.auth.models import Group
from rest_framework import permissions


# Role hierarchy (highest first)
ROLE_ORDER = [
    'Admin',
    'Secretaría',
    'Regencia',
    'Coordinación Docente',
    'Docente',
    'Preceptor',
    'Estudiante',
]

ROLE_INDEX = {name: idx for idx, name in enumerate(ROLE_ORDER)}


class IsInAGroup(permissions.BasePermission):
    """
    Custom permission to only allow users in a group.
    """
    def has_permission(self, request, view):
        return request.user.groups.exists()


def get_user_highest_role(user) -> str | None:
    names = list(user.groups.values_list('name', flat=True))
    ranked = [r for r in ROLE_ORDER if r in names]
    return ranked[0] if ranked else None


def can_assign_role(assigner, target_role: str) -> bool:
    """An assigner can assign roles strictly below their highest role.
    Admin can assign any role. Users without a mapped role cannot assign.
    """
    if target_role not in ROLE_INDEX:
        return False
    highest = get_user_highest_role(assigner)
    if highest is None:
        return False
    # Admin can assign all
    if highest == 'Admin':
        return True
    return ROLE_INDEX[target_role] > ROLE_INDEX[highest]


def list_roles():
    return ROLE_ORDER[:]