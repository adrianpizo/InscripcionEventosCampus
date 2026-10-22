const $ = (selector) => document.querySelector(selector);
const message = (text, kind = "") => {
  $("#mensaje").textContent = text;
  $("#mensaje").className = kind;
};
async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  return data;
}
function formatDate(value) {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}
async function loadEvents() {
  const events = await api("/api/eventos");
  const container = $("#events");
  container.replaceChildren();
  events.forEach(event => {
    const card = document.createElement("article");
    card.className = "evento";
    const title = document.createElement("h3"); title.textContent = event.nombre;
    const status = document.createElement("span"); status.className = "pill"; status.textContent = event.estado;
    const description = document.createElement("p"); description.textContent = event.descripcion || "Sin descripción.";
    const date = document.createElement("p"); date.className = "meta"; date.textContent = `Fecha: ${formatDate(event.fecha_inicio)}`;
    const seats = document.createElement("p"); seats.textContent = `Cupos: ${event.disponibles} disponibles de ${event.capacidad}`;
    card.append(title, status, description, date, seats);
    if (event.estado === "PUBLICADO") {
      const button = document.createElement("button"); button.textContent = "Inscribirme";
      button.addEventListener("click", async () => {
        try {
          const result = await api("/api/inscripciones", { method: "POST", body: JSON.stringify({ id_evento: event.id_evento }) });
          message(result.mensaje, "success"); await refreshAll();
        } catch (error) { message(error.message, "error"); }
      });
      card.append(button);
    }
    container.append(card);
  });
}
async function loadMine() {
  const rows = await api("/api/inscripciones/mias");
  const container = $("#my-list"); container.replaceChildren();
  if (!rows.length) { container.textContent = "Todavía no tienes inscripciones."; return; }
  rows.forEach(item => {
    const card = document.createElement("article"); card.className = "evento";
    const title = document.createElement("h3"); title.textContent = item.evento;
    const status = document.createElement("p"); status.textContent = `Estado: ${item.estado}`;
    const date = document.createElement("p"); date.className = "meta"; date.textContent = `Evento: ${formatDate(item.fecha_inicio)}`;
    card.append(title, status, date);
    if (item.estado === "ACTIVA" || item.estado === "LISTA_ESPERA") {
      const cancel = document.createElement("button"); cancel.className = "secondary"; cancel.textContent = "Cancelar inscripción";
      cancel.addEventListener("click", async () => {
        try {
          const result = await api(`/api/inscripciones/${item.id_inscripcion}/cancelar`, { method: "POST", body: "{}" });
          message(result.promovida ? `${result.mensaje} Se promovió la inscripción #${result.promovida} desde la lista de espera.` : result.mensaje, "success");
          await refreshAll();
        } catch (error) { message(error.message, "error"); }
      });
      card.append(cancel);
    }
    if (item.estado === "ACTIVA") {
      const qr = document.createElement("p"); qr.className = "meta";
      qr.textContent = `Token QR (demo): ${item.token_qr}`;
      card.append(qr);
    }
    container.append(card);
  });
}
async function loadAll() {
  const rows = await api("/api/admin/inscripciones");
  const container = $("#all-list"); container.replaceChildren();
  if (!rows.length) { container.textContent = "No hay inscripciones registradas."; return; }
  const table = document.createElement("table");
  const head = document.createElement("tr");
  ["ID", "Evento", "Participante", "Estado", "Fecha"].forEach(label => { const th = document.createElement("th"); th.textContent = label; head.append(th); });
  const thead = document.createElement("thead"); thead.append(head); table.append(thead);
  const tbody = document.createElement("tbody");
  rows.forEach(row => {
    const tr = document.createElement("tr");
    [row.id_inscripcion, row.evento, row.participante, row.estado, formatDate(row.fecha_inscripcion)].forEach(value => {
      const td = document.createElement("td"); td.textContent = value; tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody); container.append(table);
}
async function refreshAll() {
  await loadEvents();
  const session = await api("/api/sesion");
  if (session.usuario?.rol === "PARTICIPANTE") await loadMine();
  if (["ADMINISTRADOR", "ORGANIZADOR"].includes(session.usuario?.rol)) await loadAll();
}
function setLoggedIn(user) {
  $("#login-panel").classList.toggle("oculto", Boolean(user));
  $("#session-panel").classList.toggle("oculto", !user);
  $("#my-panel").classList.toggle("oculto", user?.rol !== "PARTICIPANTE");
  $("#organizer-panel").classList.toggle("oculto", !["ADMINISTRADOR", "ORGANIZADOR"].includes(user?.rol));
  $("#welcome").textContent = user ? `Sesión: ${user.nombre} (${user.rol})` : "";
}
$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const result = await api("/api/login", { method: "POST", body: JSON.stringify({ correo: form.get("correo"), contraseña: form.get("contraseña") }) });
    setLoggedIn(result.usuario); message("Sesión iniciada.", "success"); await refreshAll();
  } catch (error) { message(error.message, "error"); }
});
$("#logout").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST", body: "{}" }); setLoggedIn(null); message("Sesión cerrada."); await refreshAll(); }
  catch (error) { message(error.message, "error"); }
});
$("#refresh").addEventListener("click", () => refreshAll().catch(e => message(e.message, "error")));
$("#qr-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const result = await api("/api/asistencia/qr", { method: "POST", body: JSON.stringify({ id_evento: Number(form.get("id_evento")), token_qr: form.get("token_qr") }) });
    message(result.mensaje, "success"); event.currentTarget.reset();
  } catch (error) { message(error.message, "error"); }
});
(async () => {
  try {
    const session = await api("/api/sesion"); setLoggedIn(session.usuario); await refreshAll();
  } catch (error) { message(error.message, "error"); }
})();
