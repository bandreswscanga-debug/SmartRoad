import 'package:flutter/material.dart';

class AppColors {
  static const bg = Color(0xFF0A0E14);
  static const surface = Color(0xFF10141C);
  static const surface2 = Color(0xFF151B26);
  static const surface3 = Color(0xFF1C2431);
  static const border = Color(0xFF212B3A);
  static const text = Color(0xFFE8EDF4);
  static const muted = Color(0xFF93A0B4);
  static const faint = Color(0xFF5D6B80);
  static const danger = Color(0xFFEF2D3C);
  static const dangerBright = Color(0xFFFF4D5A);
  static const success = Color(0xFF2BD67B);
  static const warning = Color(0xFFF5B92E);
  static const info = Color(0xFF4AA8FF);
  static const purple = Color(0xFFA78BFA);
}

Color riskColor(String riesgo) {
  switch (riesgo) {
    case 'CRITICO':
      return AppColors.dangerBright;
    case 'MEDIO':
      return AppColors.warning;
    case 'BAJO':
    default:
      return AppColors.success;
  }
}

String riskLabel(String riesgo) {
  switch (riesgo) {
    case 'CRITICO':
      return 'Riesgo crítico';
    case 'MEDIO':
      return 'Riesgo medio';
    default:
      return 'Riesgo bajo';
  }
}

ThemeData buildDarkTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.danger,
      brightness: Brightness.dark,
      surface: AppColors.surface,
    ),
    textTheme: base.textTheme.apply(
      bodyColor: AppColors.text,
      displayColor: AppColors.text,
      fontFamilyFallback: const ['Roboto', 'sans-serif'],
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.text,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: const CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
        side: BorderSide(color: AppColors.border),
      ),
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.danger,
        foregroundColor: Colors.white,
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.text,
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface2,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
      ),
      hintStyle: const TextStyle(color: AppColors.faint),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) => Colors.white),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? AppColors.success : AppColors.surface3,
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.border),
  );
}