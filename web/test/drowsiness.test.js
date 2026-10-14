/**
 * Pruebas de la lógica de detección de somnolencia (sin navegador).
 * Ejecutar con:  node --test web/test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDrowsinessDetector,
  earFor,
  mouthOpenFor,
  headPoseFor,
  median,
  EYE_LANDMARKS
} from '../src/utils/drowsiness.js';

const ABRE = 0.3;
const CERRADO = 0.12;

function landmarks() {
  return Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
}

function pose(pitch) {
  return { roll: 0, yaw: 0, pitch, faceWidth: 0.3, faceHeight: 0.4 };
}

test('earFor devuelve null si faltan landmarks o la geometría es inválida', () => {
  assert.equal(earFor([], 'left'), null);
  assert.equal(earFor(landmarks(), 'izquierda'), null);
  const plano = landmarks();
  for (const i of EYE_LANDMARKS.left) plano[i] = { x: 0.5, y: 0.5, z: 0 };
  assert.equal(earFor(plano, 'left'), null, 'horizontal = 0 debe devolver null');
});

test('mouthOpenFor y headPoseFor rechazan geometría degenerada', () => {
  const lm = landmarks();
  assert.equal(mouthOpenFor(lm), null, 'boca sin ancho no debe dividir por cero');
  assert.equal(headPoseFor(lm), null, 'cara de tamaño cero no debe producir pose');
});

test('median ordena y promedia pares', () => {
  assert.equal(median([]), 0);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test('la calibración ignora parpadeos gracias a la mediana', () => {
  const detector = createDrowsinessDetector();
  const ears = [...Array(30).fill(ABRE), ...Array(3).fill(CERRADO)];
  detector.train(ears, [pose(20)], [0.08, 0.09, 0.08]);
  assert.ok(Math.abs(detector.openEar - ABRE) < 1e-6, 'el umbral personal no debe bajar por parpadeos');
});

test('PERCLOS en ventana temporal: mismo resultado a distinta tasa de cuadros', () => {
  const rapido = createDrowsinessDetector();
  const lento = createDrowsinessDetector();
  rapido.train([ABRE], [pose(20)], [0.08]);
  lento.train([ABRE], [pose(20)], [0.08]);

  // 3 s de ventana: 10 quadros por segundo y 30 por segundo.
  for (let i = 0; i < 30; i += 1) rapido.push(i % 2 ? CERRADO : ABRE, null, null, i * 100);
  for (let i = 0; i < 90; i += 1) lento.push(i % 2 ? CERRADO : ABRE, null, null, i * 33.3);

  const a = rapido.push(ABRE, null, null, 3000);
  const b = lento.push(ABRE, null, null, 3000);
  assert.ok(Math.abs(a.perclos - b.perclos) < 0.1, `PERCLOS debe ser estable (${a.perclos} vs ${b.perclos})`);
});

test('ojos cerrados sostenidos ~1.5 s escalan a CRITICO', () => {
  const d = createDrowsinessDetector();
  d.train([ABRE], [pose(20)], [0.08]);
  let res;
  for (let t = 0; t <= 2000; t += 50) res = d.push(CERRADO, pose(20), 0.08, t);
  assert.equal(res.level, 'CRITICO');
  assert.ok(res.cierreMs >= 1500, `cierreMs debe superar 1500 (${res.cierreMs})`);
});

test('una alerta crítica no baja de nivel por un cuadro con los ojos abiertos', () => {
  const d = createDrowsinessDetector();
  d.train([ABRE], [pose(20)], [0.08]);
  let res;
  for (let t = 0; t <= 2000; t += 50) res = d.push(CERRADO, pose(20), 0.08, t);
  assert.equal(res.level, 'CRITICO');
  res = d.push(ABRE, pose(20), 0.08, 2050);
  assert.equal(res.level, 'CRITICO', 'la histéresis debe sostener el nivel crítico');
});

test('cabeceo sostenido y recuperación generan un evento de cabeceo', () => {
  const d = createDrowsinessDetector();
  d.train([ABRE], [pose(20)], [0.08]);
  let res;
  for (let t = 0; t <= 2000; t += 50) res = d.push(ABRE, pose(34), 0.08, t);
  assert.equal(res.level, 'CRITICO', 'cabeceo prolongado = crítico');
  res = d.push(ABRE, pose(20), 0.08, 2050);
  assert.equal(res.nodEvent, true, 'al volver la cabeza se registra el cabeceo');
  assert.equal(res.nodCount, 1);
});

test('bostezo sostenido escala a MEDIO y no con un pico aislado', () => {
  const d = createDrowsinessDetector();
  d.train([ABRE], [pose(20)], [0.08]);
  let res;
  for (let t = 0; t <= 300; t += 50) res = d.push(ABRE, pose(20), 0.9, t);
  assert.notEqual(res.level, 'MEDIO', 'un pico aislado no debe escalar');
  for (let t = 350; t <= 1200; t += 50) res = d.push(ABRE, pose(20), 0.9, t);
  assert.equal(res.level, 'MEDIO', 'bostezo sostenido sí escala');
});

test('perder el rostro invalida las señales y vuelve a NORMAL', () => {
  const d = createDrowsinessDetector();
  d.train([ABRE], [pose(20)], [0.08]);
  let res;
  for (let t = 0; t <= 2000; t += 50) res = d.push(CERRADO, pose(20), 0.08, t);
  assert.equal(res.level, 'CRITICO');
  res = d.push(null, null, null, 2600);
  assert.equal(res.face, false);
  assert.equal(res.level, 'NORMAL', 'sin rostro no se sostiene la alarma');
  assert.equal(res.perclos, 0);
});

test('el salto de tiempo (pestaña en segundo plano) no cuenta como cierre', () => {
  const d = createDrowsinessDetector();
  d.train([ABRE], [pose(20)], [0.08]);
  for (let t = 0; t <= 500; t += 50) d.push(ABRE, null, null, t);
  const res = d.push(CERRADO, null, null, 60000);
  assert.equal(res.perclos, 0, 'la ventana se reinicia tras una pausa larga');
});

test('los valores no numéricos se descartan sin romper la detección', () => {
  const d = createDrowsinessDetector();
  d.train([ABRE], [pose(20)], [0.08]);
  for (const malo of [NaN, undefined, null, 0, -1, '0.3']) {
    const res = d.push(malo, null, null, 1000);
    assert.equal(res.face, false);
    assert.equal(res.level, 'NORMAL');
  }
});

test('configure permite ajustar la sensibilidad sin recrear el detector', () => {
  const d = createDrowsinessDetector();
  d.configure({ criticoCierreMs: 400 });
  d.train([ABRE], [pose(20)], [0.08]);
  let res;
  for (let t = 0; t <= 900; t += 50) res = d.push(CERRADO, pose(20), 0.08, t);
  assert.equal(res.level, 'CRITICO', 'con umbral ajustado escala antes');
});
