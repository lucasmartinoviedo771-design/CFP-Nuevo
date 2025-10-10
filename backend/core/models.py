# backend/core/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone

class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class Programa(TimeStamped):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=200)
    activo = models.BooleanField(default=True)
    def __str__(self): return f"{self.codigo} - {self.nombre}"

class BloqueDeFechas(TimeStamped):
    nombre = models.CharField(max_length=150, unique=True)
    fecha_inicio = models.DateField()

    def __str__(self):
        return self.nombre

class SemanaConfig(TimeStamped):
    CLASE = "CLASE"
    PARCIAL = "PARCIAL"
    FINAL_VIRTUAL = "FINAL_VIRTUAL"
    FINAL_SINC = "FINAL_SINC"
    TIPOS_SEMANA = [
        (CLASE, "Clase"),
        (PARCIAL, "Parcial"),
        (FINAL_VIRTUAL, "Final Virtual"),
        (FINAL_SINC, "Final Sincrónico"),
    ]

    bloque = models.ForeignKey(BloqueDeFechas, on_delete=models.CASCADE, related_name='semanas_config')
    tipo = models.CharField(max_length=20, choices=TIPOS_SEMANA)
    orden = models.PositiveIntegerField()

    class Meta:
        ordering = ['bloque', 'orden']
        unique_together = ('bloque', 'orden')

    def __str__(self):
        return f"{self.bloque.nombre} - Semana {self.orden} ({self.get_tipo_display()})"

class Cohorte(TimeStamped):
    programa = models.ForeignKey(Programa, on_delete=models.CASCADE, related_name="cohortes")
    bloque_fechas = models.ForeignKey(BloqueDeFechas, on_delete=models.PROTECT, related_name="cohortes")
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["-bloque_fechas__fecha_inicio"]

    def __str__(self):
        return self.nombre

def validate_telefono(value):
    if value and (not value.isdigit() or len(value) != 10):
        raise ValidationError('El teléfono debe contener 10 dígitos (4 de característica + 6 de número).')

