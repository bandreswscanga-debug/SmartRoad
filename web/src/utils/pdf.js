import { jsPDF } from 'jspdf';

async function loadLogo() {
  const response = await fetch('/smartroad-logo.png');
  if (!response.ok) throw new Error('No se pudo cargar el logo del informe');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo preparar el logo del informe'));
    reader.readAsDataURL(blob);
  });
}

function safe(value) {
  return String(value ?? '—');
}

function addField(doc, label, value, x, y, width = 85) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 125, 145);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(25, 32, 48);
  const lines = doc.splitTextToSize(safe(value), width);
  doc.text(lines, x, y + 5);
  return y + 5 + lines.length * 4;
}

function section(doc, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(198, 40, 56);
  doc.text(title, 18, y);
  doc.setDrawColor(225, 230, 237);
  doc.line(18, y + 2, 192, y + 2);
  return y + 10;
}

export async function downloadDriverPdf({ driver, email, vehicle, events, filename = 'smartroad-conductor.pdf' }) {
  const doc = new jsPDF();
  const logo = await loadLogo();
  doc.addImage(logo, 'PNG', 18, 12, 58, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(198, 40, 56);
  doc.text('Informe integral del conductor', 18, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 105, 125);
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 18, 52);

  let y = section(doc, 'Datos personales', 66);
  addField(doc, 'Nombre completo', driver.nombre, 18, y);
  addField(doc, 'Documento / RUT', driver.documento, 108, y);
  y += 18;
  addField(doc, 'Correo electrónico', email || driver.email, 18, y);
  addField(doc, 'Teléfono', driver.telefono, 108, y);
  y += 18;
  addField(doc, 'Carnet de conducir', driver.licencia, 18, y);
  addField(doc, 'Empresa', driver.empresa || 'Independiente', 108, y);
  y += 18;
  addField(doc, 'Tipo de sangre', driver.tipo_sangre, 18, y);
  addField(doc, 'Estado documental', driver.verificacion_estado || 'PENDIENTE', 108, y);

  y = section(doc, 'Vehículo registrado', y + 18);
  addField(doc, 'Placa', vehicle?.placa || driver.placa, 18, y);
  addField(doc, 'Tipo de vehículo', vehicle?.tipo || driver.tipo_vehiculo, 108, y);
  y += 18;
  addField(doc, 'Modelo', vehicle?.modelo || driver.modelo_vehiculo, 18, y);
  addField(doc, 'Código SmartRoad', vehicle?.codigo || 'Sin asignar', 108, y);

  y = section(doc, 'Resumen operativo', y + 28);
  addField(doc, 'Índice de fatiga', `${driver.fatiga_actual || 0}/100`, 18, y);
  addField(doc, 'Riesgo actual', driver.riesgo || 'BAJO', 108, y);
  y += 18;
  addField(doc, 'Jornada', `${driver.jornada_horas || 0} h`, 18, y);
  addField(doc, 'Kilómetros', `${driver.kilometros || 0} km`, 108, y);
  y += 18;
  addField(doc, 'Viajes', driver.viajes || 0, 18, y);
  addField(doc, 'Último descanso', driver.ultimo_descanso, 108, y);

  y = section(doc, 'Eventos de somnolencia y seguridad', y + 28);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(90, 105, 125);
  doc.text('FECHA', 18, y);
  doc.text('EVENTO', 52, y);
  doc.text('RIESGO', 91, y);
  doc.text('DESCRIPCIÓN', 120, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(25, 32, 48);
  for (const event of events?.length ? events : [{ timestamp: null, tipo: null, riesgo: null, descripcion: 'No hay eventos de somnolencia registrados.' }]) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    const description = doc.splitTextToSize(safe(event.descripcion), 70);
    doc.text(event.timestamp ? new Date(event.timestamp).toLocaleDateString('es-CO') : '—', 18, y);
    doc.text(safe(event.tipo).replaceAll('_', ' '), 52, y);
    doc.text(safe(event.riesgo), 91, y);
    doc.text(description, 120, y);
    y += Math.max(9, description.length * 4) + 3;
    doc.setDrawColor(235, 239, 244);
    doc.line(18, y - 2, 192, y - 2);
  }
  doc.save(filename);
}
