from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group

class Command(BaseCommand):
    help = "Assigns the 'Admin' user to the 'Admin' group."

    def handle(self, *args, **kwargs):
        try:
            user = User.objects.get(username='Admin')
            admin_group = Group.objects.get(name='Admin')
            user.groups.add(admin_group)
            user.save()
            self.stdout.write(self.style.SUCCESS("Successfully assigned 'Admin' user to 'Admin' group."))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("User 'Admin' not found."))
        except Group.DoesNotExist:
            self.stdout.write(self.style.ERROR("Group 'Admin' not found. Please run 'init_roles' first."))