class Estudiante(TimeStamped):
    # --- Datos Personales Básicos ---
    email = models.EmailField(unique=True, help_text="Correo Electrónico")
    apellido = models.CharField(max_length=120)
    nombre = models.CharField(max_length=120, verbose_name="Nombres")
    dni = models.CharField(max_length=20, unique=True, db_index=True)
    cuit = models.CharField(max_length=20, blank=True, verbose_name="CUIT")
    
    SEXO_OPCIONES = [('Masculino', 'Masculino'), ('Femenino', 'Femenino'), ('Otro', 'Otro')]
    sexo = models.CharField(max_length=20, choices=SEXO_OPCIONES, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)

    # --- Datos de Origen ---
    PAISES_COMUNES = [
        ('Argentina', 'Argentina'), ('Bolivia', 'Bolivia'), ('Brasil', 'Brasil'),
        ('Chile', 'Chile'), ('Paraguay', 'Paraguay'), ('Uruguay', 'Uruguay'),
        ('Otro', 'Otro')
    ]
    pais_nacimiento = models.CharField(max_length=60, choices=PAISES_COMUNES, blank=True)
    pais_nacimiento_otro = models.CharField(max_length=120, blank=True, verbose_name="Otro País de Nacimiento")
    nacionalidad = models.CharField(max_length=60, choices=PAISES_COMUNES, blank=True)
    nacionalidad_otra = models.CharField(max_length=120, blank=True, verbose_name="Otra Nacionalidad")
    lugar_nacimiento = models.CharField(max_length=120, blank=True, verbose_name="Lugar de Nacimiento (Provincia)")

    # --- Datos de Contacto y Domicilio ---
    domicilio = models.CharField(max_length=200, blank=True, verbose_name="Domicilio Particular")
    barrio = models.CharField(max_length=120, blank=True)
    ciudad = models.CharField(max_length=120, blank=True)
    telefono = models.CharField(max_length=10, blank=True, validators=[validate_telefono])

    # --- Datos Académicos y Estatus ---
    NIVEL_EDUCATIVO_OPCIONES = [
        ('Primaria Completa', 'Primaria Completa'),
        ('Secundaria Incompleta', 'Secundaria Incompleta'),
        ('Secundaria Completa', 'Secundaria Completa'),
        ('Terciaria/Universitaria Incompleta', 'Terciaria/Universitaria Incompleta'),
        ('Terciaria/Universitaria Completa', 'Terciaria/Universitaria Completa'),
    ]
    nivel_educativo = models.CharField(max_length=60, choices=NIVEL_EDUCATIVO_OPCIONES, blank=True, verbose_name="Nivel Alcanzado")
    
    ESTATUS_REGULARIDAD = [('Regular', 'Regular'), ('Libre', 'Libre'), ('Baja', 'Baja')]
    estatus = models.CharField(max_length=10, choices=ESTATUS_REGULARIDAD, default='Regular', verbose_name="Estatus de Regularidad")

    # --- Conectividad y Recursos ---
    posee_pc = models.BooleanField(default=False, verbose_name="Posee PC en su Domicilio")
    posee_conectividad = models.BooleanField(default=False, verbose_name="Posee Conectividad a Internet")
    puede_traer_pc = models.BooleanField(default=False, verbose_name="Puede Traer PC a Clase")

    # --- Datos Laborales ---
    trabaja = models.BooleanField(default=False)
    lugar_trabajo = models.CharField(max_length=120, blank=True, verbose_name="Lugar de Trabajo")

    # --- Documentación (Links) ---
    dni_digitalizado = models.URLField(max_length=500, blank=True, verbose_name="DNI digitalizado (Link)")

    def get_approved_bloques(self):
        return Bloque.objects.filter(
            examenes__notas__estudiante=self,
            examenes__notas__aprobado=True,
            examenes__tipo_examen__in=[Examen.FINAL_SINC, Examen.FINAL_VIRTUAL, Examen.EQUIVALENCIA]
        ).distinct()

    def ha_aprobado_bloque(self, bloque):
        return self.notas.filter(
            examen__bloque=bloque,
            examen__tipo_examen__in=[Examen.FINAL_SINC, Examen.FINAL_VIRTUAL, Examen.EQUIVALENCIA],
            aprobado=True
        ).exists()

    def __str__(self): return f"{self.apellido}, {self.nombre} ({self.dni})"

class Bloque(TimeStamped):
    programa = models.ForeignKey(Programa, on_delete=models.CASCADE, related_name="bloques")
    nombre = models.CharField(max_length=120)
    orden = models.PositiveIntegerField(default=1)
    correlativas = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='es_correlativa_de')
    class Meta:
        unique_together = ("programa", "nombre")
        ordering = ["programa_id", "orden", "id"]

class Modulo(TimeStamped):
    bloque = models.ForeignKey(Bloque, on_delete=models.CASCADE, related_name="modulos")
    nombre = models.CharField(max_length=120)
    orden = models.PositiveIntegerField(default=1)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    es_practica = models.BooleanField(default=False)
    asistencia_requerida_practica = models.PositiveIntegerField(default=80)
    class Meta:
        unique_together = ("bloque", "nombre")
        ordering = ["bloque_id", "orden", "id"]

