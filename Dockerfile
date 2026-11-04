# Etapa 1: construir el frontend React
FROM node:22-alpine AS web-build

WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# Etapa 2: preparar el backend
FROM node:22-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# El servidor Express sirve el frontend compilado
COPY --from=web-build /app/web/dist /app/web/dist

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Verificar que la API responda
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
