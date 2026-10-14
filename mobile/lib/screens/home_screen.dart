import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import '../services/api.dart';
import '../services/eye_detector.dart';
import '../theme.dart';
import 'history_screen.dart';
import 'reports_screen.dart';
import 'drivers_admin_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onLogout, this.isAdmin = false});

  final VoidCallback onLogout;
  final bool isAdmin;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;
  final ApiClient _api = ApiClient();
  bool _sosBusy = false;

  Future<void> _quickSos() async {
    setState(() => _sosBusy = true);
    try {
      final vehicles = await _api.vehicles();
      final codigo = vehicles.isNotEmpty
          ? (vehicles.first['codigo'] ?? 'TRK-001') as String
          : 'TRK-001';
      double lat = 4.7031;
      double lng = -74.1292;
      if (vehicles.isNotEmpty) {
        lat = (vehicles.first['lat'] as num?)?.toDouble() ?? lat;
        lng = (vehicles.first['lng'] as num?)?.toDouble() ?? lng;
      }
      await _api.reportSos(codigo: codigo, lat: lat, lng: lng);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SOS enviado al centro de control.')),
      );
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error SOS: $err')));
    } finally {
      if (mounted) setState(() => _sosBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = widget.isAdmin;
    final tabs = <Widget>[
      MonitorScreen(onLogout: widget.onLogout),
      const HistoryScreen(),
      const ReportsScreen(),
      if (admin) const DriversAdminScreen(),
      const ProfileScreen(),
    ];
    return Scaffold(
      body: IndexedStack(
        index: _index.clamp(0, tabs.length - 1),
        children: tabs,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _sosBusy ? null : _quickSos,
        backgroundColor: AppColors.danger,
        icon: const Icon(Icons.sos, color: Colors.white),
        label: Text(_sosBusy ? 'Enviando…' : 'SOS',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBar(
          backgroundColor: AppColors.surface,
          indicatorColor: AppColors.danger.withValues(alpha: 0.18),
          selectedIndex: _index.clamp(0, tabs.length - 1),
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: [
            const NavigationDestination(icon: Icon(Icons.radar), label: 'Monitoreo'),
            const NavigationDestination(icon: Icon(Icons.history), label: 'Historial'),
            const NavigationDestination(icon: Icon(Icons.bar_chart), label: 'Reportes'),
            if (admin) const NavigationDestination(icon: Icon(Icons.group_outlined), label: 'Conduct.'),
            const NavigationDestination(icon: Icon(Icons.person_outline), label: 'Perfil'),
          ],
        ),
      ),
    );
  }
}

/// Monitoreo del conductor: su vehículo real + alertas reales del centro
/// (igual que el panel web) + cámara con IA en vivo que mueve el semáforo.
class MonitorScreen extends StatefulWidget {
  const MonitorScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<MonitorScreen> createState() => _MonitorScreenState();
}

class _MonitorScreenState extends State<MonitorScreen> {
  final ApiClient _api = ApiClient();
  List<dynamic> _vehicles = [];
  List<dynamic> _alerts = [];
  bool _loadingVehicles = true;
  Timer? _poll;

  // Cámara + IA en vivo (ML Kit, en el dispositivo).
  CameraController? _cam;
  FaceDetector? _faceDetector;
  bool _camBusy = false;
  bool _detecting = false;
  String _etapa = 'Cámara apagada';
  String? _camError;
  String _level = 'NORMAL';
  double? _open;
  double _perclos = 0;
  int _streak = 0;
  bool _face = false;
  final EyeDrowsinessDetector _logic = EyeDrowsinessDetector();
  final List<double> _calib = [];
  DateTime? _calibStart;
  bool _isCalibrating = false;
  final Map<String, DateTime> _notifyLock = {};
  static const int _calibFrames = 25;
  static const int _calibTimeoutMs = 45000;

  @override
  void initState() {
    super.initState();
    _loadFleet();
    _poll = Timer.periodic(const Duration(seconds: 15), (_) => _loadFleet(quiet: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _stopCamera();
    super.dispose();
  }

  Future<void> _loadFleet({bool quiet = false}) async {
    try {
      final vehicles = await _api.vehicles();
      final alerts = await _api.activeAlerts();
      if (!mounted) return;
      setState(() {
        _vehicles = vehicles;
        _alerts = alerts;
        _loadingVehicles = false;
      });
    } catch (_) {
      if (!mounted || quiet) return;
      setState(() => _loadingVehicles = false);
    }
  }

  Map<String, dynamic>? get _vehicle =>
      _vehicles.isEmpty ? null : (_vehicles.first as Map<String, dynamic>);

  List<dynamic> get _myAlerts {
    final v = _vehicle;
    if (v == null) return [];
    return _alerts.where((a) => a['vehiculo_id'] == v['id']).toList();
  }

  /// Riesgo que manda: la IA en vivo si detecta, si no el del vehículo.
  String get _riesgo {
    if (_detecting && _face) return _level;
    if (_detecting && !_face) return _vehicle?['riesgo'] ?? 'BAJO';
    return _vehicle?['riesgo'] ?? 'BAJO';
  }

  Future<void> _stopCamera() async {
    try {
      await _cam?.stopImageStream();
    } catch (_) {
      /* ya detenida */
    }
    await _cam?.dispose();
    _cam = null;
    await _faceDetector?.close();
    _faceDetector = null;
    if (mounted) {
      setState(() {
        _detecting = false;
        _isCalibrating = false;
        _face = false;
        _etapa = 'Cámara apagada';
      });
    }
  }

  InputImage? _toInputImage(CameraImage image, CameraDescription camera) {
    try {
      final rotation = InputImageRotationValue.fromRawValue(camera.sensorOrientation) ??
          InputImageRotation.rotation0deg;
      final format = InputImageFormatValue.fromRawValue(image.format.raw) ?? InputImageFormat.nv21;
      if (format != InputImageFormat.nv21) return null;
      final plane = image.planes;
      final y = plane[0].bytes;
      final u = plane[1].bytes;
      final v = plane[2].bytes;
      final rowStride = plane[1].bytesPerRow;
      final pixelStride = plane[1].bytesPerPixel ?? 1;
      final w = plane[1].width;
      final h = plane[1].height;
      if (w == null || h == null) return null;
      final nv21 = List<int>.filled(y.length + u.length + v.length, 0);
      var offset = 0;
      nv21.setRange(offset, offset + y.length, y);
      offset += y.length;
      for (var row = 0; row < h; row++) {
        for (var col = 0; col < w; col++) {
          nv21[offset++] = v[row * rowStride + col * pixelStride];
          nv21[offset++] = u[row * rowStride + col * pixelStride];
        }
      }
      return InputImage.fromBytes(
        bytes: Uint8List.fromList(nv21),
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: InputImageFormat.nv21,
          bytesPerRow: plane[0].bytesPerRow,
        ),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _onFrame(CameraImage image) async {
    if (_camBusy || !mounted || !_detecting) return;
    final controller = _cam;
    final detector = _faceDetector;
    if (controller == null || detector == null) return;
    _camBusy = true;
    try {
      final input = _toInputImage(image, controller.description);
      if (input == null) return;
      final faces = await detector.processImage(input);
      if (!mounted || !_detecting) return;
      final face = faces.isEmpty ? null : faces.first;
      double? open;
      if (face != null) {
        final l = face.leftEyeOpenProbability;
        final r = face.rightEyeOpenProbability;
        open = (l != null && r != null) ? (l + r) / 2 : (l ?? r);
      }
      setState(() {
        _face = face != null;
      });
      if (open == null) {
        if (_isCalibrating &&
            DateTime.now().difference(_calibStart!).inMilliseconds > _calibTimeoutMs) {
          _failCalib();
        }
        return;
      }
      if (_isCalibrating) {
        _calib.add(open);
        setState(() => _open = open);
        if (_calib.length >= _calibFrames) {
          _logic.train(_calib);
          setState(() {
            _isCalibrating = false;
            _etapa = 'IA activa';
          });
        } else if (DateTime.now().difference(_calibStart!).inMilliseconds > _calibTimeoutMs) {
          _failCalib();
        }
        return;
      }
      final res = _logic.push(open);
      setState(() {
        _open = res.open;
        _perclos = res.perclos;
        _streak = res.streak;
      });
      _applyLevel(res.level);
    } catch (_) {
      /* frame fallido: sigue el siguiente */
    } finally {
      _camBusy = false;
    }
  }

  void _failCalib() {
    _stopCamera();
    if (!mounted) return;
    setState(() => _camError = 'No se detectó un rostro estable. Buena luz frontal, mire al frente y reintente.');
  }

  void _applyLevel(String next) {
    if (next == _level) return;
    setState(() => _level = next);
    if (next == 'CRITICO') {
      HapticFeedback.heavyImpact();
      _notify('CRITICO');
    } else if (next == 'MEDIO') {
      HapticFeedback.mediumImpact();
      _notify('MEDIO');
    }
  }

  Future<void> _notify(String nivel) async {
    final now = DateTime.now();
    final last = _notifyLock[nivel];
    if (last != null && now.difference(last) < Duration(seconds: nivel == 'CRITICO' ? 12 : 25)) return;
    _notifyLock[nivel] = now;
    try {
      await _api.testDrowsiness(
        nivel: nivel,
        descripcion: 'App conductor (ML Kit en Monitoreo): $nivel.',
      );
      if (mounted) await _loadFleet(quiet: true);
    } catch (_) {
      /* backend offline: la alarma local sigue */
    }
  }

  @override
  Widget build(BuildContext context) {
    final riesgo = _riesgo;
    final v = _vehicle;
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
                IconButton(
                  tooltip: 'Cerrar sesión',
                  onPressed: widget.onLogout,
                  icon: const Icon(Icons.logout, size: 20, color: AppColors.faint),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loadingVehicles
                ? const Center(child: CircularProgressIndicator())
                : v == null
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Text('Sin vehículo asignado. Pida al admin que le asigne uno.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: AppColors.muted)),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _SemaphoreCard(riesgo: riesgo),
                          const SizedBox(height: 12),
                          if (_myAlerts.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.danger.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.dangerBright.withValues(alpha: 0.6)),
                              ),
                              child: Text(
                                '¡Tiene ${_myAlerts.length} alerta(s) activa(s) en ${v['codigo']}!',
                                style: const TextStyle(
                                    color: AppColors.dangerBright, fontSize: 12, fontWeight: FontWeight.w800),
                              ),
                            ),
                          if (_myAlerts.isNotEmpty) const SizedBox(height: 12),
                          Row(
                            children: [
                              _StatTile(
                                  icon: Icons.speed,
                                  label: _detecting ? 'Fatiga IA' : 'Fatiga',
                                  value: _detecting && _open != null
                                      ? '${(_perclos * 100).round()}%'
                                      : '${v['riesgo'] == 'CRITICO' ? 86 : v['riesgo'] == 'MEDIO' ? 62 : 24}%',
                                  color: riskColor(riesgo)),
                              const SizedBox(width: 12),
                              _StatTile(
                                  icon: Icons.directions_car,
                                  label: 'Vehículo',
                                  value: '${v['codigo']}',
                                  color: AppColors.text),
                              const SizedBox(width: 12),
                              _StatTile(
                                  icon: Icons.gps_fixed,
                                  label: 'Velocidad',
                                  value: '${v['velocidad'] ?? 0} km/h',
                                  color: AppColors.text),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _CameraPanel(
                            detecting: _detecting,
                            camBusy: _camBusy,
                            etapa: _etapa,
                            isCalibrating: _isCalibrating,
                            calibDone: _calib.length,
                            calibTotal: _calibFrames,
                            face: _face,
                            streak: _streak,
                            controller: _cam,
                            error: _camError,
                            onToggle: _toggleCamera,
                          ),
                          const SizedBox(height: 12),
                          _AlarmCard(riesgo: riesgo),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleCamera() async {
    if (_detecting || _camBusy) {
      await _stopCamera();
      return;
    }
    setState(() {
      _camBusy = true;
      _camError = null;
      _etapa = 'Abriendo cámara…';
      _level = 'NORMAL';
      _calib.clear();
      _calibStart = DateTime.now();
      _logic.reset();
    });
    try {
      final cameras = await availableCameras();
      final front = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      final controller = CameraController(front, ResolutionPreset.low, enableAudio: false);
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      _cam = controller;
      _faceDetector = FaceDetector(
        options: FaceDetectorOptions(
          enableClassification: true,
          enableTracking: true,
          performanceMode: FaceDetectorMode.fast,
          minFaceSize: 0.15,
        ),
      );
      setState(() {
        _detecting = true;
        _isCalibrating = true;
        _etapa = 'Calibrando con su mirada (mire al frente)…';
      });
      await controller.startImageStream(_onFrame);
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _camError = 'No se pudo abrir la cámara: $err';
        _etapa = 'Cámara apagada';
      });
    } finally {
      if (mounted) setState(() => _camBusy = false);
    }
  }
}

class _CameraPanel extends StatelessWidget {
  const _CameraPanel({
    required this.detecting,
    required this.camBusy,
    required this.etapa,
    required this.isCalibrating,
    required this.calibDone,
    required this.calibTotal,
    required this.face,
    required this.streak,
    required this.controller,
    required this.error,
    required this.onToggle,
  });

  final bool detecting;
  final bool camBusy;
  final String etapa;
  final bool isCalibrating;
  final int calibDone;
  final int calibTotal;
  final bool face;
  final int streak;
  final CameraController? controller;
  final String? error;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final previewOk = controller != null && controller!.value.isInitialized;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.videocam_outlined, size: 18, color: AppColors.info),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('Cámara con IA en vivo', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
              ),
              FilledButton.tonal(
                onPressed: camBusy ? null : onToggle,
                child: Text(camBusy ? '…' : detecting ? 'Detener' : 'Activar cámara'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text('Estado: $etapa', style: const TextStyle(color: AppColors.muted, fontSize: 11)),
          if (isCalibrating)
            Text('Calibración $calibDone/$calibTotal · mire al frente',
                style: const TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.w700)),
          if (detecting && previewOk) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(aspectRatio: 4 / 3, child: CameraPreview(controller!)),
            ),
            const SizedBox(height: 4),
            Text(face ? 'Rostro detectado · racha $streak' : 'Sin rostro a la vista',
                style: TextStyle(
                    color: face ? AppColors.success : Colors.orange,
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          ],
          if (error != null) ...[
            const SizedBox(height: 6),
            Text(error!, style: const TextStyle(color: AppColors.dangerBright, fontSize: 11)),
          ],
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
