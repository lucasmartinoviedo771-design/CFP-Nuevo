# Sistema de Gestión Académica (CFP)

## 1. Resumen General

Este es un sistema Full-Stack diseñado para la gestión integral de una institución académica. Permite administrar desde la estructura de los cursos y sus calendarios hasta la inscripción, seguimiento y calificación de los estudiantes.

La aplicación se compone de un backend desarrollado con **Django REST Framework** y un frontend interactivo construido con **React**.

---

## 2. Conceptos Fundamentales

Para usar el sistema eficazmente, es crucial entender cómo se organizan los datos:

*   **Programa (Curso):** Es la plantilla maestra de una materia o capacitación (ej: "Desarrollador Web Full-Stack"). No tiene fechas y define "qué" se enseña. Se gestiona en la sección **"Capacitaciones / Cursos"**.

*   **Estructura Académica:** Es el esqueleto de contenidos de un `Programa`. Aquí se define la jerarquía de **Bloques -> Módulos** que componen un curso. Se gestiona en la sección **"Estructura Académica"**.

*   **Calendario Académico:** Es una plantilla de tiempo reutilizable (ej: "Cursada Verano 2025"). Define "cuándo" suceden las cosas, mediante una secuencia ordenada de semanas (Clase, Parcial, Final, etc.). Se gestiona en **"Calendario Académico"**.

*   **Cohorte:** Es el concepto que une todo. Una cohorte representa una instancia específica de un curso que se dicta en un momento determinado. **Vincula un `Programa` con un `Calendario Académico`**. Se gestiona en la sección **"Cohortes"**.

*   **Inscripción:** Es la acción de anotar un `Estudiante` a una `Cohorte` específica.

---

## 3. Flujo de Trabajo Principal (Paso a Paso)

Este es el orden recomendado para crear y gestionar una cursada completa desde cero.

### Paso 1: Definir los Programas Maestros

1.  Ve a **"Capacitaciones / Cursos"**.
2.  Crea los programas de estudio que ofreces (ej: "Diseño UX/UI", "Marketing Digital"). Por ahora, solo necesitas el nombre y el código.

### Paso 2: Definir la Estructura de los Cursos

1.  Ve a **"Estructura Académica"**.
2.  Selecciona un programa de la lista.
3.  Añade los **Bloques**, y finalmente los **Módulos** dentro de cada bloque. Esta es la estructura de contenidos del curso.

### Paso 3: Crear las Plantillas de Calendario

1.  Ve a **"Calendario Académico"**.
2.  Crea un nuevo **"Bloque de Fechas"** (ej: "1er Cuatrimestre 2025") y asígnale una fecha de inicio.
3.  Haz clic en **"Gestionar Secuencia"** para definir la secuencia de semanas (semana de clase, de parcial, de final, etc.).

### Paso 4: Crear la Cohorte (La Cursada)

1.  Ve a la nueva sección **"Cohortes"**.
2.  Haz clic en **"Crear Cohorte"**.
3.  Dale un nombre identificativo (ej: "DW-2025-MAÑANA").
4.  Selecciona el **Programa** que quieres dictar y el **Calendario** que quieres usar.

### Paso 5: Inscribir Estudiantes

1.  Ve a **"Inscripciones"**.
2.  Selecciona un estudiante.
3.  Selecciona la **Cohorte** a la que quieres inscribirlo.
4.  Haz clic en "Inscribir".

---

## 4. Descripción de Módulos

*   **Dashboard:** Vista general con indicadores y estadísticas clave.
*   **Estudiantes:** Gestión de la información personal y de contacto de los alumnos.
*   **Capacitaciones / Cursos:** Creación y gestión de los programas de estudio (plantillas maestras).
*   **Calendario Académico:** Creación y gestión de las plantillas de calendarios (secuencias de semanas).
*   **Cohortes:** Creación y gestión de las cursadas, uniendo un curso con un calendario.
*   **Inscripciones:** Herramienta para inscribir estudiantes a las cohortes.
*   **Asistencia:** Módulo para el seguimiento de la asistencia de los alumnos (futuro desarrollo).
*   **Notas / Equivalencias:** Carga y consulta de las calificaciones de los alumnos.
*   **Estructura Académica:** Herramienta para definir la jerarquía de contenidos de cada programa.