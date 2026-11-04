import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

/// Cámara del conductor: en esta versión envía pruebas de nivel al backend
/// (la detección con IA en vivo vive en el panel web /camara).
/// Todo queda filtrado a su usuario por el token.
class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  final ApiClient _api = ApiClient();
  bool _busy = false;
  String? _message;
  String _lastLevel = '—';

  Future<void> _send(String nivel) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await _api.testDrowsiness(nivel: nivel, descripcion: 'Prueba desde la app del conductor.');
      if (!mounted) return;
      setState(() {
        _lastLevel = nivel;
        _message = nivel == 'CRITICO'
            ? 'Nivel CRÍTICO enviado: se creó una alerta para tu vehículo.'
            : 'Nivel $nivel enviado correctamente.';
      });
    } catch (err) {
      if (!mounted) return;
      setState(() => _message = 'Error: $err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Cámara', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          const Text(
            'Envía tu estado de somnolencia al centro de control. Solo se registra contra tu usuario.',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Icon(Icons.videocam_outlined, size: 48, color: AppColors.faint),
                const SizedBox(height: 8),
                Text('Último nivel enviado: $_lastLevel',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                if (_message != null) ...[
                  const SizedBox(height: 8),
                  Text(_message!, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          for (final nivel in ['BAJO', 'MEDIO', 'CRITICO'])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: FilledButton(
                onPressed: _busy ? null : () => _send(nivel),
                style: nivel == 'CRITICO'
                    ? FilledButton.styleFrom(backgroundColor: AppColors.danger)
                    : null,
                child: Text(_busy ? 'Enviando…' : 'Reportar estado $nivel'),
              ),
            ),
        ],
      ),
    );
  }
}
