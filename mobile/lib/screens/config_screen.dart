import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

class ConfigScreen extends StatefulWidget {
  const ConfigScreen({super.key});

  @override
  State<ConfigScreen> createState() => _ConfigScreenState();
}

class _ConfigScreenState extends State<ConfigScreen> {
  final ApiClient _api = ApiClient();
  final TextEditingController _emergenciaCtrl = TextEditingController();

  bool sonora = true;
  bool vibracion = true;
  bool visual = false;
  bool autoSos = true;
  int sensibilidad = 70;
  String emergencia = '123';

  bool _loading = true;
  bool _saving = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _emergenciaCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final config = await _api.config();
      if (!mounted) return;
      setState(() {
        sonora = config['alerta_sonora'] == true || config['alerta_sonora'] == 1;
        vibracion = config['alerta_vibracion'] == true || config['alerta_vibracion'] == 1;
        visual = config['alerta_visual'] == true || config['alerta_visual'] == 1;
        autoSos = config['auto_sos'] == true || config['auto_sos'] == 1;
        sensibilidad = (config['sensibilidad'] as num?)?.toInt() ?? 70;
        emergencia = (config['numero_emergencia'] as String?) ?? '123';
        _emergenciaCtrl.text = emergencia;
        _loading = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _message = 'No se pudo descargar la configuración: $err';
      });
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      await _api.updateConfig({
        'alerta_sonora': sonora,
        'alerta_vibracion': vibracion,
        'alerta_visual': visual,
        'auto_sos': autoSos,
        'sensibilidad': sensibilidad,
        'numero_emergencia': emergencia,
      });
      if (!mounted) return;
      setState(() => _message = 'Configuración guardada y sincronizada con el dispositivo (CU-05)');
    } catch (err) {
      if (!mounted) return;
      setState(() => _message = 'Error al guardar: $err');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.danger))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Configuración', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                const Text('Tipo de alerta, sensibilidad y número de emergencia (CU-05)', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                const SizedBox(height: 18),
                _section('Tipo de alerta al conductor'),
                _switchTile(Icons.volume_up, 'Alerta sonora', 'Tono agudo (RF2 · RNF6)', sonora, (v) => setState(() => sonora = v)),
                _switchTile(Icons.vibration, 'Vibración', 'Vibración en el volante', vibracion, (v) => setState(() => vibracion = v)),
                _switchTile(Icons.lightbulb_outline, 'Alerta visual', 'Luz del semáforo de riesgo (RF8)', visual, (v) => setState(() => visual = v)),
                _switchTile(Icons.sos, 'SOS automático', 'Emergencia tras no reacción (RF4)', autoSos, (v) => setState(() => autoSos = v)),
                const SizedBox(height: 20),
                _section('Sensibilidad del sensor'),
                _card(
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Text('Sensibilidad', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                          const Spacer(),
                          Text('$sensibilidad%', style: const TextStyle(color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w800)),
                        ],
                      ),
                      Slider(
                        value: sensibilidad.toDouble(),
                        min: 20,
                        max: 100,
                        activeColor: AppColors.danger,
                        inactiveColor: AppColors.surface3,
                        onChanged: (v) => setState(() => sensibilidad = v.round()),
                      ),
                      const Text('Mayor valor = detección más temprana de micro sueños (RF1)', style: TextStyle(color: AppColors.faint, fontSize: 11)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _section('Emergencia'),
                _card(
                  TextField(
                    controller: _emergenciaCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Número de emergencia',
                      prefixIcon: Icon(Icons.phone, color: AppColors.faint),
                    ),
                    onChanged: (v) => emergencia = v,
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Guardar configuración'),
                ),
                if (_message != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: (_message!.startsWith('Error'))
                          ? AppColors.danger.withValues(alpha: 0.12)
                          : AppColors.success.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_message!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ],
                const SizedBox(height: 80),
              ],
            ),
    );
  }

  Widget _section(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          title,
          style: const TextStyle(color: AppColors.faint, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2),
        ),
      );

  Widget _card(Widget child) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: child,
      );

  Widget _switchTile(IconData icon, String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
    return _card(
      Row(
        children: [
          Icon(icon, color: value ? AppColors.success : AppColors.faint, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                Text(subtitle, style: const TextStyle(color: AppColors.faint, fontSize: 11)),
              ],
            ),
          ),
          Switch(value: value, onChanged: onChanged),
        ],
      ),
    );
  }
}