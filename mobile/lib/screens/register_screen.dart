import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api.dart';
import '../theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, required this.onRegistered});

  final VoidCallback onRegistered;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiClient();
  final Map<String, TextEditingController> _fields = {
    for (final name in ['nombre', 'documento', 'licencia', 'telefono', 'email', 'password', 'empresa', 'placa', 'tipo_vehiculo', 'modelo_vehiculo'])
      name: TextEditingController(),
  };
  String _sangre = '';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final controller in _fields.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final body = {
        for (final entry in _fields.entries)
          if (entry.key != 'modelo_vehiculo') entry.key: entry.value.text.trim(),
        'tipo_sangre': _sangre,
        if (_fields['modelo_vehiculo']!.text.trim().isNotEmpty)
          'modelo_vehiculo': int.tryParse(_fields['modelo_vehiculo']!.text.trim()),
      };
      final data = await _api.registerDriver(body);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('srs_token', data['token'] as String);
      await prefs.setString('srs_user', jsonEncode(data['user']));
      if (mounted) widget.onRegistered();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registro de conductor')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Crea tu cuenta independiente', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            const Text('Tu cuenta queda disponible de inmediato. El estado legal queda pendiente de verificación administrativa.', style: TextStyle(color: AppColors.muted, height: 1.4)),
            const SizedBox(height: 18),
            for (final field in _fieldDefinitions) ...[
              _input(field.$1, field.$2, field.$3, required: field.$4),
              const SizedBox(height: 12),
            ],
            DropdownButtonFormField<String>(
              initialValue: _sangre.isEmpty ? null : _sangre,
              decoration: const InputDecoration(labelText: 'Tipo de sangre'),
              items: const ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
              validator: (value) => value == null ? 'Selecciona tu tipo de sangre' : null,
              onChanged: (value) => setState(() => _sangre = value ?? ''),
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              Text(_error!, style: const TextStyle(color: AppColors.dangerBright)),
            ],
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _busy ? null : _submit,
              icon: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.person_add),
              label: Text(_busy ? 'Creando cuenta…' : 'Crear cuenta'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _input(String key, String label, TextInputType type, {required bool required}) => TextFormField(
        controller: _fields[key],
        obscureText: key == 'password',
        keyboardType: type,
        decoration: InputDecoration(labelText: label),
        validator: (value) {
          if (required && (value == null || value.trim().isEmpty)) return 'Campo obligatorio';
          if (key == 'password' && (value?.length ?? 0) < 8) return 'Mínimo 8 caracteres';
          return null;
        },
      );

  static const _fieldDefinitions = <(String, String, TextInputType, bool)>[
    ('nombre', 'Nombre completo', TextInputType.name, true),
    ('documento', 'RUT / cédula', TextInputType.text, true),
    ('licencia', 'Carnet de conducir', TextInputType.text, true),
    ('telefono', 'Teléfono', TextInputType.phone, true),
    ('email', 'Correo electrónico', TextInputType.emailAddress, true),
    ('password', 'Contraseña', TextInputType.visiblePassword, true),
    ('empresa', 'Empresa (opcional)', TextInputType.text, false),
    ('placa', 'Placa del vehículo', TextInputType.text, true),
    ('tipo_vehiculo', 'Tipo de vehículo', TextInputType.text, true),
    ('modelo_vehiculo', 'Modelo / año (opcional)', TextInputType.number, false),
  ];
}