class Examen(TimeStamped):
    PARCIAL = "PARCIAL"
    RECUP = "RECUP"
    FINAL_VIRTUAL = "FINAL_VIRTUAL"
    FINAL_SINC = "FINAL_SINC"
    EQUIVALENCIA = "EQUIVALENCIA"
    TIPOS_EXAMEN = [
        (PARCIAL, "Parcial"), 
        (RECUP, "Recuperatorio"), 
        (FINAL_VIRTUAL, "Final Virtual"), 
        (FINAL_SINC, "Final Sincrónico"),
        (EQUIVALENCIA, "Equivalencia"),
    ]

    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name="examenes", null=True, blank=True)
    bloque = models.ForeignKey(Bloque, on_delete=models.CASCADE, related_name="examenes", null=True, blank=True)
    tipo_examen = models.CharField(max_length=15, choices=TIPOS_EXAMEN)
    fecha = models.DateField(null=True, blank=True)
    peso = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def clean(self):
        if self.modulo and self.bloque:
            raise ValidationError("Un examen no puede pertenecer a un módulo y a un bloque a la vez.")
        if not self.modulo and not self.bloque:
            raise ValidationError("Un examen debe estar asociado a un módulo o a un bloque.")
        if self.modulo and self.tipo_examen not in [self.PARCIAL, self.RECUP]:
            raise ValidationError("Los exámenes de módulo solo pueden ser Parcial o Recuperatorio.")
        if self.bloque and self.tipo_examen not in [self.FINAL_VIRTUAL, self.FINAL_SINC, self.EQUIVALENCIA]:
            raise ValidationError("Los exámenes de bloque solo pueden ser Final Virtual, Final Sincrónico o Equivalencia.")

    class Meta:
        indexes = [
            models.Index(fields=["modulo", "tipo_examen"]),
            models.Index(fields=["bloque", "tipo_examen"]),
        ]

class Inscripcion(TimeStamped):
    INSCRIPTO = "INSCRIPTO"
    ACTIVO = "ACTIVO"
    PAUSADO = "PAUSADO"
    EGRESADO = "EGRESADO"
    ESTADOS = [(INSCRIPTO,"Inscripto"), (ACTIVO,"Activo"), (PAUSADO,"Pausado"), (EGRESADO,"Egresado")]
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="inscripciones")
    cohorte = models.ForeignKey(Cohorte, on_delete=models.CASCADE, related_name="inscripciones")
    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name="inscripciones", null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADOS, default=INSCRIPTO)
    class Meta:
        unique_together = ("estudiante","cohorte", "modulo")
        indexes = [models.Index(fields=["cohorte"])]

class Nota(TimeStamped):
    examen = models.ForeignKey(Examen, on_delete=models.CASCADE, related_name="notas")
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="notas")
    calificacion = models.DecimalField(max_digits=5, decimal_places=2)
    aprobado = models.BooleanField(default=False)
    fecha_calificacion = models.DateTimeField(null=True, blank=True)
    es_equivalencia = models.BooleanField(default=False)
    origen_equivalencia = models.CharField(max_length=255, blank=True)
    fecha_ref_equivalencia = models.DateField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["examen", "estudiante"]),
        ]

    def clean(self):
        tipos_final = [Examen.FINAL_VIRTUAL, Examen.FINAL_SINC, Examen.EQUIVALENCIA]
        if self.es_equivalencia and self.examen and self.examen.tipo_examen not in tipos_final:
            raise ValidationError("La equivalencia solo puede registrarse sobre exámenes de tipo FINAL o EQUIVALENCIA.")
        if self.aprobado and self.calificacion is not None and self.calificacion < 6:
            raise ValidationError("Si 'aprobado=True', la calificación debe ser >= 6.")
        if self.fecha_calificacion is None:
            self.fecha_calificacion = timezone.now()

class Asistencia(TimeStamped):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name="asistencias")
    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name="asistencias")
    fecha = models.DateField()
    presente = models.BooleanField(default=False)
    archivo_origen = models.CharField(max_length=200, blank=True)
    class Meta:
        unique_together = ("estudiante","modulo","fecha")
        indexes = [
            models.Index(fields=["modulo", "fecha"]),
            models.Index(fields=["estudiante", "modulo"]),
        ]

# --- Users & Roles helpers ---
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    must_change_password = models.BooleanField(default=True)

    def __str__(self):
        return f"Profile({self.user.username})"