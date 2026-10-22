const express = require("express");
const service = require("./service");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { positiveInteger } = require("../../utils");
const router = express.Router();

router.get("/eventos", async (req, res, next) => {
  try { res.json(await service.listarEventos()); } catch (e) { next(e); }
});

router.get("/eventos/:id/cupos", async (req, res, next) => {
  if (!positiveInteger(req.params.id)) return res.status(400).json({ error: "Identificador de evento inválido." });
  try { res.json(await service.consultarCupos(Number(req.params.id))); } catch (e) { next(e); }
});

router.post("/inscripciones", requireAuth, requireRole("PARTICIPANTE"), async (req, res, next) => {
  const idEvento = req.body && req.body.id_evento;
  if (!positiveInteger(idEvento)) return res.status(400).json({ error: "id_evento debe ser un entero positivo." });
  try {
    const result = await service.inscribir(req.session.user.id_usuario, Number(idEvento));
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.get("/inscripciones/mias", requireAuth, requireRole("PARTICIPANTE"), async (req, res, next) => {
  try { res.json(await service.misInscripciones(req.session.user.id_usuario)); } catch (e) { next(e); }
});

router.post("/inscripciones/:id/cancelar", requireAuth, async (req, res, next) => {
  if (!positiveInteger(req.params.id)) return res.status(400).json({ error: "Identificador de inscripción inválido." });
  if (!["PARTICIPANTE", "ADMINISTRADOR"].includes(req.session.user.rol)) {
    return res.status(403).json({ error: "Tu rol no puede cancelar inscripciones." });
  }
  try {
    const result = await service.cancelar(
      req.session.user.id_usuario,
      Number(req.params.id),
      req.session.user.rol === "ADMINISTRADOR"
    );
    res.json(result);
  } catch (e) { next(e); }
});

router.get("/admin/inscripciones", requireAuth, requireRole("ADMINISTRADOR", "ORGANIZADOR"), async (req, res, next) => {
  try {
    const [rows] = await require("../../config/database").execute(
      `SELECT i.id_inscripcion, i.id_evento, e.nombre AS evento, i.id_participante,
              u.nombre AS participante, i.estado, i.fecha_inscripcion
       FROM inscripciones i JOIN eventos e ON e.id_evento=i.id_evento
       JOIN usuarios u ON u.id_usuario=i.id_participante
       ORDER BY i.id_evento, i.fecha_inscripcion`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
