# Pruebas

Ejecutar pruebas unitarias:
```bash
npm test
```

Las pruebas de `utils.test.js` validan tipos/rangos y límites horarios. Para comprobar transacciones,
restricciones únicas, lista de espera y concurrencia se necesita una instancia MySQL real y ejecutar
solicitudes paralelas con usuarios diferentes. No se presentan resultados de integración ni de carga
como ejecutados si no se han corrido en el entorno de evaluación.
