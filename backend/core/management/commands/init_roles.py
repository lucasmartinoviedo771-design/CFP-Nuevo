from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission, User


# Hierarchy (highest first)
ROLE_NAMES = [
    'Admin',
    'Secretaría',
    'Regencia',
    'Coordinación',
    'Preceptor',
    'Docente',
    'Estudiante',
]


class Command(BaseCommand):
    help = "Create default role groups and optionally assign an admin user."

    def add_arguments(self, parser):
        parser.add_argument(
            '--assign-admin', dest='assign_admin', default=None,
            help='Username to add to Admin group (optional).'
        )
        parser.add_argument(
            '--reset', action='store_true', default=False,
            help='If provided, clears existing permissions on Admin group before assigning all.'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Initializing default roles...'))

        created = []
        for name in ROLE_NAMES:
            group, was_created = Group.objects.get_or_create(name=name)
            if was_created:
                created.append(name)
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created groups: {", ".join(created)}'))
        else:
            self.stdout.write('Groups already existed; nothing to create.')

        # Give Admin group all permissions
        try:
            admin_group = Group.objects.get(name='Admin')
        except Group.DoesNotExist:
            self.stderr.write(self.style.ERROR('Admin group missing'))
            return

        if options['reset']:
            admin_group.permissions.clear()

        all_perms = Permission.objects.all()
        admin_group.permissions.set(all_perms)
        self.stdout.write(self.style.SUCCESS('Assigned all permissions to Admin group.'))

        username = options.get('assign_admin')
        if username:
            try:
                user = User.objects.get(username=username)
                user.groups.add(admin_group)
                self.stdout.write(self.style.SUCCESS(f'Added user "{username}" to Admin group.'))
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'User "{username}" not found.'))

        self.stdout.write(self.style.SUCCESS('Done.'))
