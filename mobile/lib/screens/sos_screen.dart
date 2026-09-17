import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  final ApiClient _api = ApiClient();
  bool _sending = false;
  String? _result;

  Future<void> _sendSos() async {
    setState(() {
      _sending = true;
      _result = null;
    });
    try {
      await _api.reportSos(codigo: 'TRK-001', lat: 4.7031, lng: -74.1292);
      if (!mounted) return;
      setState(() => _result = 'Señal SOS enviada al centro de control (RF4). Llamando a emergencias…');
    } catch (err) {
      if (!mounted) return;
      setState(() => _result = 'Error: $err');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Botón de emergencia', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            const Text(
              'Al presionarlo se envía la ubicación GPS actual y se contacta al número de emergencia configurado (RF4).',
              style: TextStyle(color: AppColors.muted, fontSize: 13, height: 1.4),
            ),
            const Spacer(),
            Center(
              child: _sending
                  ? const CircularProgressIndicator(color: AppColors.danger)
                  : GestureDetector(
                      onTap: _sendSos,
                      child: Container(
                        width: 200,
                        height: 200,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.danger,
                          boxShadow: [
                            BoxShadow(color: AppColors.danger.withValues(alpha: 0.55), blurRadius: 50, spreadRadius: 10),
                            BoxShadow(color: AppColors.danger.withValues(alpha: 0.25), blurRadius: 90, spreadRadius: 20),
                          ],
                          border: Border.all(color: AppColors.dangerBright, width: 6),
                        ),
                        child: const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.sos, size: 64, color: Colors.white),
                            Text('SOS', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 4)),
                            Text('mantener 2 s', style: TextStyle(color: Colors.white70, fontSize: 10)),
                          ],
                        ),
                      ),
                    ),
            ),
            const Spacer(),
            if (_result != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _result!.startsWith('Error')
                      ? AppColors.danger.withValues(alpha: 0.12)
                      : AppColors.success.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: (_result!.startsWith('Error') ? AppColors.danger : AppColors.success).withValues(alpha: 0.4),
                  ),
                ),
                child: Text(_result!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              ),
            const SizedBox(height: 12),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.location_on, color: AppColors.info, size: 16),
                SizedBox(width: 6),
                Text('GPS: 4.7031, -74.1292 · Ruta 45', style: TextStyle(color: AppColors.muted, fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}