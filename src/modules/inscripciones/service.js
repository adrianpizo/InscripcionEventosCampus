const crypto = require("node:crypto");
const pool = require("../../config/database");
const { registrationIsOpen, cancellationIsAllowed, httpError } = require("../../utils");

async function inscribir(idParticipante, idEvento) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bloqueo por evento: serializa las inscripciones/cancelaciones del mismo evento.
    const [eventRows] = await conn.execute(
      "SELECT id_evento, fecha_inicio, capacidad, estado FROM eventos WHERE id_evento = ? FOR UPDATE",
      [idEvento]
    );
    if (!eventRows.length) throw httpError(404, "El evento no existe.", "EVENT_NOT_FOUND");
    const event = eventRows[0];
    if (event.estado !== "PUBLICADO") throw httpError(409, "El evento no está publicado o fue cancelado.");
    if (!registrationIsOpen(event.fecha_inicio)) throw httpError(409, "Las inscripciones cerraron dos horas antes del evento.");

    const [duplicate] = await conn.execute(
      "SELECT id_inscripcion FROM inscripciones WHERE id_evento = ? AND id_participante = ? AND estado IN ('ACTIVA','LISTA_ESPERA') LIMIT 1",
      [idEvento, idParticipante]
    );
    if (duplicate.length) throw httpError(409, "Ya tienes una inscripción activa o estás en lista de espera.");

    const [countRows] = await conn.execute(
      "SELECT COUNT(*) AS total FROM inscripciones WHERE id_evento = ? AND estado = 'ACTIVA'",
      [idEvento]
    );
    const occupied = Number(countRows[0].total);
    const capacity = Number(event.capacidad);
    const tokenQr = crypto.randomBytes(32).toString("hex");
    const state = occupied < capacity ? "ACTIVA" : "LISTA_ESPERA";

    const [result] = await conn.execute(
      "INSERT INTO inscripciones (id_evento, id_participante, estado, token_qr) VALUES (?, ?, ?, ?)",
      [idEvento, idParticipante, state, tokenQr]
    );
    await conn.commit();
    return {
      id_inscripcion: result.insertId,
      estado: state,
      mensaje: state === "ACTIVA" ? "Inscripción confirmada." : "El evento está lleno; quedaste en lista de espera."
    };
  } catch (error) {
    await conn.rollback();
    if (error.code === "ER_DUP_ENTRY") throw httpError(409, "Ya existe una inscripción activa o en lista de espera.");
    throw error;
  } finally {
    conn.release();
  }
}

