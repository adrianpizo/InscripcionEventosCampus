const crypto = require("node:crypto");
const pool = require("./config/database");

function verifyPassword(password, salt, expectedHash) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

async function login(req, res, next) {
  try {
    const { correo, contraseña } = req.body || {};
    if (typeof correo !== "string" || typeof contraseña !== "string" || !correo.trim() || !contraseña) {
      return res.status(400).json({ error: "Ingresa correo y contraseña." });
    }
    const [rows] = await pool.execute(
      "SELECT id_usuario, nombre, correo, password_salt, password_hash, rol, activo FROM usuarios WHERE correo = ? LIMIT 1",
      [correo.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.activo || !verifyPassword(contraseña, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol
      };
      res.json({ usuario: req.session.user });
    });
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("eventos.sid");
    res.json({ mensaje: "Sesión cerrada." });
  });
}

module.exports = { login, logout };
