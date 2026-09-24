function validarId(req, res, next) {
  const id = String(req.params.id);
  if (!/^\d+$/.test(id) || Number(id) < 1) return res.status(400).json({ exito: false, mensaje: "El parámetro 'id' debe ser un entero positivo." });
  return next();
}
function exigirCampos(campos) {
  return (req, res, next) => {
    const body = req.body || {};
    const faltantes = campos.filter((campo) => body[campo] === undefined || body[campo] === null || (typeof body[campo] === 'string' && body[campo].trim() === ''));
    if (faltantes.length) return res.status(400).json({ exito: false, mensaje: 'Faltan campos obligatorios.', camposFaltantes: faltantes });
    return next();
  };
}
module.exports = { validarId, exigirCampos };
