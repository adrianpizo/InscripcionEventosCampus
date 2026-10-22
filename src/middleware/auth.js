function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Debes iniciar sesión para realizar esta operación." });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Debes iniciar sesión." });
    }
    if (!roles.includes(req.session.user.rol)) {
      return res.status(403).json({ error: "No tienes permisos para realizar esta operación." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
