import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

/// Perfil del conductor: editable (nombre, teléfono, licencia, empresa).
/// Correo y contraseña en solo lectura: la clave se cambia en su sección propia.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiClient _api = ApiClient();
  final TextEditingController _nombre = TextEditingController();
  final TextEditingController _telefono = TextEditingController();
  final TextEditingController _licencia = TextEditingController();
  final TextEditingController _empresa = TextEditingController();
  final TextEditingController _actual = TextEditingController();
  final TextEditingController _nueva = TextEditingController();

  String _email = '—';
  bool _loading = true;
  bool _saving = false;
  bool _changing = false;
  bool _showActual = false;
  bool _showNueva = false;
  String? _message;
  String? _passMessage;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nombre.dispose();
    _telefono.dispose();
    _licencia.dispose();
    _empresa.dispose();
    _actual.dispose();
    _nueva.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await _api.profile();
      final user = (data['user'] as Map?)?.cast<String, dynamic>() ?? {};
      final conductor = (data['conductor'] as Map?)?.cast<String, dynamic>();
      if (!mounted) return;
      setState(() {
        _email = '${user['email'] ?? '—'}';
        _nombre.text = '${conductor?['nombre'] ?? user['nombre'] ?? ''}';
        _telefono.text = '${conductor?['telefono'] ?? ''}';
        _licencia.text = '${conductor?['licencia'] ?? ''}';
        _empresa.text = '${conductor?['empresa'] ?? ''}';
        _loading = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _message = 'No se pudo cargar el perfil: $err';
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      await _api.updateProfile({
        'nombre': _nombre.text.trim(),
        'telefono': _telefono.text.trim(),
        'licencia': _licencia.text.trim(),
        'empresa': _empresa.text.trim(),
      });
      if (!mounted) return;
      setState(() => _message = 'Perfil actualizado.');
    } catch (err) {
      if (!mounted) return;
      setState(() => _message = 'Error: $err');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    setState(() {
      _changing = true;
      _passMessage = null;
    });
    try {
      await _api.changePassword(actual: _actual.text, nueva: _nueva.text);
      if (!mounted) return;
      setState(() {
        _passMessage = 'Contraseña cambiada.';
        _actual.clear();
        _nueva.clear();
      });
    } catch (err) {
      if (!mounted) return;
      setState(() => _passMessage = 'Error: $err');
    } finally {
      if (mounted) setState(() => _changing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SafeArea(child: Center(child: CircularProgressIndicator()));
    }
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Perfil', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          TextField(
            controller: TextEditingController(text: _email),
            readOnly: true,
            enableInteractiveSelection: false,
            decoration: const InputDecoration(
              labelText: 'Correo (solo lectura)',
              prefixIcon: Icon(Icons.mail_outline, color: AppColors.faint),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
              controller: _nombre,
              decoration: const InputDecoration(labelText: 'Nombre')),
          const SizedBox(height: 12),
          TextField(
              controller: _telefono,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Teléfono')),
          const SizedBox(height: 12),
          TextField(
              controller: _licencia,
              decoration: const InputDecoration(labelText: 'Licencia')),
          const SizedBox(height: 12),
          TextField(
              controller: _empresa,
              decoration: const InputDecoration(labelText: 'Empresa')),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Guardando…' : 'Guardar perfil'),
          ),
          if (_message != null) ...[
            const SizedBox(height: 8),
            Text(_message!, style: const TextStyle(fontSize: 12, color: AppColors.muted)),
          ],
          const SizedBox(height: 24),
          const Text('Cambiar contraseña',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          TextField(
            controller: _actual,
            obscureText: !_showActual,
            decoration: InputDecoration(
              labelText: 'Contraseña actual',
              suffixIcon: IconButton(
                tooltip: _showActual ? 'Ocultar' : 'Mostrar',
                onPressed: () => setState(() => _showActual = !_showActual),
                icon: Icon(
                  _showActual ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: AppColors.faint,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _nueva,
            obscureText: !_showNueva,
            decoration: InputDecoration(
              labelText: 'Nueva contraseña (mínimo 8 caracteres)',
              suffixIcon: IconButton(
                tooltip: _showNueva ? 'Ocultar' : 'Mostrar',
                onPressed: () => setState(() => _showNueva = !_showNueva),
                icon: Icon(
                  _showNueva ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: AppColors.faint,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _changing ? null : _changePassword,
            child: Text(_changing ? 'Cambiando…' : 'Cambiar contraseña'),
          ),
          if (_passMessage != null) ...[
            const SizedBox(height: 8),
            Text(_passMessage!,
                style: const TextStyle(fontSize: 12, color: AppColors.muted)),
          ],
        ],
      ),
    );
  }
}
