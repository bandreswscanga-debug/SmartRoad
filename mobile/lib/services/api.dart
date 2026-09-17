import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  ApiClient({this.baseUrl = defaultBase});

  static const defaultBase = 'http://192.168.137.163:4000';
  final String baseUrl;
  String? token;

  Uri _u(String path) => Uri.parse('$baseUrl$path');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  Future<void> _ensureToken() async {
    if (token != null && token!.isNotEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('srs_token');
  }

  Future<dynamic> _send(String method, String path, [Object? body]) async {
    await _ensureToken();
    final uri = _u(path);
    final headers = _headers;
    final encoded = body == null ? null : jsonEncode(body);
    final http.Response resp = switch (method) {
      'GET' => await http.get(uri, headers: headers).timeout(const Duration(seconds: 12)),
      'POST' => await http.post(uri, headers: headers, body: encoded).timeout(const Duration(seconds: 12)),
      'PUT' => await http.put(uri, headers: headers, body: encoded).timeout(const Duration(seconds: 12)),
      _ => throw ApiException('Método no soportado: $method'),
    };
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

  Future<List<dynamic>> vehicles() async {
    final data = await _send('GET', '/api/vehicles');
    return data['vehicles'] as List<dynamic>? ?? [];
  }

  Future<List<dynamic>> events() async {
    final data = await _send('GET', '/api/events');
    return data['events'] as List<dynamic>? ?? [];
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