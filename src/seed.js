require("dotenv").config();
const crypto = require("node:crypto");
const pool = require("./config/database");

function passwordFields(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const accounts = [
      ["Administración", "admin@eventos.local", "ADMINISTRADOR", "Admin123!"],
      ["Organizador de prueba", "organizador@eventos.local", "ORGANIZADOR", "Organizador123!"],
      ["Participante Uno", "participante1@eventos.local", "PARTICIPANTE", "Participante123!"],
      ["Participante Dos", "participante2@eventos.local", "PARTICIPANTE", "Participante123!"],
      ["Participante Tres", "participante3@eventos.local", "PARTICIPANTE", "Participante123!"],
      ["Participante Cuatro", "participante4@eventos.local", "PARTICIPANTE", "Participante123!"]
    ];
    for (const [nombre, correo, rol, password] of accounts) {
      const p = passwordFields(password);
      await conn.execute(
        `INSERT INTO usuarios (nombre, correo, password_salt, password_hash, rol, activo)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), password_salt=VALUES(password_salt),
           password_hash=VALUES(password_hash), rol=VALUES(rol), activo=1`,
        [nombre, correo, p.salt, p.hash, rol]
      );
    }
    const [events] = await conn.execute("SELECT id_evento FROM eventos WHERE codigo = 'E100'");
    let eventId;
    if (events.length) eventId = events[0].id_evento;
    else {
      const [result] = await conn.execute(
        `INSERT INTO eventos (codigo, nombre, descripcion, fecha_inicio, capacidad, estado)
         VALUES ('E100', 'Taller de programación', 'Evento de ejemplo para probar inscripción y cupos.',
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 DAY), 2, 'PUBLICADO')`
      );
      eventId = result.insertId;
    }
    const [cancelled] = await conn.execute("SELECT id_evento FROM eventos WHERE codigo = 'E101'");
    if (!cancelled.length) {
      await conn.execute(
        `INSERT INTO eventos (codigo, nombre, descripcion, fecha_inicio, capacidad, estado)
         VALUES ('E101', 'Encuentro cultural cancelado', 'Evento de prueba para validar que no se permiten nuevas inscripciones.',
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 DAY), 20, 'CANCELADO')`
      );
    }
    await conn.commit();
    console.log("Datos de prueba creados.");
    console.log("Admin: admin@eventos.local / Admin123!");
    console.log("Organizador: organizador@eventos.local / Organizador123!");
    console.log("Participante: participante1@eventos.local / Participante123!");
    console.log("Los datos son solo para desarrollo; cambia las contraseñas antes de cualquier despliegue.");
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await pool.end();
  }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
