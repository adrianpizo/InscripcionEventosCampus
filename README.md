# Módulo de Gestión de Inscripciones y Control de Cupos

Implementación mejorada para el proyecto final de Ingeniería de Software II. Usa Node.js, Express y MySQL/InnoDB y respeta el alcance: el módulo de inscripciones se implementa; los eventos de prueba se cargan como datos, pero no se incluye administración completa de eventos.

## Mejoras frente a la versión inicial

- Persistencia real con MySQL; los datos no se borran al reiniciar el servidor.
- Transacción por inscripción/cancelación, bloqueo de la fila del evento con `SELECT ... FOR UPDATE`, `COMMIT` y `ROLLBACK` (SC-01).
- Restricción única para evitar dos inscripciones activas o en lista de espera del mismo participante y evento.
- Validación de estado publicado, capacidad y fecha de cierre (2 horas antes).
- Cancelación permitida hasta 24 horas antes, manteniendo historial y evitando liberar el cupo dos veces.
- Lista de espera ordenada por fecha de llegada; al cancelar una inscripción activa se promueve al primero dentro de la misma transacción, si el evento sigue publicado y el plazo está abierto (SC-02).
- Sesiones de servidor, contraseñas con `scrypt` y autorización por roles para endpoints. No se confía en un rol enviado desde el navegador.
- Token QR aleatorio de 256 bits y registro de asistencia único por inscripción; valida rol, evento y estado de la inscripción (SC-03).
- Validación de parámetros, respuestas HTTP controladas y pruebas unitarias de límites.

## Requisitos previos

- Node.js 18 o superior.
- MySQL 8.0+ recomendado (por columnas generadas, `CHECK` y bloqueo InnoDB).
- Visual Studio Code es opcional.

## Instalación

1. Descomprime el ZIP y abre esta carpeta en VS Code.
2. Crea la base de datos y tablas. En phpMyAdmin, abre la pestaña **SQL**, copia el contenido de `sql/schema.sql` y ejecútalo. El script crea `sistema_eventos`.
3. Copia `.env.example` como `.env`. Ajusta `DB_USER` y `DB_PASSWORD` según tu instalación de MySQL.
4. Abre una terminal en la carpeta del proyecto y ejecuta:
   ```bash
   npm install
   npm run seed
   npm test
   npm start
   ```
5. Abre `http://localhost:3000`.

## Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@eventos.local` | `Admin123!` |
| Organizador | `organizador@eventos.local` | `Organizador123!` |
| Participante | `participante1@eventos.local` | `Participante123!` |
| Participante adicional | `participante2@eventos.local` | `Participante123!` |

El script `npm run seed` crea/actualiza las cuentas y los eventos `E100` (publicado, capacidad 2) y `E101` (cancelado). La fecha de E100 se genera a 10 días desde la ejecución. Usa las credenciales solo para desarrollo y no publiques el sitio con ellas.

## Endpoints principales

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/login` | Iniciar sesión |
| POST | `/api/logout` | Cerrar sesión |
| GET | `/api/sesion` | Consultar sesión actual |
| GET | `/api/eventos` | Consultar eventos y cupos |
| GET | `/api/eventos/:id/cupos` | Consultar cupos de un evento |
| POST | `/api/inscripciones` | Inscribirse (participante autenticado) |
| GET | `/api/inscripciones/mias` | Consultar inscripciones propias |
| POST | `/api/inscripciones/:id/cancelar` | Cancelar inscripción propia (o administrador) |
| GET | `/api/admin/inscripciones` | Consultar inscripciones (organizador/administrador) |
| POST | `/api/asistencia/qr` | Registrar asistencia usando token QR (organizador/administrador) |

## Reglas implementadas

- **RN-01:** identificadores únicos en tablas.
- **RN-02:** capacidad entera positiva con validación en base de datos.
- **RN-03:** solo eventos `PUBLICADO` y dentro del plazo.
- **RN-04:** una inscripción activa o en lista de espera por participante y evento.
- **RN-05:** control de cupos con bloqueo y transacción por evento.
- **RN-06:** cierre dos horas antes del inicio.
- **RN-07:** cancelación hasta 24 horas antes para inscripciones activas.
- **RN-08:** cancelar cambia estado; no borra historial ni libera más de un cupo. Una inscripción en lista de espera se puede retirar.
- **RN-09:** eventos cancelados conservan registros y no admiten nuevas inscripciones ni promoción de lista de espera.
- **RN-10:** QR con token aleatorio, una asistencia por inscripción.
- **RN-11/RN-12:** control de rol y propietario de la inscripción en el servidor; se rechazan operaciones no autorizadas.

## Pruebas y límites conocidos

`npm test` ejecuta pruebas unitarias de validaciones y límites horarios. Las pruebas de concurrencia, rollback, persistencia y rendimiento deben ejecutarse contra MySQL real; no se declara que pasaron sin evidencia. El requisito de rendimiento de 3 segundos con 5.000 eventos y 50.000 inscripciones necesita una prueba de carga aparte.

Para producción se debe configurar un almacén de sesiones persistente, HTTPS, un `SESSION_SECRET` fuerte, protección CSRF apropiada, copias de seguridad y políticas de gestión de cuentas. El módulo de eventos (crear/publicar/cancelar), notificaciones por correo y el escaneo físico de QR siguen fuera del alcance de implementación descrito en el documento. La pantalla muestra el token como demostración; no debe tratarse como una solución final de emisión de QR.
