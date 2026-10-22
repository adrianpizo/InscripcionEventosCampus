require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const path = require("node:path");
const { login, logout } = require("./auth");
const inscriptionRoutes = require("./modules/inscripciones/routes");
const attendanceRoutes = require("./modules/asistencia/routes");

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "eventos.sid",
  secret: process.env.SESSION_SECRET || "solo-desarrollo-cambiar-secreto",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.post("/api/login", login);
app.post("/api/logout", logout);
app.get("/api/sesion", (req, res) => res.json({ usuario: req.session.user || null }));
app.use("/api", inscriptionRoutes);
app.use("/api", attendanceRoutes);
app.use(express.static(path.join(__dirname, "..", "public")));

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "La operación duplicada fue rechazada por la base de datos." });
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ error: "El evento o participante indicado no existe." });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? "Ocurrió un error interno. No se guardaron cambios parciales." : error.message });
});

module.exports = app;
