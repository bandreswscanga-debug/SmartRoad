const Model = require('./model');
function enteroPositivo(value) { return /^\d+$/.test(String(value)) && Number(value) >= 1; }
function enviarErrorBD(res, error) {
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ exito: false, mensaje: 'La clave foránea indicada no existe.' });
  if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ exito: false, mensaje: 'No se puede eliminar: existen registros relacionados.' });
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ exito: false, mensaje: 'Ya existe un registro con ese valor único.' });
  if (['ER_BAD_NULL_ERROR', 'ER_WARN_NULL_TO_NOTNULL', 'ER_TRUNCATED_WRONG_VALUE', 'ER_WARN_DATA_OUT_OF_RANGE'].includes(error.code)) return res.status(400).json({ exito: false, mensaje: 'Uno de los valores enviados no es válido.' });
  return null;
}
function aplicarDefaults(definicion, body) { const data = { ...body }; for (const [campo, valor] of Object.entries(definicion.defaultValues || {})) if (data[campo] === undefined || data[campo] === null || data[campo] === '') data[campo] = valor; return data; }
function fechaValida(valor) { return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(String(valor)); }
function crearControlador(nombreTabla) {
  const definicion = Model.obtenerDefinicion(nombreTabla);
  async function validarFk(data) {
    if (!definicion.foreignKey) return null;
    const fk = definicion.foreignKey; const valor = data[fk.column];
    if (!enteroPositivo(valor)) return `El campo '${fk.column}' debe ser un entero positivo.`;
    return (await Model.existe(fk.table, Number(valor))) ? null : `La referencia '${fk.column}' no existe.`;
  }
  return {
    listar: async (req, res, next) => { try { const datos = await Model.listar(nombreTabla); return res.status(200).json({ exito: true, total: datos.length, datos }); } catch (error) { const r = enviarErrorBD(res, error); return r || next(error); } },
    obtener: async (req, res, next) => { try { const datos = await Model.obtenerPorId(nombreTabla, Number(req.params.id)); if (!datos) return res.status(404).json({ exito: false, mensaje: 'Registro no encontrado.' }); return res.status(200).json({ exito: true, datos }); } catch (error) { const r = enviarErrorBD(res, error); return r || next(error); } },
    crear: async (req, res, next) => { try { const data = aplicarDefaults(definicion, req.body || {}); if (data.fecha_hora !== undefined && !fechaValida(data.fecha_hora)) return res.status(400).json({ exito: false, mensaje: "El formato de 'fecha_hora' es inválido." }); const errorFk = await validarFk(data); if (errorFk) return res.status(400).json({ exito: false, mensaje: errorFk }); if (nombreTabla === 'dispositivo' && (await Model.contarPorVehiculo(Number(data.id_vehiculo))) > 0) return res.status(409).json({ exito: false, mensaje: 'El vehículo ya tiene un dispositivo asignado.' }); const id = await Model.crear(nombreTabla, data); return res.status(201).json({ exito: true, mensaje: 'Registro creado correctamente.', datos: await Model.obtenerPorId(nombreTabla, id) }); } catch (error) { const r = enviarErrorBD(res, error); return r || next(error); } },
    actualizar: async (req, res, next) => { try { const id = Number(req.params.id); const existente = await Model.obtenerPorId(nombreTabla, id); if (!existente) return res.status(404).json({ exito: false, mensaje: 'Registro no encontrado.' }); const data = aplicarDefaults(definicion, req.body || {}); if (data.fecha_hora !== undefined && !fechaValida(data.fecha_hora)) return res.status(400).json({ exito: false, mensaje: "El formato de 'fecha_hora' es inválido." }); const errorFk = await validarFk(data); if (errorFk) return res.status(400).json({ exito: false, mensaje: errorFk }); if (nombreTabla === 'dispositivo' && Number(data.id_vehiculo) !== Number(existente.id_vehiculo) && (await Model.contarPorVehiculo(Number(data.id_vehiculo))) > 0) return res.status(409).json({ exito: false, mensaje: 'El vehículo ya tiene un dispositivo asignado.' }); await Model.actualizar(nombreTabla, id, data); return res.status(200).json({ exito: true, mensaje: 'Registro actualizado correctamente.', datos: await Model.obtenerPorId(nombreTabla, id) }); } catch (error) { const r = enviarErrorBD(res, error); return r || next(error); } },
    eliminar: async (req, res, next) => { try { const id = Number(req.params.id); if (!(await Model.obtenerPorId(nombreTabla, id))) return res.status(404).json({ exito: false, mensaje: 'Registro no encontrado.' }); await Model.eliminar(nombreTabla, id); return res.status(200).json({ exito: true, mensaje: 'Registro eliminado correctamente.' }); } catch (error) { const r = enviarErrorBD(res, error); return r || next(error); } }
  };
}
module.exports = { crearControlador };
