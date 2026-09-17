import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:smartroad_sos/main.dart';

void main() {
  testWidgets('Sin sesión muestra la pantalla de login', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const SmartRoadApp(hasSession: false));
    await tester.pumpAndSettle();

    expect(find.text('Ingresar al panel'), findsOneWidget);
    expect(find.text('Acceso admin: bandreswscanga@hgmail.com'), findsOneWidget);
  });
}