import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

/// Reportes del conductor: resumen y alertas recientes.
/// El backend ya filtra todo por el token (solo sus datos).
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final ApiClient _api = ApiClient();
  Map<String, dynamic>? _summary;
  List<dynamic> _alerts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final s = await _api.summary();
      final a = await _api.recentAlerts();
      if (!mounted) return;
      setState(() {
        _summary = (s['summary'] as Map?)?.cast<String, dynamic>();
        _alerts = a;
        _loading = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _error = err.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SafeArea(child: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.dangerBright, fontSize: 12)),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => setState(() {
                    _loading = true;
                    _error = null;
                    _load();
                  }),
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final s = _summary ?? {};
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Reportes', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            const Text('Solo tus datos de conductor.',
                style: TextStyle(color: AppColors.muted, fontSize: 12)),
            const SizedBox(height: 16),
            Row(
              children: [
                _Kpi(label: 'Eventos 24h', value: '${s['eventos_24h'] ?? 0}'),
                const SizedBox(width: 12),
                _Kpi(label: 'Alertas activas', value: '${s['alertas_activas'] ?? 0}'),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _Kpi(label: 'Sin atender', value: '${s['anomalias_sin_atender'] ?? 0}'),
                const SizedBox(width: 12),
                _Kpi(label: 'Mis vehículos', value: '${s['vehiculos'] ?? 0}'),
              ],
            ),
            const SizedBox(height: 20),
            const Text('Alertas recientes',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            if (_alerts.isEmpty)
              const Text('Sin alertas recientes.',
                  style: TextStyle(color: AppColors.muted, fontSize: 12)),
            for (final a in _alerts)
              Card(
                child: ListTile(
                  dense: true,
                  title: Text('${a['tipo'] ?? 'Alerta'} · ${a['vehiculo_codigo'] ?? ''}',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  subtitle: Text('${a['estado'] ?? ''} · ${a['timestamp'] ?? ''}',
                      style: const TextStyle(fontSize: 11, color: AppColors.muted)),
                  trailing: Text('${a['riesgo'] ?? ''}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppColors.faint, fontSize: 10)),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }
}
