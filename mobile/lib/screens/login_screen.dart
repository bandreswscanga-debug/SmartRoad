import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});

  final VoidCallback onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _email = TextEditingController(text: 'bandreswscanga@hgmail.com');
  final TextEditingController _pass = TextEditingController(text: '5304566767');
  final ApiClient _api = ApiClient();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _api.login(_email.text.trim(), _pass.text);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('srs_token', data['token'] as String);
      if (data['user'] is Map) {
        await prefs.setString('srs_user', jsonEncode(data['user']));
      }
      if (mounted) widget.onLogin();
    } catch (err) {
      if (mounted) setState(() => _error = err.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _pass.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Logo(),
                  const SizedBox(height: 8),
                  const Text(
                    'Centro de control · Detección de somnolencia',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                  const SizedBox(height: 28),
                  _buildForm(),
                  const SizedBox(height: 16),
                  const Text(
                    'SENA · SmartRoad S.O.S · ESP32',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.faint, fontSize: 10, letterSpacing: 1.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
              controller: _pass,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Contraseña',
                prefixIcon: Icon(Icons.lock_outline, color: AppColors.faint),
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
                    Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.dangerBright, fontSize: 12))),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 18),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Ingresar al panel'),
            ),
            const SizedBox(height: 12),
            const Text(
              'Acceso admin: bandreswscanga@hgmail.com',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.faint, fontSize: 11),
            ),
          ],
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
            color: AppColors.danger,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: AppColors.danger.withValues(alpha: 0.4), blurRadius: 40, spreadRadius: 4)],
          ),
          child: const Icon(Icons.shield_rounded, color: Colors.white, size: 42),
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