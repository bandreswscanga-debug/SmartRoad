import 'package:flutter/material.dart';
import '../theme.dart';

class RiskSemaphore extends StatelessWidget {
  const RiskSemaphore({super.key, required this.riesgo, this.size = 18});

  final String riesgo;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = {
      'BAJO': AppColors.success,
      'MEDIO': AppColors.warning,
      'CRITICO': AppColors.dangerBright,
    };
    return Container(
      padding: EdgeInsets.symmetric(horizontal: size * 0.7, vertical: size * 0.55),
      decoration: BoxDecoration(
        color: AppColors.surface2,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: colors.entries.map((e) {
          final on = e.key == riesgo;
          return Container(
            width: size,
            height: size,
            margin: EdgeInsets.symmetric(horizontal: size * 0.28),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: on ? e.value : AppColors.surface3,
              boxShadow: on ? [BoxShadow(color: e.value, blurRadius: 10, spreadRadius: 1)] : null,
            ),
          );
        }).toList(),
      ),
    );
  }
}

class RiskChip extends StatelessWidget {
  const RiskChip({super.key, required this.riesgo});

  final String riesgo;

  @override
  Widget build(BuildContext context) {
    final color = riskColor(riesgo);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(shape: BoxShape.circle, color: color, boxShadow: [BoxShadow(color: color, blurRadius: 6)]),
          ),
          const SizedBox(width: 5),
          Text(riskLabel(riesgo), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.4)),
        ],
      ),
    );
  }
}