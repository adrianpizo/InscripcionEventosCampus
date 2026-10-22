const express = require("express");
const pool = require("../../config/database");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { positiveInteger, httpError } = require("../../utils");
const router = express.Router();

// SC-03: el token QR es aleatorio y no contiene contraseñas ni datos personales.
router.post("/asistencia/qr", requireAuth, requireRole("ORGANIZADOR", "ADMINISTRADOR"), async (req, res, next) => {
  const { token_qr, id_evento } = req.body || {};
  if (typeof token_qr !== "string" || token_qr.length !== 64 || !positiveInteger(id_evento)) {
    return res.status(400).json({ error: "Se requiere token QR válido e id_evento entero positivo." });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [initialRows] = await conn.execute(
      "SELECT id_inscripcion, id_evento FROM inscripciones WHERE token_qr = ?",
      [token_qr]
    );
    if (!initialRows.length) throw httpError(404, "El código QR no es válido o fue revocado.");
    if (Number(initialRows[0].id_evento) !== Number(id_evento)) throw httpError(409, "El QR no corresponde a este evento.");
    const [eventRows] = await conn.execute("SELECT estado FROM eventos WHERE id_evento = ? FOR UPDATE", [id_evento]);
    if (!eventRows.length || eventRows[0].estado !== "PUBLICADO") throw httpError(409, "El evento no está disponible para registrar asistencia.");
    const [rows] = await conn.execute(
      "SELECT id_inscripcion, id_evento, estado FROM inscripciones WHERE id_inscripcion = ? FOR UPDATE",
      [initialRows[0].id_inscripcion]
    );
    if (!rows.length) throw httpError(404, "La inscripción ya no existe.");
    const item = rows[0];
    if (item.estado !== "ACTIVA") throw httpError(409, "La inscripción no está activa.");
    const [existing] = await conn.execute("SELECT id_asistencia FROM asistencias WHERE id_inscripcion = ?", [item.id_inscripcion]);
    if (existing.length) throw httpError(409, "La asistencia ya fue registrada.");
    await conn.execute(
      "INSERT INTO asistencias (id_inscripcion, id_evento, registrada_por) VALUES (?, ?, ?)",
      [item.id_inscripcion, id_evento, req.session.user.id_usuario]
    );
    await conn.commit();
    res.status(201).json({ mensaje: "Asistencia registrada correctamente." });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

module.exports = router;
