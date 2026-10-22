# Correspondencia con el documento del proyecto

| Regla/requisito | Implementación |
|---|---|
| RF-06 / RN-03 | `POST /api/inscripciones` solo acepta eventos publicados y dentro del plazo. |
| RF-07 | `GET /api/inscripciones/mias` consulta las inscripciones del participante autenticado. |
| RF-08 / RN-07 / RN-08 | Cancelación lógica con fecha, plazo y verificación de estado. |
| RF-10 | `GET /api/eventos/:id/cupos` devuelve capacidad, ocupados y disponibles. |
| RF-12 / RN-11 / RN-12 / RNF-04 | Sesión del servidor y middleware por rol/propietario. |
| RN-01 / RN-02 / RNF-10 | Claves únicas, validación de entradas y capacidad positiva en SQL. |
| RN-04 | Índice único basado en columnas generadas evita duplicados activos/en espera. |
| RN-05 / RNF-05 / SC-01 | InnoDB, `SELECT ... FOR UPDATE`, transacción, `COMMIT` y `ROLLBACK`. |
| RN-06 | Se cierra la inscripción dos horas antes del evento. |
| RN-09 | Los eventos cancelados y las inscripciones se conservan; no se aceptan nuevas inscripciones. |
| SC-02 | La cancelación de una inscripción activa promueve al primer participante en espera dentro de la misma transacción, si procede. |
| RN-10 / SC-03 | Token QR aleatorio, validación de rol/evento/estado y restricción única de asistencia. |
| RNF-08 | Inscripciones, eventos y usuarios se guardan en MySQL. |
| RNF-06 | No se afirma cumplimiento de rendimiento sin ejecutar la carga de 5.000 eventos y 50.000 inscripciones. |

## Pruebas ejecutadas en el entorno de creación

Se ejecutó `node --check` sobre los archivos JavaScript y `npm test`: 4 pruebas unitarias pasaron. No se ejecutaron pruebas de integración con MySQL, pruebas de concurrencia real ni pruebas de carga; deben realizarse con una instancia MySQL disponible antes de entregar el proyecto como completamente validado.
