# OperadorPro Flota — Arquitectura

Este documento describe la arquitectura del **módulo de Gestión de Flota**
(cumplimiento documental, viáticos, inspección pre-viaje NOM-068 y
cobranza de fletes) añadido sobre la base existente de OperadorPro
(capacitación y certificación).

## 1. Decisión de stack y por qué

OperadorPro ya opera con **Jamstack serverless**: HTML/CSS/JS sin build,
Supabase (Postgres + Auth + Storage) y Netlify Functions. Para el tamaño de
cliente objetivo (1–30 camiones) un microservicio en Kubernetes es
sobre-ingeniería: agrega latencia operativa, costo y superficie de fallo sin
beneficio real a este volumen de tráfico. Se mantiene el mismo stack y se le
aplican los principios de **Clean Architecture** dentro de cada función,
en vez de forzar un límite de proceso que Netlify Functions no necesita.

Esto no es una excusa para código plano: cada función serverless se organiza
en capas explícitas (ver §2) y toda regla de negocio vive en módulos de
dominio puros, testeables sin red ni base de datos.

## 2. Capas (Clean Architecture aplicada a funciones serverless)

```
netlify/functions/
├── _lib/                     ← Infraestructura y adaptadores compartidos
│   ├── supabaseAdmin.js      Adaptador: cliente Postgres (service role)
│   ├── auth.js               Adaptador: verificación JWT + RBAC (capa de interfaz)
│   ├── rateLimit.js          Adaptador: limitador de tasa (Upstash Redis / memoria)
│   ├── validate.js           Capa de interfaz: validación de entrada (zod)
│   ├── logger.js             Adaptador: logging estructurado JSON
│   ├── errors.js             Dominio: errores tipados de negocio
│   ├── response.js           Capa de interfaz: sobres HTTP + cabeceras
│   └── notify.js             Adaptador: envío WhatsApp/Email (proveedor plegable)
├── domain/                   ← Reglas de negocio puras (sin I/O)
│   ├── compliance.js         Cálculo de semáforo de vencimiento, folio QR
│   ├── expenses.js           Conciliación de gasto vs. presupuesto de viaje
│   ├── inspections.js        Validación de checklist NOM-068
│   └── invoicing.js          Cálculo de vigencia/mora de facturas
└── fleet-*.js                ← Casos de uso (orquestan dominio + adaptadores)
```

Regla de dependencia: `fleet-*.js` (casos de uso) dependen de `domain/*`
(reglas) y de `_lib/*` (adaptadores), nunca al revés. `domain/*` no importa
Supabase ni Netlify: son funciones puras, unit-testeables con Node nativo.

Cada handler sigue el mismo pipeline (`_lib/handler.js`):

```
request → CORS/security headers → rate limit → auth (JWT) → RBAC (rol) →
validación de payload (zod) → caso de uso (dominio + repos) →
respuesta estandarizada → logging estructurado (con requestId)
```

## 3. Multi-tenencia y RBAC

Una empresa transportista (`companies`) tiene múltiples miembros
(`company_members`) con un rol: `owner`, `admin`, `driver`. Todo dato de
negocio cuelga de `company_id`. La autorización se aplica en **dos capas
independientes** (defensa en profundidad):

1. **RLS en Postgres** (obligatoria, no evitable aunque el backend tenga un
   bug): cada política valida `auth.uid()` contra `company_members`.
2. **RBAC explícito en la función** (`requireRole(['owner','admin'])`):
   antes de tocar la base, para devolver 403 claros y evitar quemar cuota de
   rate limit en verificaciones que la BD rechazaría de todos modos.

El **chofer** nunca usa el panel web: interactúa solo vía enlaces
firmados de un solo uso (WhatsApp) o un formulario móvil público con token
de sesión corto, nunca con credenciales de dueño/admin.

## 4. Modelo de datos (resumen — ver `supabase/schema_fleet.sql`)

