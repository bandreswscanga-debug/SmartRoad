import 'package:flutter/material.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models.dart';
import '../services/api.dart';
import '../theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiClient();
  DriverProfile? _driver;
  List<Evento> _events = [];
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await Future.wait([_api.driverProfile(), _api.driverEvents()]);
      if (!mounted) return;
      setState(() {
        _driver = DriverProfile.fromJson(data[0] as Map<String, dynamic>);
        _events = (data[1] as List<dynamic>).whereType<Map<String, dynamic>>().map(Evento.fromJson).toList();
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (mounted) setState(() { _loading = false; _error = error.toString(); });
    }
  }

  Future<void> _createTestEvent() async {
    setState(() => _busy = true);
    try {
      await _api.testDriverDrowsiness(nivel: 'MEDIO', descripcion: 'Prueba voluntaria realizada desde la aplicación móvil.');
      await _load();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _exportPdf() async {
    final driver = _driver;
    if (driver == null) return;
    final document = pw.Document();
    document.addPage(pw.MultiPage(
      build: (_) => [
        pw.Header(level: 0, text: 'SmartRoad S.O.S'),
        pw.Text('Informe del conductor', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 12),
        pw.TableHelper.fromTextArray(data: [
          ['Dato', 'Información'],
          ['Nombre', driver.nombre],
          ['Documento', driver.documento],
          ['Licencia', driver.licencia],
          ['Teléfono', driver.telefono],
          ['Correo', driver.email],
          ['Empresa', driver.empresa.isEmpty ? 'Independiente' : driver.empresa],
          ['Tipo de sangre', driver.tipoSangre],
          ['Vehículo', '${driver.tipoVehiculo} · ${driver.placa}'],
          ['Verificación', driver.verificacionEstado],
        ]),
        pw.SizedBox(height: 18),
        pw.Text('Eventos personales de somnolencia (${_events.length})', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
        if (_events.isEmpty) pw.Padding(padding: const pw.EdgeInsets.only(top: 8), child: pw.Text('No hay eventos registrados.')),
        for (final event in _events) pw.Padding(
          padding: const pw.EdgeInsets.only(top: 6),
          child: pw.Text('${event.timestamp.toLocal()} · ${event.tipo} · ${event.riesgo} · ${event.descripcion}'),
        ),
      ],
    ));
    await Printing.sharePdf(bytes: await document.save(), filename: 'smartroad-${driver.documento}.pdf');
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.danger));
    if (_error != null && _driver == null) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(_error!), const SizedBox(height: 12), OutlinedButton(onPressed: _load, child: const Text('Reintentar'))]));
    }
    final driver = _driver!;
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(children: [const Expanded(child: Text('Mi perfil', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900))), IconButton(onPressed: widget.onLogout, icon: const Icon(Icons.logout))]),
            const Text('Información personal y vehículo registrado', style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 16),
            _card('Estado documental', driver.verificacionEstado, Icons.verified_user, riskColor(driver.verificacionEstado == 'VERIFICADO' ? 'BAJO' : 'MEDIO')),
            const SizedBox(height: 10),
            _dataCard('Datos personales', {'Nombre': driver.nombre, 'Documento': driver.documento, 'Licencia': driver.licencia, 'Teléfono': driver.telefono, 'Correo': driver.email, 'Empresa': driver.empresa.isEmpty ? 'Independiente' : driver.empresa, 'Tipo de sangre': driver.tipoSangre}),
            const SizedBox(height: 10),
            _dataCard('Vehículo', {'Placa': driver.placa, 'Tipo': driver.tipoVehiculo, 'Modelo': '${driver.modeloVehiculo ?? '—'}'}),
            const SizedBox(height: 16),
            OutlinedButton.icon(onPressed: _busy ? null : _exportPdf, icon: const Icon(Icons.picture_as_pdf), label: const Text('Generar informe PDF')),
            const SizedBox(height: 8),
            OutlinedButton.icon(onPressed: _busy ? null : _createTestEvent, icon: const Icon(Icons.science), label: Text(_busy ? 'Guardando…' : 'Registrar prueba de somnolencia')),
          ],
        ),
      ),
    );
  }

  Widget _card(String title, String value, IconData icon, Color color) => Card(child: ListTile(leading: Icon(icon, color: color), title: Text(title), subtitle: Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold))));

  Widget _dataCard(String title, Map<String, String> values) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 10), ...values.entries.map((entry) => Padding(padding: const EdgeInsets.only(bottom: 7), child: Row(children: [SizedBox(width: 110, child: Text(entry.key, style: const TextStyle(color: AppColors.faint, fontSize: 12))), Expanded(child: Text(entry.value, style: const TextStyle(fontWeight: FontWeight.w700)))])))]),
        ),
      );
}
