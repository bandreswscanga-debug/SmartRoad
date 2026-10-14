import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? defaultBase;

  static const defaultBase = 'http://127.0.0.1:4000';
  static const prefsBaseKey = 'srs_base';
  String baseUrl;
  String? token;

  static Future<String> savedBase() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = (prefs.getString(prefsBaseKey) ?? '').trim();
    return saved.isEmpty ? defaultBase : saved;
  }

  static Future<void> saveBase(String base) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(prefsBaseKey, base.trim());
  }

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  Future<void> _ensureToken() async {
    if ((token == null || token!.isEmpty) || _baseLoaded != true) {
      final prefs = await SharedPreferences.getInstance();
      token ??= prefs.getString('srs_token');
      if (token != null && token!.isEmpty) token = null;
      final saved = (prefs.getString(prefsBaseKey) ?? '').trim();
      if (saved.isNotEmpty) baseUrl = saved;
      _baseLoaded = true;
    }
  }

  bool? _baseLoaded;

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    await _ensureToken();
    final uri = _u(path);
    final headers = _headers;
    final encoded = body == null ? null : jsonEncode(body);
    final http.Response resp = await (() async {
      try {
        return await switch (method) {
          'GET' => http.get(uri, headers: headers).timeout(const Duration(seconds: 12)),
          'POST' => http.post(uri, headers: headers, body: encoded).timeout(const Duration(seconds: 12)),
          'PUT' => http.put(uri, headers: headers, body: encoded).timeout(const Duration(seconds: 12)),
          _ => throw ApiException('Método no soportado: $method'),
        };
      } catch (err) {
        throw ApiException('Sin conexión con $baseUrl [$err]. Revise red/USB y el campo Servidor.');
      }
    })();
    final data = resp.body.isEmpty ? <String, dynamic>{} : jsonDecode(resp.body) as Map<String, dynamic>;
    if (resp.statusCode == 401) {
      token = null;
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('srs_token');
    }
    if (resp.statusCode >= 400) {
      throw ApiException(data['error']?.toString() ?? 'Error ${resp.statusCode}');
    }
    return data;
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final data = await _send('POST', '/api/auth/login', {'email': email, 'password': password});
    token = data['token'] as String?;
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> profile() async {
    final data = await _send('GET', '/api/profile');
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
    final data = await _send('PUT', '/api/profile', body);
    return data as Map<String, dynamic>;
  }

  Future<void> changePassword({required String actual, required String nueva}) async {
    await _send('POST', '/api/auth/change-password', {'actual': actual, 'nueva': nueva});
  }

  Future<Map<String, dynamic>> summary() async {
    final data = await _send('GET', '/api/dashboard/summary');
    return data as Map<String, dynamic>;
  }

  Future<List<dynamic>> recentAlerts() async {
    final data = await _send('GET', '/api/dashboard/recent-alerts');
    return data['alerts'] as List<dynamic>? ?? [];
  }

  Future<List<dynamic>> activeAlerts() async {
    final data = await _send('GET', '/api/alerts/active');
    return data['alerts'] as List<dynamic>? ?? [];
  }

  Future<void> testDrowsiness({required String nivel, String? descripcion}) async {
    await _send('POST', '/api/telemetry/drowsiness-test', {
      'nivel': nivel,
      if (descripcion != null) 'descripcion': descripcion,
    });
  }

  Future<List<dynamic>> vehicles() async {
    final data = await _send('GET', '/api/vehicles');
    return data['vehicles'] as List<dynamic>? ?? [];
  }

  Future<List<dynamic>> events() async {
    final data = await _send('GET', '/api/events');
    return data['events'] as List<dynamic>? ?? [];
  }

  Future<List<dynamic>> drivers() async {
    final data = await _send('GET', '/api/drivers');
    return data['drivers'] as List<dynamic>? ?? [];
  }

  Future<Map<String, dynamic>> config() async {
    final data = await _send('GET', '/api/config');
    return data['config'] as Map<String, dynamic>? ?? {};
  }

  Future<void> updateConfig(Map<String, dynamic> body) async {
    await _send('PUT', '/api/config', body);
  }

  Future<void> reportSos({required String codigo, required double lat, required double lng}) async {
    await _send('POST', '/api/telemetry/event', {
      'codigo': codigo,
      'tipo': 'SOS',
      'riesgo': 'CRITICO',
      'lat': lat,
      'lng': lng,
      'velocidad': 0,
      'descripcion': 'SOS manual enviado desde la app móvil del conductor.',
    });
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}