import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api.dart';
import '../theme.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key, required this.user, required this.onPerfilActualizado});

  final Map<String, dynamic> user;
  final VoidCallback onPerfilActualizado;

  @override
  State<PerfilScreen> createState() => _PerfilScreenState;
}

class _PerfilScreenState extends State<PerfilScreen> {
  final TextEditingController _nombre = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _telefono = TextEditingController();
  final ApiClient _api = ApiClient();
  bool _busy = false;
  bool _showPass = false;
  String? _error;
  String? _tipoPersona;

  @override
  void initState() {
    super.initState();
    _nombre.text = widget.user['nombre']?.toString() ?? '';
    _email.text = widget.user['email']?.toString() ?? '';
    _telefono.text = widget.user['telefono_contacto']?.toString() ?? '';
    _tipoPersona = widget.user['tipo_persona']?.toString();
  }

  @override
  void dispose() {
    _nombre.dispose();
    _email.dispose();
    _telefono.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _api.updateProfile(
        nombre: _nombre.text.trim(),
        email: _email.text.trim(),
        telefonoContacto: _telefono.text.trim().isNotEmpty ? _telefono.text.trim() : null,
      );
      final prefs = await SharedPreferences.getInstance();
      if (data['user'] is Map) {
        await prefs.setString('srs_user', jsonEncode(data['user']));
      }
      if (mounted) {
        widget.onPerfilActualizado();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Perfil actualizado correctamente')),
        );
      }
    } catch (err) {
      if (mounted) setState(() => _error = err.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final esEmpresa = _tipoPersona == 'empresa';

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Logo(),
                  const SizedBox(height: 8),
                  const Text(
                    'Centro de control · Detección de somnolencia',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () => Navigator.maybePop(context),
                      child: const Text('Volver al panel'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Mi Perfil',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.text,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Edita tus datos de cuenta',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                  const SizedBox(height: 24),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.person_outline, color: AppColors.info, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  esEmpresa ? 'Empresa' : 'Persona natural',
                                  style: TextStyle(
                                    color: AppColors.info,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          TextField(
                            controller: _nombre,
                            textCapitalization: TextCapitalization.words,
                            decoration: InputDecoration(
                              labelText: esEmpresa ? 'Razón social de la empresa' : 'Nombre completo',
                              prefixIcon: const Icon(Icons.person_outline, color: AppColors.faint),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'Correo electrónico',
                              prefixIcon: Icon(Icons.mail_outline, color: AppColors.faint),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _telefono,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              labelText: esEmpresa
                                  ? 'Número de contacto (proveedor)'
                                  : 'Número de contacto (opcional)',
                              prefixIcon: const Icon(Icons.phone_outlined, color: AppColors.faint),
                            ),
                          ),
                          if (esEmpresa) ...[
                            const SizedBox(height: 8),
                            const Text(
                              'Este número se usará para contactar al proveedor de la empresa.',
                              style: TextStyle(color: AppColors.faint, fontSize: 11),
                            ),
                          ],
                          if (_error != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.danger.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.danger.withValues(alpha: 0.5)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: AppColors.dangerBright, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _error!,
                                      style: const TextStyle(color: AppColors.dangerBright, fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: _busy ? null : _submit,
                            child: _busy
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Text('Guardar cambios'),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            'SENA · SmartRoad S.O.S · Mi Perfil',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.faint, fontSize: 10, letterSpacing: 1.5),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            color: AppColors.info,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: AppColors.info.withValues(alpha: 0.4), blurRadius: 40, spreadRadius: 4)],
          ),
          child: const Icon(Icons.person_rounded, color: Colors.white, size: 42),
        ),
        const SizedBox(height: 14),
        const Text.rich(
          TextSpan(
            text: 'SmartRoad ',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppColors.text),
            children: [
              TextSpan(text: 'S.O.S', style: TextStyle(color: AppColors.dangerBright)),
            ],
          ),
        ),
      ],
    );
  }
}
