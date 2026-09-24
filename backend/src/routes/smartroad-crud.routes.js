const express = require('express');
const { crearControlador } = require('../smartroad-crud/controller');
const { validarId, exigirCampos } = require('../smartroad-crud/validation');
const { obtenerDefinicion } = require('../smartroad-crud/model');
const router = express.Router();
function crearRouter(nombreTabla) {
  const subrouter = express.Router(); const controller = crearControlador(nombreTabla); const campos = obtenerDefinicion(nombreTabla).required;
  subrouter.get('/', controller.listar); subrouter.get('/:id', validarId, controller.obtener); subrouter.post('/', exigirCampos(campos), controller.crear); subrouter.put('/:id', validarId, exigirCampos(campos), controller.actualizar); subrouter.delete('/:id', validarId, controller.eliminar);
  return subrouter;
}
for (const tabla of ['conductor', 'vehiculo', 'dispositivo', 'evento', 'alerta']) router.use(`/${tabla}`, crearRouter(tabla));
module.exports = router;
