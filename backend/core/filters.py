# backend/core/filters.py
import django_filters
from django.db.models import Q
from .models import Estudiante

# Se definen las opciones para el filtro, incluyendo casos especiales
ESTATUS_FILTER_CHOICES = (
    ('', 'Activos'),
    ('Todos', 'Todos'),
    ('Regular', 'Regular'),
    ('Libre', 'Libre'),
    ('Baja', 'Baja'),
)

class EstudianteFilter(django_filters.FilterSet):
    nombre_apellido = django_filters.CharFilter(method='filter_by_nombre_apellido', label="Buscar por Nombre o Apellido")
    dni = django_filters.CharFilter(field_name='dni', lookup_expr='icontains')
    email = django_filters.CharFilter(field_name='email', lookup_expr='icontains')
    ciudad = django_filters.CharFilter(field_name='ciudad', lookup_expr='icontains')
    fecha_inscripcion = django_filters.DateFromToRangeFilter(field_name='created_at')
    estatus = django_filters.ChoiceFilter(
        choices=ESTATUS_FILTER_CHOICES, 
        method='filter_by_estatus', 
        label='Estatus'
    )

    class Meta:
        model = Estudiante
        fields = ['dni', 'email', 'ciudad', 'nombre_apellido', 'fecha_inscripcion', 'estatus']

    def filter_by_nombre_apellido(self, queryset, name, value):
        return queryset.filter(
            Q(nombre__icontains=value) | Q(apellido__icontains=value)
        )

    def filter_by_estatus(self, queryset, name, value):
        if value == 'Todos':
            return queryset
        if value == '': # Valor por defecto para 'Activos'
            return queryset.exclude(estatus='Baja')
        # Para 'Regular', 'Libre', 'Baja', se filtra con el valor exacto
        return queryset.filter(estatus=value)