- `companies`, `company_members` — tenencia y RBAC.
- `vehicles`, `drivers` — catálogo de unidades y operadores.
- `compliance_documents`, `compliance_alerts` — Módulo 1 (licencias, pólizas,
  tarjeta de circulación, verificación). Semáforo vigente/por-vencer/vencido
  calculado, nunca almacenado como texto libre.
- `trips`, `expenses` — Módulo 2 (viáticos): presupuesto por viaje vs. gasto
  real capturado por foto + OCR.
- `inspections`, `inspection_photos`, `inspection_checklist_items` — Módulo 3
  (inspección pre-viaje NOM-068) con evidencia geolocalizada.
- `clients`, `freight_invoices`, `payment_reminders` — Módulo 4 (cobranza de
  fletes).

Normalización: 3FN. Ningún campo derivado (estatus, saldo) se persiste sin
un mecanismo de recomputo; se prefieren vistas (`compliance_status_v`,
`invoice_status_v`) sobre columnas denormalizadas para evitar
inconsistencias.

Restricciones de integridad aplicadas en DDL (no solo en la app):
`FOREIGN KEY` con `ON DELETE CASCADE`/`RESTRICT` según el caso, `NOT NULL`
en todo campo obligatorio de negocio, `UNIQUE` compuestos (p. ej. placa por
empresa, folio de factura por empresa), y `CHECK` para dominios cerrados
(roles, tipos de documento, montos no negativos) — ver §6.

## 5. Consistencia transaccional (ACID)

Operaciones que tocan más de una tabla se envuelven en funciones de
Postgres `SECURITY DEFINER` con `BEGIN/COMMIT` implícito de la función (una
llamada RPC = una transacción), evitando el patrón "leer en la función
serverless, escribir en dos pasos" que puede quedar a medias si la función
se corta a mitad de ejecución. Ejemplos: `fn_close_trip_and_reconcile`
(cierra viaje + calcula variación de presupuesto + genera alerta si excede
umbral) y `fn_register_payment` (marca factura pagada + cancela recordatorios
pendientes) — ambas en `supabase/schema_fleet.sql`.

## 6. Seguridad — control por control

