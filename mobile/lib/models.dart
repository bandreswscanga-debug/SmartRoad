class User {
  final int id;
  final String nombre;
  final String email;
  final String rol;

  const User({required this.id, required this.nombre, required this.email, required this.rol});

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as int,
        nombre: json['nombre'] as String? ?? 'Operador',
        email: json['email'] as String? ?? '',
        rol: json['rol'] as String? ?? 'conductor',
      );
}

class Vehicle {
  final int id;
  final String codigo;
  final String nombre;
  final String placa;
  final String tipo;
  final String? conductor;
  final String ruta;
  final String estado;
  final String riesgo;
  final double lat;
  final double lng;
  final int velocidad;
  final double bateria;

  const Vehicle({
    required this.id,
    required this.codigo,
    required this.nombre,
    required this.placa,
    required this.tipo,
    this.conductor,
    required this.ruta,
    required this.estado,
    required this.riesgo,
    required this.lat,
    required this.lng,
    required this.velocidad,
    required this.bateria,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'] as int,
        codigo: json['codigo'] as String? ?? '',
        nombre: json['nombre'] as String? ?? '',
        placa: json['placa'] as String? ?? '',
        tipo: json['tipo'] as String? ?? '',
        conductor: json['conductor_nombre'] as String?,
        ruta: json['ruta'] as String? ?? '',
        estado: json['estado'] as String? ?? 'DETENIDO',
        riesgo: json['riesgo'] as String? ?? 'BAJO',
        lat: (json['lat'] as num?)?.toDouble() ?? 0,
        lng: (json['lng'] as num?)?.toDouble() ?? 0,
        velocidad: (json['velocidad'] as num?)?.toInt() ?? 0,
        bateria: (json['bateria'] as num?)?.toDouble() ?? 0,
      );

  bool get moving => estado == 'MOVIENDO';
}

class Evento {
  final int id;
  final String tipo;
  final String riesgo;
  final String vehiculo;
  final String conductor;
  final String descripcion;
  final DateTime timestamp;
  final int respuestaMs;

  const Evento({
    required this.id,
    required this.tipo,
    required this.riesgo,
    required this.vehiculo,
    required this.conductor,
    required this.descripcion,
    required this.timestamp,
    required this.respuestaMs,
  });

  factory Evento.fromJson(Map<String, dynamic> json) => Evento(
        id: json['id'] as int,
        tipo: json['tipo'] as String? ?? 'EVENTO',
        riesgo: json['riesgo'] as String? ?? 'MEDIO',
        vehiculo: json['vehiculo_codigo'] as String? ?? '',
        conductor: json['conductor_nombre'] as String? ?? '',
        descripcion: json['descripcion'] as String? ?? '',
        timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
        respuestaMs: (json['respuesta_ms'] as num?)?.toInt() ?? 0,
      );
}

class AppConfig {
  final bool alertaSonora;
  final bool alertaVibracion;
  final bool alertaVisual;
  final String numeroEmergencia;
  final int sensibilidad;
  final int umbralAmarillo;
  final int umbralRojo;

  const AppConfig({
    required this.alertaSonora,
    required this.alertaVibracion,
    required this.alertaVisual,
    required this.numeroEmergencia,
    required this.sensibilidad,
    required this.umbralAmarillo,
    required this.umbralRojo,
  });
}