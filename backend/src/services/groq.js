// Cliente de IA con Groq, SOLO en el backend.
// La key (GROQ_API_KEY) nunca sale del servidor: ni frontend ni app la conocen.
// API compatible con formato OpenAI: POST {base}/chat/completions.
// Modelos (ver https://console.groq.com/docs/models, configurables por env):
// - Texto: llama-3.3-70b-versatile (defecto)
// - Visión (imágenes de cámara): meta-llama/llama-4-scout-17b-16e-instruct
const BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

function configured() {
  return Boolean(process.env.GROQ_API_KEY);
}

function textModel() {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
}

function visionModel() {
  return process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
}

function maxRetries() {
  const n = Number(process.env.GROQ_MAX_RETRIES);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 2;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chat(messages, { model, maxTokens = 500, temperature = 0.3 } = {}) {
  if (!configured()) {
    return { ok: false, status: 503, error: 'IA no configurada. Defina GROQ_API_KEY en backend/.env (console.groq.com).' };
  }
  const key = process.env.GROQ_API_KEY;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    let res;
    try {
      res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || textModel(),
          messages,
          max_tokens: maxTokens,
          temperature
        })
      });
    } catch (err) {
      if (attempt > maxRetries() + 1) {
        return { ok: false, status: 502, error: `Sin conexión con Groq: ${String(err.message || err).slice(0, 160)}` };
      }
      await sleep(800 * attempt);
      continue;
    }
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const content = data.choices && data.choices[0] && data.choices[0].message
        ? String(data.choices[0].message.content || '').trim()
        : '';
      return { ok: true, content, model: data.model || model || textModel() };
    }
    // Límite de peticiones o error temporal: reintentos con espera.
    if ((res.status === 429 || res.status >= 500) && attempt <= maxRetries() + 1) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1200 * attempt);
      continue;
    }
    const body = await res.text().catch(() => '');
    if (res.status === 429) {
      return { ok: false, status: 429, error: 'Límite de peticiones de Groq alcanzado. Espere un momento e intente de nuevo.' };
    }
    return { ok: false, status: res.status, error: `Groq ${res.status}: ${body.slice(0, 200)}` };
  }
}

// Analiza un evento de somnolencia/fatiga y devuelve nivel + recomendación.
async function analyzeEvent({ evento, vehiculo, conductor }) {
  const ctx = [
    `Tipo: ${evento?.tipo || '—'}`,
    `Riesgo reportado: ${evento?.riesgo || '—'}`,
    `Vehículo: ${vehiculo?.codigo || '—'} (${vehiculo?.placa || '—'})`,
    `Conductor: ${conductor?.nombre || vehiculo?.conductor_nombre || '—'}`,
    `Velocidad: ${evento?.velocidad ?? vehiculo?.velocidad ?? '—'} km/h`,
    `Descripción: ${evento?.descripcion || '—'}`
  ].join('\n');
  return chat([
    {
      role: 'system',
      content: 'Eres el analista de fatiga de SmartRoad S.O.S. Respondes en español, breve y operativo: nivel (BAJO/MEDIO/CRITICO), causa probable y acción inmediata (seguir, pausa sugerida o SOS). Máximo 120 palabras.'
    },
    { role: 'user', content: `Analiza este reporte de conducción:\n${ctx}` }
  ]);
}

// Analiza una imagen de la cámara (dataURL base64 o URL http).
async function analyzeImage({ image, prompt }) {
  if (!image || typeof image !== 'string') {
    return { ok: false, status: 400, error: 'Imagen requerida (dataURL base64 o URL).' };
  }
  const isUrl = /^https?:\/\//i.test(image);
  const imageContent = isUrl
    ? { type: 'image_url', image_url: { url: image } }
    : { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } };
  return chat(
    [
      {
        role: 'system',
        content: 'Eres el analista de somnolencia de SmartRoad S.O.S. Observa la imagen del conductor y responde en español: ojos (abiertos/cerrados), señales de fatiga y nivel BAJO/MEDIO/CRITICO con una acción inmediata. Máximo 120 palabras.'
      },
      { role: 'user', content: [{ type: 'text', text: prompt || '¿El conductor muestra somnolencia?' }, imageContent] }
    ],
    { model: visionModel(), maxTokens: 400 }
  );
}

module.exports = { chat, analyzeEvent, analyzeImage, configured, textModel, visionModel };
