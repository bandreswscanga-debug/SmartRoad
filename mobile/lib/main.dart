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

  @override
  void initState() {
    super.initState();
    hasSession = widget.hasSession;
  }

  void onSessionChanged(bool ok) => setState(() => hasSession = ok);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartRoad S.O.S',
      debugShowCheckedModeBanner: false,
      theme: buildDarkTheme(),
      home: hasSession ? HomeScreen(onLogout: () => onSessionChanged(false)) : LoginScreen(onLogin: () => onSessionChanged(true)),
    );
  }
}