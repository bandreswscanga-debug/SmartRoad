import 'dart:async';
import 'package:flutter/material.dart';
import '../models.dart';
import '../services/api.dart';
import '../theme.dart';
import '../widgets/risk_semaphore.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final ApiClient _api = ApiClient();
  final List<Evento> _events = [];
  bool _loading = true;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load(quiet: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool quiet = false}) async {
    try {
      final raw = await _api.events();
      if (!mounted) return;
      setState(() {
        _events
          ..clear()
          ..addAll(raw.map((e) => Evento.fromJson(e as Map<String, dynamic>)));
        _error = null;
        _loading = false;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        if (!quiet) _error = err.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Row(
              children: [
                const Text('Historial de eventos', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                const Spacer(),
                Text('${_events.length} registros', style: const TextStyle(color: AppColors.faint, fontSize: 11)),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text('Registro de anomalías y señales de emergencia (RF10)', style: TextStyle(color: AppColors.muted, fontSize: 12)),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.danger))
                : _error != null && _events.isEmpty
                    ? _ErrorView(message: _error!, onRetry: _load)
                    : _events.isEmpty
                        ? const _EmptyView()
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: AppColors.danger,
                            backgroundColor: AppColors.surface,
                            child: ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                              itemCount: _events.length,
                              itemBuilder: (context, i) => _EventTile(evento: _events[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.evento});

  final Evento evento;

  @override
  Widget build(BuildContext context) {
    final color = riskColor(evento.riesgo);
    final icon = switch (evento.tipo) {
      'MICRO_SUENO' => Icons.visibility,
      'SOMNOLENCIA_ALTA' => Icons.bolt,
      'FATIGA_PROLONGADA' => Icons.hourglass_bottom,
      'DISTRACCION' => Icons.visibility_off,
      'SOS' => Icons.sos,
      _ => Icons.event_note,
    };
    final t = evento.timestamp;
    final hh = '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: evento.riesgo == 'CRITICO' ? color.withValues(alpha: 0.55) : AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _tipoLabel(evento.tipo),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.text),
                      ),
                    ),
                    RiskChip(riesgo: evento.riesgo),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${evento.vehiculo} · ${evento.conductor}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                ),
                const SizedBox(height: 2),
                Text(
                  evento.descripcion,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.faint, fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            children: [
              Text(hh, style: const TextStyle(color: AppColors.muted, fontSize: 11, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              if (evento.respuestaMs > 0)
                Text('${evento.respuestaMs} ms', style: const TextStyle(color: AppColors.faint, fontSize: 9)),
            ],
          ),
        ],
      ),
    );
  }

  String _tipoLabel(String tipo) {
    switch (tipo) {
      case 'MICRO_SUENO':
        return 'Micro sueño';
      case 'SOMNOLENCIA_ALTA':
        return 'Somnolencia alta';
      case 'FATIGA_PROLONGADA':
        return 'Fatiga prolongada';
      case 'DISTRACCION':
        return 'Distracción';
      case 'SOS':
        return 'Señal SOS';
      case 'ACCIDENTE':
        return 'Accidente';
      default:
        return tipo;
    }
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, color: AppColors.dangerBright, size: 40),
          const SizedBox(height: 12),
          const Text('No se pudo conectar con el servicio', style: TextStyle(color: AppColors.muted, fontSize: 12)),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.faint, fontSize: 11)),
          ),
          const SizedBox(height: 14),
          OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('Sin eventos registrados', style: TextStyle(color: AppColors.faint)),
    );
  }
}