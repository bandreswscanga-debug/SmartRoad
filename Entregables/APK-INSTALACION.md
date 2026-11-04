# APK final — SmartRoad S.O.S (rol conductor)

- Archivo: `mobile/build/app/outputs/flutter-apk/app-release.apk` (50.9 MB, release)
- SHA-256: `66972dbfd24805854037502a68bbee5707b5fa12f2e67da45d9a43d4e7de0392`
- No se commitea al repo (`*.apk` está en `.gitignore`); súbalo a Drive /
  GitHub Releases / Firebase App Distribution y ponga el link en
  `backend/.env` como `APK_DOWNLOAD_URL=` para el correo de bienvenida.

## Importante: IP del servidor

La app apunta por defecto a `http://192.168.137.163:4000`
(`mobile/lib/services/api.dart`, `defaultBase`). El teléfono y el servidor
deben estar en la misma red, o cambie esa URL y reconstruya:

```bash
cd mobile
flutter build apk --release
```

## Flujo verificado (backend 16/16 tests)

1. Admin registra al conductor en `/conductores` (clave inicial = cédula).
2. Conductor instala el APK e ingresa con correo + cédula.
3. En el primer ingreso cambia su clave (Perfil → Cambiar contraseña).
4. Solo ve sus datos; IDs ajenos devuelven 403 (probado en
   `backend/test/flujo-conductor.test.js`).
