require("dotenv").config();
const app = require("./app");
const pool = require("./config/database");
const port = Number(process.env.PORT || 3000);

async function start() {
  try {
    await pool.query("SELECT 1");
    app.listen(port, () => console.log(`Sistema de eventos disponible en http://localhost:${port}`));
  } catch (error) {
    console.error("No se pudo conectar con MySQL. Revisa el archivo .env y ejecuta sql/schema.sql.", error.message);
    process.exit(1);
  }
}

start();
