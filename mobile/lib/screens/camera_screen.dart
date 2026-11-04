import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import '../services/api.dart';
import '../services/eye_detector.dart';
import '../theme.dart';

/// Cámara con detección real en el dispositivo (ML Kit, sin servidor ni
/// modelo descargado por usted: corre offline tras la primera descarga de
/// Play Services). Calibra su apertura ocular y mide somnolencia con
/// ventana PERCLOS + histéresis, igual que el panel web.
class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  final ApiClient _api = ApiClient();
  CameraController? _controller;
  FaceDetector? _detector;
  bool _busy = false; // frame en proceso
  bool _starting = false;
  bool _running = false;
  bool _isCalibrating = false;
  String? _error;
  String? _message;
  String _etapa = 'En espera';
  String _level = 'NORMAL';
  double? _open;
  double _perclos = 0;
  int _streak = 0;
  double? _threshold;
  int _frames = 0;
  bool _face = false;
  bool _alarmOn = false;

  final EyeDrowsinessDetector _detectorLogic = EyeDrowsinessDetector();
  final List<double> _calib = [];
  DateTime? _calibStart;
  final Map<String, DateTime> _notifyLock = {};
  static const int _calibFrames = 25;
  static const int _calibTimeoutMs = 45000;

  @override
  void dispose() {
    _stop();
    super.dispose();
  }

  Future<void> _stop() async {
    try {
      await _controller?.stopImageStream();
    } catch (_) {
      /* ya detenido */
    }
    await _controller?.dispose();
    _controller = null;
    await _detector?.close();
    _detector = null;
    if (mounted) {
      setState(() {
        _running = false;
        _starting = false;
        _isCalibrating = false;
        _alarmOn = false;
        _etapa = 'En espera';
      });
    }
  }

  Future<void> _start() async {
    setState(() {
      _starting = true;
      _error = null;
      _message = null;
      _etapa = 'Abriendo cámara…';
      _level = 'NORMAL';
      _calib.clear();
      _calibStart = DateTime.now();
      _detectorLogic.reset();
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
      _controller = controller;
      _detector = FaceDetector(
        options: FaceDetectorOptions(
          enableClassification: true,
          enableTracking: true,
          performanceMode: FaceDetectorMode.fast,
          minFaceSize: 0.15,
        ),
      );
      setState(() {
        _etapa = 'Calibrando con su mirada (mire al frente)…';
        _running = true;
        _isCalibrating = true;
      });
      await controller.startImageStream(_onFrame);
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _starting = false;
        _running = false;
        _etapa = 'Error al iniciar';
        _error = err.toString().contains('permission')
            ? 'Permiso de cámara denegado. Habilítelo en Ajustes → Apps → SmartRoad.'
            : 'No se pudo iniciar la cámara: $err';
      });
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  InputImage? _toInputImage(CameraImage image, CameraDescription camera) {
    try {
      final rotation = InputImageRotationValue.fromRawValue(camera.sensorOrientation) ??
          InputImageRotation.rotation0deg;
      final format = InputImageFormatValue.fromRawValue(image.format.raw) ?? InputImageFormat.nv21;
      if (format != InputImageFormat.nv21) return null;
      final plane = image.planes;
      final bytes = plane[0].bytes;
      // NV21: Y + VU intercalado.
      final nv21 = List<int>.filled(bytes.length + plane[1].bytes.length + plane[2].bytes.length, 0);
      var offset = 0;
      nv21.setRange(offset, offset + plane[0].bytes.length, plane[0].bytes);
      offset += plane[0].bytes.length;
      final rowStride = plane[1].bytesPerRow;
      final pixelStride = plane[1].bytesPerPixel ?? 1;
      for (var row = 0; row < plane[1].height!; row++) {
        for (var col = 0; col < plane[1].width!; col++) {
          nv21[offset++] = plane[2].bytes[row * rowStride + col * pixelStride];
          nv21[offset++] = plane[1].bytes[row * rowStride + col * pixelStride];
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
    if (_busy || !mounted || !_running) return;
    final controller = _controller;
    final detector = _detector;
    if (controller == null || detector == null) return;
    _busy = true;
    try {
      final input = _toInputImage(image, controller.description);
      if (input == null) return;
      final faces = await detector.processImage(input);
      if (!mounted || !_running) return;
      final face = faces.isEmpty ? null : faces.first;
      double? open;
      if (face != null) {
        final l = face.leftEyeOpenProbability;
        final r = face.rightEyeOpenProbability;
        if (l != null && r != null) {
          open = (l + r) / 2;
        } else {
          open = l ?? r;
        }
      }
      setState(() {
        _frames++;
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
        setState(() {
          _open = open;
        });
        if (_calib.length >= _calibFrames) {
          _detectorLogic.train(_calib);
          setState(() {
            _calibratingDone();
          });
        } else if (DateTime.now().difference(_calibStart!).inMilliseconds > _calibTimeoutMs) {
          _failCalib();
        }
        return;
      }
      final res = _detectorLogic.push(open);
      setState(() {
        _open = res.open;
        _perclos = res.perclos;
        _streak = res.streak;
        _threshold = res.threshold;
      });
      _applyLevel(res.level);
    } catch (_) {
      /* frame fallido: sigue el siguiente */
    } finally {
      _busy = false;
    }
  }

  void _calibratingDone() {
    _threshold = _detectorLogic.threshold;
    _isCalibrating = false;
    setState(() {
      _etapa = 'Activa';
      _message = 'IA calibrada: umbral personal listo.';
    });
  }

  void _failCalib() {
    _isCalibrating = false;
    _stop();
    if (!mounted) return;
    setState(() {
      _error = 'No se detectó un rostro estable. Buena luz frontal, mire al frente a ~50 cm y reintente.';
      _etapa = 'Falló la calibración';
    });
  }

  void _applyLevel(String next) {
    if (next == _level) return;
    final prev = _level;
    setState(() => _level = next);
    if (next == 'CRITICO') {
      HapticFeedback.heavyImpact();
      setState(() => _alarmOn = true);
      _notify('CRITICO');
      return;
    }
    if (next == 'MEDIO') {
      HapticFeedback.mediumImpact();
      _notify('MEDIO');
    }
    if (_alarmOn && (prev == 'CRITICO')) {
      setState(() => _alarmOn = false);
    }
  }

  Future<void> _notify(String nivel) async {
    final now = DateTime.now();
    final last = _notifyLock[nivel];
    final cooldown = Duration(seconds: nivel == 'CRITICO' ? 12 : 25);
    if (last != null && now.difference(last) < cooldown) return;
    _notifyLock[nivel] = now;
    try {
      await _api.testDrowsiness(
        nivel: nivel,
        descripcion: nivel == 'CRITICO'
            ? 'App conductor (ML Kit): somnolencia crítica, alarma activa.'
            : 'App conductor (ML Kit): signos moderados de somnolencia.',
      );
      if (!mounted) return;
      setState(() => _message = nivel == 'CRITICO' ? 'Alerta crítica enviada.' : 'Evento registrado.');
    } catch (_) {
      /* backend offline: la alarma local sigue */
    }
  }

  @override
  Widget build(BuildContext context) {
    final previewOk = _controller != null && _controller!.value.isInitialized;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Cámara IA', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          const Text(
            'Detección real en el celular (ML Kit, sin internet). Mire al frente para calibrar.',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 12),
          if (!_running && !_starting)
            FilledButton(
              onPressed: _start,
              child: const Text('Activar cámara'),
            ),
          if (_starting && !_running)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
          if (_running && previewOk)
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: AspectRatio(aspectRatio: 3 / 4, child: CameraPreview(_controller!)),
            ),
          const SizedBox(height: 8),
          Text('Estado: $_etapa', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
          if (_isCalibrating)
            Text('Calibración ${_calib.length}/$_calibFrames · mire al frente con los ojos abiertos',
                style: const TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.w700)),
          if (_running) ...[
            const SizedBox(height: 8),
            _LevelPill(level: _level, alarmOn: _alarmOn),
            const SizedBox(height: 8),
            Row(
              children: [
                _Stat(label: 'Apertura', value: _open != null ? '${(_open! * 100).round()}%' : '—'),
                const SizedBox(width: 8),
                _Stat(label: 'PERCLOS', value: '${(_perclos * 100).round()}%'),
                const SizedBox(width: 8),
                _Stat(label: 'Racha', value: '$_streak'),
              ],
            ),
            const SizedBox(height: 8),
            Text('diag · cuadros $_frames · rostro ${_face ? 'SÍ' : 'no'} · umbral ${_threshold != null ? _threshold!.toStringAsFixed(2) : '—'}',
                style: const TextStyle(color: AppColors.faint, fontSize: 10, fontFamily: 'monospace')),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _stop, child: const Text('Detener')),
          ],
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: AppColors.dangerBright, fontSize: 12)),
          ],
          if (_message != null) ...[
            const SizedBox(height: 8),
            Text(_message!, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
          ],
        ],
      ),
    );
  }
}

class _LevelPill extends StatelessWidget {
  const _LevelPill({required this.level, required this.alarmOn});
  final String level;
  final bool alarmOn;

  @override
  Widget build(BuildContext context) {
    final color = level == 'CRITICO'
        ? AppColors.dangerBright
        : level == 'MEDIO'
            ? Colors.orange
            : level == 'BAJO'
                ? Colors.yellow
                : AppColors.success;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color),
      ),
      child: Row(
        children: [
          Icon(alarmOn ? Icons.notification_important : Icons.remove_red_eye, color: color),
          const SizedBox(width: 10),
          Text(level == 'CRITICO' ? '¡SOMNOLENCIA CRÍTICA!' : level,
              style: TextStyle(color: color, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Text(label, style: const TextStyle(color: AppColors.faint, fontSize: 9)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
