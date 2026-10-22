# Pruebas manuales del prototipo

Realizar las pruebas después de ejecutar `npm install` y `npm start`.

| ID | Acción | Resultado esperado |
|---|---|---|
| TC-01 | Inscribir participante 1 al evento 1. | Respuesta 201 y creación de inscripción. |
| TC-02 | Repetir participante 1 al evento 1. | Rechazo por inscripción duplicada. |
| TC-03 | Inscribir al evento 3. | Rechazo porque está cancelado. |
| TC-04 | Enviar un ID de evento inexistente. | Respuesta 404. |
| TC-05 | Enviar rol diferente de participante. | Respuesta 403. |
| TC-06 | Inscribir hasta completar la capacidad. | La siguiente inscripción se rechaza. |
| TC-07 | Cancelar una inscripción propia antes del plazo. | Estado cancelada y cupo liberado. |
| TC-08 | Volver a cancelar la misma inscripción. | Rechazo; no se libera otro cupo. |
| TC-09 | Intentar cancelar la inscripción de otro participante. | Respuesta 403. |
| TC-10 | Consultar `GET /api/eventos`. | Lista de eventos y cupos disponibles. |
| TC-11 | Consultar `GET /api/inscripciones`. | Lista de inscripciones registradas. |
| TC-12 | Reiniciar el servidor y consultar inscripciones. | Se observa que los datos en memoria se pierden. |

Registre para cada caso el resultado real, la fecha de ejecución y una captura de pantalla. No marque una prueba como aprobada sin ejecutarla.
