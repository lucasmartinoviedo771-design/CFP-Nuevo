# Backend (Django) â€“ ConfiguraciÃ³n y Puesta en Marcha

Este documento cubre variables de entorno, arranque local y notas de producción para el backend.

## Variables de Entorno (.env)

El backend usa `django-environ` y carga variables desde `backend/.env` en desarrollo. En producción, configura variables del sistema.

1) Copia el ejemplo: `backend/.env.example` â†’ `backend/.env`
2) Ajusta valores (clave secreta, DB, CORS/CSRF, etc.)
3) No comitees `backend/.env` (estÃ¡ en `.gitignore`).

Claves relevantes:
- `DJANGO_SECRET_KEY`: clave secreta de Django
- `DJANGO_DEBUG`: `True/False`
- `DJANGO_ALLOWED_HOSTS`: hosts separados por coma
- `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`: URLs exactas (incluye protocolo y puerto)
- `SIMPLE_JWT_ACCESS_HOURS`, `SIMPLE_JWT_REFRESH_DAYS` (opcional)

## Puesta en Marcha (Desarrollo)

Requisitos: Python 3.12+, MySQL accesible.

- Instalar dependencias: `pip install -r requirements.txt`
- Migraciones: `python backend/manage.py migrate`
- (Opcional) Superusuario: `python backend/manage.py createsuperuser`
- Servidor dev: `python backend/manage.py runserver 0.0.0.0:8000`

Endpoints Ãºtiles:
- Auth JWT: `POST /api/token/`, `POST /api/token/refresh/`, `POST /api/logout/`
- Usuario actual: `GET /api/user/`
- DocumentaciÃ³n: `/api/docs/` (Swagger), `/api/redoc/`, `/api/schema`

### PaginaciÃ³n por defecto (DRF)

- Todos los listados devuelven pÃ¡ginas con `?page=` y `?page_size=`.
- TamaÃ±o por defecto configurable por env: `DRF_PAGE_SIZE` (por defecto 25).
- LÃ­mite superior por env: `DRF_MAX_PAGE_SIZE` (por defecto 200).

### Analytics & Caché

- Endpoints de analÃ­tica:
  - `GET /api/analytics/enrollments/` (series por mes)
  - `GET /api/analytics/attendance/` (por mÃ³dulo o semana)
  - `GET /api/analytics/grades/` (tasa aprobaciÃ³n e histograma)
  - `GET /api/analytics/dropout/` (deserciÃ³n: regla A/B)
- Caché por vista activada (por defecto 300s). Configurable con `ANALYTICS_CachéSECONDS`.
- Backend de Caché por defecto: locmem. Cambia `CachéBACKEND`/`CachéLOCATION` en `.env` para MemCaché/Redis en producción.

## Notas de producción

- `DJANGO_DEBUG=False`, define `DJANGO_ALLOWED_HOSTS` con tu dominio
- Configura CORS/CSRF con URLs reales (`https://...`) del frontend
- Cookies seguras si usas HTTPS: `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`
- Usa WSGI/ASGI (gunicorn/uvicorn) detrás de Nginx/Apache
- Gestiona variables de entorno en el host/orquestador (no `.env` en el repo)

## Flujo de Autenticación (Resumen)

- SimpleJWT con rotación de refresh y blacklist habilitado
- El frontend renueva tokens en 401 y hace logout que revoca el refresh
- `GET /api/user/` sirve para hidratar la UI con el usuario logueado

