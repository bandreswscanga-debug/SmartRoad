import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api.dart';
import '../theme.dart';

class RegistroScreen extends StatefulWidget {
  const RegistroScreen({super.key, required this.onRegistroExitoso});

  final VoidCallback onRegistroExitoso;

  @override
  State<RegistroScreen> createState() => _RegistroScreenState;
}

class _RegistroScreenState extends State<RegistroScreen> {
  final TextEditingController _nombre = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _pass = TextEditingController();
  final TextEditingController _telefono = TextEditingController();
  final ApiClient _api = ApiClient();
  String _tipoPersona = 'persona_natural'; // 'persona_natural' | 'empresa'
  bool _busy = false;
  bool _showPass = false;
  String? _error;

  @override
  void dispose() {
    _nombre.dispose();
    _email.dispose();
    _pass.dispose();
    _telefono.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _api.register(
        nombre: _nombre.text.trim(),
        email: _email.text.trim(),
        password: _pass.text,
        tipoPersona: _tipoPersona,
        telefonoContacto: _tipoPersona == 'empresa' ? _telefono.text.trim() : null,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('srs_token', data['token'] as String);
      if (data['user'] is Map) {
        await prefs.setString('srs_user', jsonEncode(data['user']));
      }
      if (mounted) widget.onRegistroExitoso();
    } catch (err) {
      if (mounted) setState(() => _error = err.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _buildTipoSelector() {
    return Row(
      children: [
        Expanded(
          child: _TipoBoton(
            label: 'Persona natural',
            icon: Icons.person_outline,
            activo: _tipoPersona == 'persona_natural',
            onTap: () => setState(() => _tipoPersona = 'persona_natural'),
          ),
        ),
        Expanded(
          child: _TipoBoton(
            label: 'Empresa',
            icon: Icons.business_outlined,
            activo: _tipoPersona == 'empresa',
            onTap: () => setState(() => _tipoPersona = 'empresa'),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
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
                      child: const Text('Volver al ingreso'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Crear cuenta',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.text,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Regístrate como conductor o empresa',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                  const SizedBox(height: 24),
                  _buildTipoSelector(),
                  const SizedBox(height: 20),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextField(
                            controller: _nombre,
                            textCapitalization: TextCapitalization.words,
                            decoration: InputDecoration(
                              labelText: _tipoPersona == 'empresa'
                                  ? 'Razón social de la empresa'
                                  : 'Nombre completo',
                              prefixIcon: const Icon(
                                Icons.person_outline,
                                color: AppColors.faint,
                              ),
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
                          if (_tipoPersona == 'empresa') ...[
                            TextField(
                              controller: _telefono,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                labelText: 'Número de contacto (proveedor)',
                                prefixIcon: Icon(Icons.phone_outlined, color: AppColors.faint),
                              ),
                            ),
                            const SizedBox(height: 14),
                            const Text(
                              'Este número se usará para contactar al proveedor de la empresa.',
                              style: TextStyle(color: AppColors.faint, fontSize: 11),
                            ),
                            const SizedBox(height: 6),
                          ],
                          TextField(
                            controller: _pass,
                            obscureText: !_showPass,
                            decoration: InputDecoration(
                              labelText: 'Contraseña',
                              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.faint),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _showPass ? Icons.visibility_off : Icons.visibility,
                                  color: AppColors.faint,
                                ),
                                onPressed: () => setState(() => _showPass = !_showPass),
                              ),
                            ),
                          ),
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
                                : const Text('Crear cuenta'),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            'SENA · SmartRoad S.O.S · Registro',
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

class _TipoBoton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool activo;
  final VoidCallback onTap;

  const _TipoBoton({
    required this.label,
    required this.icon,
    required this.activo,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: activo ? Colors.white : AppColors.muted,
        ),
      ),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 12),
        foregroundColor: activo ? Colors.white : AppColors.muted,
        side: BorderSide(
          color: activo ? AppColors.danger : AppColors.muted.withValues(alpha: 0.5),
        ),
        backgroundColor: activo ? AppColors.danger : Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
}