async function cancelar(idParticipante, idInscripcion, esAdministrador = false) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Primero se identifica el evento y se bloquea su fila; después se bloquea la inscripción.
    // Mantener este orden reduce el riesgo de interbloqueos con inscribir() y con la promoción.
    const [initialRows] = await conn.execute(
      "SELECT id_evento FROM inscripciones WHERE id_inscripcion = ?",
      [idInscripcion]
    );
    if (!initialRows.length) throw httpError(404, "La inscripción no existe.");
    const eventId = initialRows[0].id_evento;
    const [eventRows] = await conn.execute(
      "SELECT id_evento, fecha_inicio, estado FROM eventos WHERE id_evento = ? FOR UPDATE",
      [eventId]
    );
    if (!eventRows.length) throw httpError(404, "El evento no existe.");
    const event = eventRows[0];
    const [rows] = await conn.execute(
      `SELECT id_inscripcion, id_evento, id_participante, estado
       FROM inscripciones WHERE id_inscripcion = ? FOR UPDATE`,
      [idInscripcion]
    );
    if (!rows.length) throw httpError(404, "La inscripción no existe.");
    const inscription = { ...rows[0], fecha_inicio: event.fecha_inicio, estado_evento: event.estado };
    if (!esAdministrador && Number(inscription.id_participante) !== Number(idParticipante)) {
      throw httpError(403, "Solo puedes cancelar tu propia inscripción.");
    }
    if (inscription.estado !== "ACTIVA" && inscription.estado !== "LISTA_ESPERA") {
      throw httpError(409, "La inscripción ya fue cancelada o no se puede cancelar.");
    }
    if (inscription.estado === "ACTIVA" && !cancellationIsAllowed(inscription.fecha_inicio)) {
      throw httpError(409, "Solo puedes cancelar hasta 24 horas antes del evento.");
    }

    await conn.execute(
      "UPDATE inscripciones SET estado = 'CANCELADA', fecha_cancelacion = CURRENT_TIMESTAMP WHERE id_inscripcion = ?",
      [idInscripcion]
    );

    let promoted = null;
    // Promoción de la lista de espera solo si el evento sigue publicado y la inscripción está abierta.
    if (inscription.estado === "ACTIVA" &&
        inscription.estado_evento === "PUBLICADO" &&
        registrationIsOpen(inscription.fecha_inicio)) {
      const [waiting] = await conn.execute(
        `SELECT id_inscripcion, id_participante
         FROM inscripciones
         WHERE id_evento = ? AND estado = 'LISTA_ESPERA'
         ORDER BY fecha_inscripcion ASC, id_inscripcion ASC
         LIMIT 1 FOR UPDATE`,
        [inscription.id_evento]
      );
      if (waiting.length) {
        promoted = waiting[0];
        await conn.execute(
          "UPDATE inscripciones SET estado = 'ACTIVA' WHERE id_inscripcion = ? AND estado = 'LISTA_ESPERA'",
          [promoted.id_inscripcion]
        );
      }
    }
    await conn.commit();
    return { mensaje: "Inscripción cancelada.", promovida: promoted ? Number(promoted.id_inscripcion) : null };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function consultarCupos(idEvento) {
  const [rows] = await pool.execute(
    `SELECT e.id_evento, e.nombre, e.capacidad,
       SUM(CASE WHEN i.estado = 'ACTIVA' THEN 1 ELSE 0 END) AS ocupados,
       GREATEST(e.capacidad - SUM(CASE WHEN i.estado = 'ACTIVA' THEN 1 ELSE 0 END), 0) AS disponibles,
       SUM(CASE WHEN i.estado = 'LISTA_ESPERA' THEN 1 ELSE 0 END) AS en_espera
     FROM eventos e
     LEFT JOIN inscripciones i ON i.id_evento = e.id_evento
     WHERE e.id_evento = ?
     GROUP BY e.id_evento, e.nombre, e.capacidad`,
    [idEvento]
  );
  if (!rows.length) throw httpError(404, "El evento no existe.", "EVENT_NOT_FOUND");
  return rows[0];
}

async function listarEventos() {
  const [rows] = await pool.execute(
    `SELECT e.id_evento, e.nombre, e.descripcion, e.fecha_inicio, e.capacidad, e.estado,
       SUM(CASE WHEN i.estado = 'ACTIVA' THEN 1 ELSE 0 END) AS ocupados,
       GREATEST(e.capacidad - SUM(CASE WHEN i.estado = 'ACTIVA' THEN 1 ELSE 0 END), 0) AS disponibles
     FROM eventos e LEFT JOIN inscripciones i ON i.id_evento = e.id_evento
     GROUP BY e.id_evento, e.nombre, e.descripcion, e.fecha_inicio, e.capacidad, e.estado
     ORDER BY e.fecha_inicio ASC`
  );
  return rows;
}

async function misInscripciones(idParticipante) {
  const [rows] = await pool.execute(
    `SELECT i.id_inscripcion, i.estado, i.fecha_inscripcion, i.fecha_cancelacion,
            e.id_evento, e.nombre AS evento, e.fecha_inicio, i.token_qr
     FROM inscripciones i JOIN eventos e ON e.id_evento = i.id_evento
     WHERE i.id_participante = ? ORDER BY i.fecha_inscripcion DESC`,
    [idParticipante]
  );
  return rows;
}

module.exports = { inscribir, cancelar, consultarCupos, listarEventos, misInscripciones };
