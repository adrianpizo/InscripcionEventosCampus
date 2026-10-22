const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Datos de demostración en memoria: se reinician al apagar el servidor.
const eventos = [
  {
    id: 1,
    nombre: "Taller de programación",
    descripcion: "Actividad práctica de introducción a la programación.",
    categoria: "Académico",
    lugar: "Laboratorio 1",
    capacidad: 3,
    estado: "publicado",
    cancelado: false,
    fechaInicio: "2026-10-30T10:00:00-05:00"
  },
  {
    id: 2,
    nombre: "Muestra cultural",
    descripcion: "Presentaciones artísticas de la comunidad educativa.",
    categoria: "Cultural",
    lugar: "Auditorio principal",
    capacidad: 2,
    estado: "publicado",
    cancelado: false,
    fechaInicio: "2026-11-15T14:00:00-05:00"
  },
  {
    id: 3,
    nombre: "Conferencia cancelada (demostración)",
    descripcion: "Evento de ejemplo para probar las validaciones.",
    categoria: "Académico",
    lugar: "Sala 2",
    capacidad: 20,
    estado: "cancelado",
    cancelado: true,
    fechaInicio: "2026-11-20T09:00:00-05:00"
  }
];

const inscripciones = [];
let siguienteId = 1;

function buscarEvento(eventoId) {
  return eventos.find(evento => evento.id === Number(eventoId));
}

function contarCuposOcupados(eventoId) {
  return inscripciones.filter(inscripcion =>
    inscripcion.eventoId === Number(eventoId) &&
    inscripcion.estado === "activa"
  ).length;
}

function yaEstaInscrito(participanteId, eventoId) {
  return inscripciones.find(inscripcion =>
    inscripcion.participanteId === Number(participanteId) &&
    inscripcion.eventoId === Number(eventoId) &&
    inscripcion.estado === "activa"
  );
}

function fechaValida(evento) {
  const fecha = new Date(evento.fechaInicio).getTime();
  return Number.isFinite(fecha) ? fecha : null;
}

// Consultar eventos y disponibilidad.
app.get("/api/eventos", (req, res) => {
  const resultado = eventos.map(evento => {
    const ocupados = contarCuposOcupados(evento.id);
    return {
      ...evento,
      cuposOcupados: ocupados,
      cuposDisponibles: Math.max(0, evento.capacidad - ocupados)
    };
  });
  res.json(resultado);
});

// Consultar inscripciones (solo para demostración académica).
app.get("/api/inscripciones", (req, res) => {
  res.json(inscripciones);
});

// Registrar una inscripción.
app.post("/inscribir", (req, res) => {
  const participanteId = Number(req.body.participanteId);
  const eventoId = Number(req.body.eventoId);
  const rol = req.body.rol;

  if (rol !== "participante") {
    return res.status(403).json({ mensaje: "Solo un participante puede inscribirse." });
  }

  if (!Number.isInteger(participanteId) || participanteId <= 0 ||
      !Number.isInteger(eventoId) || eventoId <= 0) {
    return res.status(400).json({ mensaje: "Ingrese identificadores enteros positivos." });
  }

  const evento = buscarEvento(eventoId);
  if (!evento) {
    return res.status(404).json({ mensaje: "El evento no existe." });
  }

  if (!Number.isInteger(evento.capacidad) || evento.capacidad <= 0) {
    return res.status(400).json({ mensaje: "La capacidad del evento no es válida." });
  }

  if (evento.estado !== "publicado" || evento.cancelado) {
    return res.status(400).json({ mensaje: "El evento no está disponible para inscripciones." });
  }

  const inicio = fechaValida(evento);
  if (inicio === null) {
    return res.status(400).json({ mensaje: "La fecha del evento no es válida." });
  }

  if (Date.now() >= inicio - 2 * 60 * 60 * 1000) {
    return res.status(400).json({ mensaje: "Las inscripciones están cerradas (cierran 2 horas antes)." });
  }

  if (yaEstaInscrito(participanteId, eventoId)) {
    return res.status(400).json({ mensaje: "El participante ya tiene una inscripción activa en este evento." });
  }

  const ocupados = contarCuposOcupados(eventoId);
  if (ocupados >= evento.capacidad) {
    return res.status(400).json({ mensaje: "No hay cupos disponibles." });
  }

  const nuevaInscripcion = {
    id: siguienteId++,
    participanteId,
    eventoId,
    fechaInscripcion: new Date().toISOString(),
    estado: "activa"
  };

  inscripciones.push(nuevaInscripcion);

  const cuposOcupados = contarCuposOcupados(eventoId);
  return res.status(201).json({
    mensaje: "Inscripción realizada correctamente.",
    inscripcion: nuevaInscripcion,
    cuposOcupados,
    cuposDisponibles: evento.capacidad - cuposOcupados
  });
});

// Cancelar una inscripción propia, antes de las 24 horas previas al evento.
app.post("/cancelar", (req, res) => {
  const participanteId = Number(req.body.participanteId);
  const inscripcionId = Number(req.body.inscripcionId);
  const rol = req.body.rol;

  if (rol !== "participante") {
    return res.status(403).json({ mensaje: "Solo un participante puede cancelar desde esta ruta." });
  }

  if (!Number.isInteger(participanteId) || participanteId <= 0 ||
      !Number.isInteger(inscripcionId) || inscripcionId <= 0) {
    return res.status(400).json({ mensaje: "Ingrese identificadores enteros positivos." });
  }

  const inscripcion = inscripciones.find(registro => registro.id === inscripcionId);
  if (!inscripcion) {
    return res.status(404).json({ mensaje: "La inscripción no existe." });
  }

  if (inscripcion.participanteId !== participanteId) {
    return res.status(403).json({ mensaje: "No puede cancelar una inscripción ajena." });
  }

  if (inscripcion.estado !== "activa") {
    return res.status(400).json({ mensaje: "La inscripción ya fue cancelada." });
  }

  const evento = buscarEvento(inscripcion.eventoId);
  if (!evento) {
    return res.status(404).json({ mensaje: "No se encontró el evento." });
  }

  const inicio = fechaValida(evento);
  if (inicio === null) {
    return res.status(400).json({ mensaje: "La fecha del evento no es válida." });
  }

  if (Date.now() >= inicio - 24 * 60 * 60 * 1000) {
    return res.status(400).json({ mensaje: "Ya venció el plazo para cancelar (24 horas antes)." });
  }

  inscripcion.estado = "cancelada";

  const cuposOcupados = contarCuposOcupados(evento.id);
  return res.json({
    mensaje: "Inscripción cancelada correctamente.",
    inscripcionId: inscripcion.id,
    cuposOcupados,
    cuposDisponibles: evento.capacidad - cuposOcupados
  });
});

// Ruta sencilla para comprobar que el servidor funciona.
app.get("/api/estado", (req, res) => {
  res.json({ mensaje: "Servidor funcionando correctamente." });
});

app.listen(PORT, () => {
  console.log(`Sistema de eventos disponible en http://localhost:${PORT}`);
});
