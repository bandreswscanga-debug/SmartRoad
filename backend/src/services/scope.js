// Alcance por rol: un conductor solo ve sus propios datos.
// Admin ve todo. Devuelve null para admin (sin filtro).
async function conductorVehicleIds(store, user) {
  if (!user || user.rol !== 'conductor') return null;
  const conductor = await store.getConductorByUserId(user.id);
  if (!conductor) return [];
  const vehicles = await store.listVehicles();
  return vehicles.filter((v) => Number(v.conductor_id) === Number(conductor.id)).map((v) => v.id);
}

module.exports = { conductorVehicleIds };
