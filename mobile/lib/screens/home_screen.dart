import 'package:flutter/material.dart';
import '../theme.dart';
import 'history_screen.dart';
import 'sos_screen.dart';
import 'config_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          MonitorScreen(onLogout: widget.onLogout),
          const HistoryScreen(),
          const SosScreen(),
          const ConfigScreen(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBar(
          backgroundColor: AppColors.surface,
          indicatorColor: AppColors.danger.withValues(alpha: 0.18),
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.radar), label: 'Monitoreo'),
            NavigationDestination(icon: Icon(Icons.history), label: 'Historial'),
            NavigationDestination(icon: Icon(Icons.sos), label: 'SOS'),
            NavigationDestination(icon: Icon(Icons.tune), label: 'Config'),
          ],
        ),
      ),
    );
  }
}

class MonitorScreen extends StatefulWidget {
  const MonitorScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<MonitorScreen> createState() => _MonitorScreenState();
}

class _MonitorScreenState extends State<MonitorScreen> {
  int _perclos = 38;

  @override
  void initState() {
    super.initState();
    _tick();
  }

  void _tick() {
    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() {
        _perclos = (_perclos + (DateTime.now().millisecondsSinceEpoch % 11) - 5).clamp(6, 96);
      });
      _tick();
    });
  }

  String get _riesgo => _perclos >= 80 ? 'CRITICO' : _perclos >= 50 ? 'MEDIO' : 'BAJO';

  @override
  Widget build(BuildContext context) {
    final riesgo = _riesgo;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.danger,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [BoxShadow(color: AppColors.danger.withValues(alpha: 0.35), blurRadius: 18)],
                  ),
                  child: const Icon(Icons.shield_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('SmartRoad SOS', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text('Monitoreo del conductor', style: TextStyle(color: AppColors.muted, fontSize: 11)),
                  ],
                ),
                const Spacer(),
                const Row(
                  children: [
                    Icon(Icons.circle, color: AppColors.success, size: 9),
                    SizedBox(width: 4),
                    Text('EN VIVO', style: TextStyle(color: AppColors.success, fontSize: 10, fontWeight: FontWeight.w700)),
                  ],
                ),
                IconButton(
                  tooltip: 'Cerrar sesión',
                  onPressed: widget.onLogout,
                  icon: const Icon(Icons.logout, size: 20, color: AppColors.faint),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _SemaphoreCard(riesgo: riesgo),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _StatTile(icon: Icons.speed, label: 'Fatiga', value: '$_perclos%', color: riskColor(riesgo)),
                    const SizedBox(width: 12),
                    _StatTile(icon: Icons.remove_red_eye, label: 'Ojos', value: riesgo == 'CRITICO' ? 'Cerrados' : riesgo == 'MEDIO' ? 'Semi' : 'Abiertos', color: riskColor(riesgo)),
                    const SizedBox(width: 12),
                    const _StatTile(icon: Icons.gps_fixed, label: 'Velocidad', value: '82 km/h', color: AppColors.text),
                  ],
                ),
                const SizedBox(height: 16),
                _AlarmCard(riesgo: riesgo),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SemaphoreCard extends StatelessWidget {
  const _SemaphoreCard({required this.riesgo});

  final String riesgo;

  @override
  Widget build(BuildContext context) {
    final color = riskColor(riesgo);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: riesgo == 'CRITICO' ? color : AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: ['BAJO', 'MEDIO', 'CRITICO'].map((r) {
              final on = r == riesgo;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: on ? riskColor(r) : AppColors.surface3,
                        boxShadow: on ? [BoxShadow(color: riskColor(r), blurRadius: 22, spreadRadius: 3)] : null,
                      ),
                      child: Icon(
                        r == 'BAJO'
                            ? Icons.check
                            : r == 'MEDIO'
                                ? Icons.warning_amber_rounded
                                : Icons.dangerous,
                        color: on ? Colors.black : AppColors.faint,
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(riskLabel(r), style: TextStyle(color: on ? riskColor(r) : AppColors.faint, fontSize: 10, fontWeight: FontWeight.w700)),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          Text(
            riesgo == 'CRITICO'
                ? 'PELIGRO · posibles micro sueños (RF1)'
                : riesgo == 'MEDIO'
                    ? 'ALERTA · se sugiere pausa (RF9)'
                    : 'Condición normal',
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

class _AlarmCard extends StatelessWidget {
  const _AlarmCard({required this.riesgo});

  final String riesgo;

  @override
  Widget build(BuildContext context) {
    final critical = riesgo == 'CRITICO';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: critical ? AppColors.danger.withValues(alpha: 0.14) : AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: critical ? AppColors.dangerBright.withValues(alpha: 0.6) : AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(critical ? Icons.notification_important : Icons.volume_up, color: critical ? AppColors.dangerBright : AppColors.muted),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  critical ? 'Alarma sonora activa hasta reacción del conductor (RF3)' : 'Alerta sonora preparada (RF2 · RNF6)',
                  style: TextStyle(
                    color: critical ? AppColors.dangerBright : AppColors.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: 1,
              minHeight: 8,
              backgroundColor: AppColors.surface3,
              valueColor: AlwaysStoppedAnimation(riskColor(riesgo)),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.icon, required this.label, required this.value, required this.color});

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(icon, size: 14, color: AppColors.faint),
              const SizedBox(width: 4),
              Text(label, style: const TextStyle(color: AppColors.faint, fontSize: 9, letterSpacing: 0.6)),
            ]),
            const SizedBox(height: 6),
            Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }
}