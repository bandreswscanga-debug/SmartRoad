import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('srs_token');
  runApp(SmartRoadApp(hasSession: token != null && token.isNotEmpty));
}

class SmartRoadApp extends StatefulWidget {
  const SmartRoadApp({super.key, required this.hasSession});

  final bool hasSession;

  @override
  State<SmartRoadApp> createState() => _SmartRoadAppState();
}

class _SmartRoadAppState extends State<SmartRoadApp> {
  late bool hasSession;
  bool isAdmin = false;

  @override
  void initState() {
    super.initState();
    hasSession = widget.hasSession;
    _loadRole();
  }

  Future<void> _loadRole() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final raw = prefs.getString('srs_user');
      final user = raw == null ? null : jsonDecode(raw) as Map<String, dynamic>?;
      if (!mounted) return;
      setState(() => isAdmin = user?['rol'] == 'admin');
    } catch (_) {
      /* sesión sin rol: se trata como conductor */
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('srs_token');
    await prefs.remove('srs_user');
    if (!mounted) return;
    setState(() {
      hasSession = false;
      isAdmin = false;
    });
  }

  void onLogin() {
    setState(() => hasSession = true);
    _loadRole();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartRoad S.O.S',
      debugShowCheckedModeBanner: false,
      theme: buildDarkTheme(),
      home: hasSession
          ? HomeScreen(isAdmin: isAdmin, onLogout: _logout)
          : LoginScreen(onLogin: onLogin),
    );
  }
}
