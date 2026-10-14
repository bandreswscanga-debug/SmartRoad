/// Lógica de somnolencia por apertura ocular (probabilidad 0..1 de ML Kit).
/// Espejo en Dart del detector web: calibración personal, ventana PERCLOS,
/// histéresis y permanencia por rachas.
class EyeSample {
  EyeSample(this.open, this.faceFound);
  final double? open;
  final bool faceFound;
}

class EyeLevel {
  EyeLevel({required this.level, required this.open, required this.perclos, required this.streak, required this.threshold, required this.baseline});
  final String level;
  final double? open;
  final double perclos;
  final int streak;
  final double threshold;
  final double baseline;
}

class EyeDrowsinessDetector {
  EyeDrowsinessDetector({
    this.windowSize = 90,
    this.closeMult = 0.62,
    this.criticoPerclos = 0.6,
    this.medioPerclos = 0.35,
    this.bajoPerclos = 0.12,
    this.criticoStreak = 90,
    this.medioStreak = 28,
  });

  final int windowSize;
  final double closeMult;
  final double criticoPerclos;
  final double medioPerclos;
  final double bajoPerclos;
  final int criticoStreak;
  final int medioStreak;

  double baseline = 0.9;
  final List<bool> _window = [];
  int streak = 0;
  String _level = 'NORMAL';

  static double median(List<double> list) {
    if (list.isEmpty) return 0.9;
    final s = [...list]..sort();
    final m = s.length ~/ 2;
    return s.length.isOdd ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  void train(List<double> opens) {
    if (opens.isEmpty) return;
    baseline = median(opens).clamp(0.3, 1.0);
  }

  double get threshold => (baseline * closeMult).clamp(0.15, 0.8);

  EyeLevel push(double? open) {
    final closed = open != null && open < threshold;
    streak = closed ? streak + 1 : 0;
    if (_window.length >= windowSize) _window.removeAt(0);
    _window.add(closed);
    final closedCount = _window.where((c) => c).length;
    final perclos = _window.isEmpty ? 0.0 : closedCount / _window.length;
    var level = 'NORMAL';
    if (perclos >= criticoPerclos || streak >= criticoStreak) {
      level = 'CRITICO';
    } else if (perclos >= medioPerclos || streak >= medioStreak) {
      level = 'MEDIO';
    } else if (perclos >= bajoPerclos) {
      level = 'BAJO';
    }
    // Histéresis: no bajar de golpe desde CRITICO/MEDIO sin racha limpia.
    if ((_level == 'CRITICO' && (level == 'MEDIO' || level == 'BAJO')) ||
        (_level == 'MEDIO' && level == 'BAJO' && streak > 0)) {
      level = _level;
    }
    _level = level;
    return EyeLevel(level: level, open: open, perclos: perclos, streak: streak, threshold: threshold, baseline: baseline);
  }

  void reset() {
    _window.clear();
    streak = 0;
    _level = 'NORMAL';
  }
}
