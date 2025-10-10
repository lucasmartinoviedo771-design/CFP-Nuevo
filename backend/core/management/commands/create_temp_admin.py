from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Creates a temporary admin user'

    def handle(self, *args, **kwargs):
        username = 'Admin'
        email = 'lucasmartinoviedo771@gmail.com'
        password = 'talleres486321'
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username, email, password)
            self.stdout.write(self.style.SUCCESS(f'Successfully created superuser: {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'Superuser {username} already exists.'))
