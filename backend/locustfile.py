"""Prueba de carga SmartRoad S.O.S. con Locust.

Uso (desde ~/SmartRoadSOS/backend, con el venv activo):
    locust -f locustfile.py --host http://localhost:4000
    -> panel web en http://localhost:8089

Fase 1 (SLA):   50 usuarios,  subida 2/seg
Fase 2 (estres): 500 usuarios, subida 20/seg

IMPORTANTE: subir los rate-limits antes de la prueba real, o todo dara 429:
    RATE_LIMIT_API=100000 RATE_LIMIT_TELEMETRY=100000 node src/server.js
"""

import random

from locust import HttpUser, between, task

CODIGOS = ["TRK-001", "TRK-002", "VAN-007", "TRK-004"]
TIPOS_EVENTO = ["MICRO_SUENO", "DISTRACCION", "FATIGA_PROLONGADA"]
RIESGOS = ["BAJO", "BAJO", "MEDIO", "MEDIO", "CRITICO"]

# Clave de dispositivo (misma que TELEMETRY_API_KEY en backend/.env).
DEVICE_KEY = "d7b4a9dad1cff822691c6cf1468197f7e3fb8f281408e876"


class UsuarioNavegador(HttpUser):
    """Trafico ligero: solo peticiones GET publicas."""

    weight = 3
    wait_time = between(1, 3)

    @task
    def health(self):
        self.client.get("/api/health", name="GET /api/health")


class UsuarioComprador(HttpUser):
    """Trafico pesado: POST que consultan y escriben en MySQL
    (telemetria: SELECT + upsert + UPDATE; eventos: INSERT + evaluacion de alerta)."""

    weight = 1
    wait_time = between(0.5, 1.5)

    def on_start(self):
        self.headers = {"x-device-key": DEVICE_KEY}
        self.codigo = random.choice(CODIGOS)

    @task(3)
    def heartbeat(self):
        self.client.post(
            "/api/telemetry/heartbeat",
            name="POST /telemetry/heartbeat",
            headers=self.headers,
            json={
                "codigo": self.codigo,
                "bateria": random.randint(20, 100),
                "senal_gps": random.randint(5, 30),
                "fps": random.randint(8, 30),
                "latencia_ms": random.randint(20, 200),
            },
        )

    @task(1)
    def evento_sensor(self):
        self.client.post(
            "/api/telemetry/event",
            name="POST /telemetry/event",
            headers=self.headers,
            json={
                "codigo": self.codigo,
                "tipo": random.choice(TIPOS_EVENTO),
                "riesgo": random.choice(RIESGOS),
                "lat": round(4.66 + random.random() * 0.06, 6),
                "lng": round(-74.13 + random.random() * 0.07, 6),
                "velocidad": random.randint(0, 110),
                "descripcion": "Evento de carga sintetica (Locust)",
            },
        )
