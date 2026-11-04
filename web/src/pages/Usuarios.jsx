import { useEffect, useState } from 'react';
import { UserPlus, Pencil, Trash2, UsersRound } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';

const empty = { nombre: '', email: '', password: '', rol: 'conductor', activo: true, placa: '', tipo_vehiculo: '', tipo_sangre: '' };

export default function Usuarios() {
  const { user, pushToast } = useApp();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.users().then((data) => setUsers(data.users)).catch((error) => pushToast(error.message, 'critical'));
  useEffect(() => { load(); }, []);
  if (user?.rol !== 'admin') return <div className="card p-6 text-sm text-muted">Solo administradores pueden gestionar usuarios.</div>;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const edit = (item) => {
    setEditing(item.id);
    setForm({
      nombre: item.nombre, email: item.email, password: '', rol: item.rol, activo: Boolean(item.activo),
      placa: item.placa || '', tipo_vehiculo: item.tipo_vehiculo || '', tipo_sangre: item.tipo_sangre || ''
    });
  };
  const reset = () => { setEditing(null); setForm(empty); };
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editing) await api.updateUser(editing, payload);
      else await api.createUser(payload);
      pushToast(editing ? 'Usuario actualizado' : 'Usuario creado', 'success');
      reset();
      await load();
    } catch (error) { pushToast(error.message, 'critical'); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try { await api.deleteUser(id); pushToast('Usuario eliminado', 'success'); await load(); }
    catch (error) { pushToast(error.message, 'critical'); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-5 flex items-center gap-3">
          <UsersRound className="text-info" size={20} />
          <div><p className="section-title">Auditoría de usuarios</p><p className="text-xs text-muted">Alta, consulta, edición y baja de usuarios administrativos.</p></div>
        </div>
        <form onSubmit={save} className="grid gap-3 md:grid-cols-6">
          <input className="field md:col-span-2" placeholder="Nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
          <input className="field md:col-span-2" type="email" placeholder="Correo" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          <input className="field" type="password" placeholder={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'} value={form.password} onChange={(e) => set('password', e.target.value)} required={!editing} />
          <select className="field" value={form.rol} onChange={(e) => set('rol', e.target.value)}><option value="conductor">Conductor</option><option value="admin">Administrador</option></select>
          {form.rol === 'conductor' && <>
            <input className="field" placeholder="Número de placa" value={form.placa} onChange={(e) => set('placa', e.target.value.toUpperCase())} required />
            <select className="field" value={form.tipo_vehiculo} onChange={(e) => set('tipo_vehiculo', e.target.value)} required>
              <option value="">Tipo de vehículo</option><option value="Carga pesada">Carga pesada</option><option value="Carga media">Carga media</option><option value="Utilitario">Utilitario</option><option value="Particular">Particular</option><option value="Motocicleta">Motocicleta</option>
            </select>
            <select className="field" value={form.tipo_sangre} onChange={(e) => set('tipo_sangre', e.target.value)} required>
              <option value="">Tipo de sangre</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
            </select>
          </>}
          <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} /> Activo</label>
          <div className="flex gap-2 md:col-span-2"><button className="btn-primary" disabled={busy}>{editing ? <Pencil size={14} /> : <UserPlus size={14} />}{editing ? 'Actualizar' : 'Crear'}</button>{editing && <button type="button" className="btn-ghost" onClick={reset}>Cancelar</button>}</div>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table min-w-[980px]"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Placa</th><th>Vehículo</th><th>Sangre</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{users.map((item) => <tr key={item.id}><td className="font-bold">{item.nombre}</td><td className="text-muted">{item.email}</td><td>{item.rol}</td><td>{item.rol === 'conductor' ? (item.placa || '—') : '—'}</td><td>{item.rol === 'conductor' ? (item.tipo_vehiculo || '—') : '—'}</td><td>{item.rol === 'conductor' ? (item.tipo_sangre || '—') : '—'}</td><td><span className={item.activo ? 'text-success' : 'text-danger'}>{item.activo ? 'Activo' : 'Inactivo'}</span></td><td><div className="flex gap-2"><button className="text-info" onClick={() => edit(item)} title="Editar"><Pencil size={15} /></button><button className="text-danger-bright" onClick={() => remove(item.id)} title="Eliminar"><Trash2 size={15} /></button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
