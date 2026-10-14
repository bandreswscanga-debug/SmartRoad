import 'package:flutter/material.dart';
import '../services/api.dart';
import '../theme.dart';

/// Conductores (solo admin): lista de la flota con vehículo y riesgo.
class DriversAdminScreen extends StatefulWidget {
  const DriversAdminScreen({super.key});

  @override
  State<DriversAdminScreen> createState() => _DriversAdminScreenState();
}

class _DriversAdminScreenState extends State<DriversAdminScreen> {
  final ApiClient _api = ApiClient();
  List<dynamic> _drivers = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final drivers = await _api.drivers();
      if (!mounted) return;
      setState(() {
        _drivers = drivers;
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
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Conductores', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text('${_drivers.length} registrados (vista admin). El registro y edición se hace en el panel web.',
                style: const TextStyle(color: AppColors.muted, fontSize: 12)),
            const SizedBox(height: 12),
            for (final d in _drivers)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.person_outline, color: AppColors.info),
                  title: Text('${d['nombre'] ?? ''}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  subtitle: Text(
                    '${d['email'] ?? '—'} · ${d['placa'] ?? '—'}\n${(d['vehiculo'] as Map?)?['codigo'] ?? 'Sin vehículo'} · riesgo ${d['riesgo'] ?? d['vehiculo']?['riesgo'] ?? '—'}',
                    style: const TextStyle(fontSize: 11, color: AppColors.muted),
                  ),
                  isThreeLine: true,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