| Control | Implementación |
|---|---|
| SQL Injection | 100% Supabase JS client (consultas parametrizadas) o RPC con parámetros tipados. Cero concatenación de SQL en el repo. |
| Validación de entrada | `zod` en el backend (única fuente de verdad) + réplica ligera en el frontend solo para UX. El backend nunca confía en la validación del cliente. |
| AuthN | Supabase Auth (GoTrue): JWT de acceso de vida corta (1h, configurable) + refresh token rotativo de un solo uso — la rotación revoca la cadena completa si un refresh token robado se reutiliza. |
| AuthZ | RBAC por rol (`owner/admin/driver`) + RLS por `company_id` en cada tabla. Ver §3. |
| Contraseñas | Hash vía Supabase Auth (bcrypt, factor de costo gestionado por el proveedor). Si se autogestiona Auth en el futuro, migrar a Argon2id (`argon2` npm) — documentado como decisión pendiente de proveedor, no de negocio. |
| Cifrado en tránsito | TLS forzado por Netlify + Supabase (HTTP→HTTPS redirect); `Strict-Transport-Security` añadido en `netlify.toml`. |
| Cifrado en reposo | Delegado a Supabase (Postgres/Storage cifrados en reposo por el proveedor administrado). |
| Rate limiting | `_lib/rateLimit.js`: ventana deslizante en Upstash Redis (distribuido, recomendado en prod) con *fallback* en memoria de proceso para desarrollo local. Límite por IP+usuario, distinto por endpoint (más estricto en login/QR público). |
| Fuerza bruta / DDoS | Rate limit agresivo en endpoints públicos (`fleet-vehicle-qr`, `verify-certificate`) + validación estricta de formato antes de tocar BD (evita enumeración). Netlify además provee mitigación de capa 7 a nivel de CDN. |
| Cabeceras de seguridad | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy` en `netlify.toml`. |
| Logging / excepciones | `_lib/logger.js` emite JSON estructurado (`requestId`, `userId`, `route`, `latencyMs`, `level`) a stdout (ingerible por cualquier colector de logs de Netlify/terceros). `_lib/handler.js` envuelve cada función en try/catch central: nunca se filtra el stack trace al cliente, siempre se loggea server-side. |
| Manejo de secretos | Todo secreto (service role key, credenciales WhatsApp/OCR) vive solo en variables de entorno de Netlify, nunca en `js/config.js` (público) ni en el repo. |

## 7. Caché

Los endpoints de alto tráfico y lectura (estatus de cumplimiento por unidad,
listado de la flota para el dashboard) usan `_lib/cache.js`:
- **Upstash Redis** (HTTP, compatible con serverless) como caché compartido
  entre invocaciones, TTL corto (30–60s) para agregados de dashboard.
- Invalidación activa: cualquier escritura sobre `compliance_documents`,
  `expenses`, `freight_invoices` borra la clave de caché de su empresa
  (`cache.del(`fleet:${companyId}:*`)`) en vez de esperar el TTL — evita
  servir datos obsoletos tras una acción del usuario.
- La verificación pública de QR (`fleet-vehicle-qr`) usa `Cache-Control:
  public, max-age=60` a nivel de CDN de Netlify, igual que
  `verify-certificate` ya existente.

## 8. Escalabilidad horizontal

- **Cómputo**: Netlify Functions escala horizontalmente sin configuración
  (una invocación = un contenedor efímero); no hay estado en el proceso que
  limite el paralelismo (el rate limiter usa Redis externo, no memoria
  compartida, salvo el *fallback* local explícitamente documentado como tal).
- **Base de datos**: Supabase Postgres soporta *connection pooling*
  (PgBouncer, modo *transaction*) — usar el puerto de pooler (6543) en
  producción para no agotar conexiones cuando el tráfico crezca.
- **Cargas pesadas** (OCR de tickets, generación masiva de recordatorios) se
  mueven a *scheduled functions* (`netlify/functions/fleet-send-reminders.js`,
  cron) en vez de bloquear la petición síncrona del usuario.
- Camino de crecimiento: si una empresa cliente supera unidades/tráfico que
  justifiquen aislarla, `company_id` ya es la clave de *sharding* natural
  (no requiere rediseño de esquema).

## 9. Integraciones de terceros (adaptadores plegables, no hardcodeados)

Cada integración externa vive detrás de una interfaz en `_lib/`, para poder
cambiar de proveedor sin tocar los casos de uso:

- `_lib/notify.js` — envío de WhatsApp/Email. Implementación por defecto:
  *no-op* con log si no hay credenciales; adaptador real para
  **Meta WhatsApp Cloud API** o **Twilio** activado por variables de entorno
  (`WHATSAPP_PROVIDER=meta|twilio`).
- `_lib/ocr.js` — lectura de tickets (monto, fecha, RFC). Interfaz única,
  implementación por defecto usando **Google Cloud Vision API** (requiere
  `GOOGLE_VISION_API_KEY`); si no está configurada, el ticket se guarda con
  `ocr_confidence: null` y estatus `revision_manual` para que el dueño lo
  capture a mano — el flujo nunca se rompe por falta de credencial.
- Validación de licencia SICT y firma electrónica (Módulo 3 del roadmap
  original) quedan como adaptadores por implementar
  (`_lib/sict.js`, `_lib/esign.js`) — no existe una API pública estable de
  SICT para consulta automatizada al momento de escribir esto; se documenta
  como *pendiente de validación legal/comercial* en vez de simularla.

## 10. Qué NO se construyó en este MVP (y por qué)

- Verificación automática de licencias contra SICT: no hay API pública
  confiable; requiere convenio o scraping frágil. Se deja el adaptador listo
  pero deshabilitado.
- Firma electrónica avanzada (e.firma/FIEL): requiere PSC certificado
  (proveedor de servicios de certificación); se integra en fase 2 con un
  proveedor como Mifiel/Weel detrás de `_lib/esign.js`.
- App móvil nativa: el flujo del chofer es 100% web móvil (PWA) + WhatsApp,
  evitando el costo de dos apps nativas para un MVP.
