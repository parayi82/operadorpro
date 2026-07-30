# OperadorPro — MVP + Módulo de Gestión de Flota

Plataforma de capacitación y certificación por suscripción para operadores de
tractocamión y autotransporte federal, **más un módulo de gestión de flota**
para el dueño del camión/empresa: cumplimiento documental con QR, viáticos
con OCR de tickets, inspección pre-viaje (NOM-068) y cobranza de fletes.

**Incluye en este MVP:**
- Landing de venta (`index.html`)
- Panel del operador (`app.html`): registro/login, 3 cursos con lecciones,
  exámenes de 10 reactivos (aprueba con 8), perfil profesional
- Certificados PDF con folio único tipo placa y código QR
- Verificador público de certificados (`verificar.html`)
- Suscripción mensual con Stripe Checkout + webhook de sincronización
- Emisión de certificados validada 100% del lado del servidor
- **Panel de flota (`fleet.html`)**: cumplimiento documental con semáforo y
  QR por unidad, viáticos con captura de ticket + OCR, inspección pre-viaje
  NOM-068 con evidencia fotográfica geolocalizada, y cobranza de fletes con
  recordatorios automáticos por WhatsApp. Ver `ARCHITECTURE.md` para el
  diseño completo (RBAC multi-tenant, RLS, rate limiting, caché, etc.)

**Stack:** HTML/CSS/JS sin build · Supabase (Auth + PostgreSQL con RLS +
Storage) · Netlify (hosting + funciones serverless + funciones programadas) ·
Stripe (suscripciones) · Upstash Redis (rate limiting/caché, opcional) ·
jsPDF + QR.

---

## Despliegue paso a paso

### 1. Supabase (≈10 min)
1. Crea un proyecto nuevo en https://supabase.com
2. Ve a **SQL Editor > New query**, pega el contenido completo de
   `supabase/schema.sql` y ejecútalo.
3. En **Authentication > Providers > Email**: deja habilitado Email/Password.
   - Recomendado para arrancar rápido: en **Authentication > Settings**
     desactiva "Confirm email" (lo reactivas cuando tengas dominio y SMTP).
4. En **Settings > API** copia:
   - `Project URL` → va en `js/config.js` (SUPABASE_URL) y en Netlify (SUPABASE_URL)
   - `anon public` key → va en `js/config.js` (SUPABASE_ANON_KEY)
   - `service_role` key → SOLO en variables de entorno de Netlify (SUPABASE_SERVICE_ROLE_KEY)

### 2. Stripe (≈10 min)
1. En **Products > Add product**: "Suscripción OperadorPro",
   precio recurrente mensual de **$149 MXN**. Copia el `price_...`
   → variable STRIPE_PRICE_ID.
2. En **Developers > API keys** copia la Secret key → STRIPE_SECRET_KEY.
3. El webhook se configura DESPUÉS del primer deploy (paso 4).

### 3. GitHub + Netlify (≈10 min)
1. Sube esta carpeta a un repositorio de GitHub.
2. En Netlify: **Add new site > Import from GitHub** y elige el repo.
   - Build command: (vacío) · Publish directory: `.`
   - Netlify detecta `netlify.toml` y las funciones automáticamente.
3. En **Site settings > Environment variables** agrega TODAS las variables
   de `.env.example` con sus valores reales.
4. Edita `js/config.js` con tus valores públicos (SUPABASE_URL,
   SUPABASE_ANON_KEY y SITE_URL con la URL real de Netlify) y haz push.

### 4. Webhook de Stripe (≈5 min)
1. En Stripe **Developers > Webhooks > Add endpoint**:
   - URL: `https://TU-SITIO.netlify.app/.netlify/functions/stripe-webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`
2. Copia el `whsec_...` → variable STRIPE_WEBHOOK_SECRET en Netlify.
3. Redespliega el sitio (Deploys > Trigger deploy) para que tome la variable.

### 5. Prueba de humo
1. Regístrate con un correo de prueba.
2. Lee la lección 1 gratis; intenta la lección 2 → debe pedir suscripción.
3. Activa la suscripción con tarjeta de prueba de Stripe
   (`4242 4242 4242 4242`, cualquier fecha futura y CVC) en modo test.
4. Completa un curso, aprueba el examen, descarga el PDF y escanea el QR:
   debe abrir `verificar.html` mostrando el certificado como vigente.

---

## Módulo de Flota — pasos adicionales de despliegue

> **⚠️ Si tu proyecto Supabase ya corrió una versión anterior de
> `schema_fleet.sql`** (por ejemplo, ya diste de alta empresa/unidades),
> ejecuta estos 3 archivos en el SQL Editor **en este orden** antes de
> seguir usando el panel — corrigen bugs de seguridad reales encontrados
> y arreglados la noche del 29-30 de julio. Son idempotentes (seguros de
> correr aunque ya los hayas ejecutado):
> 1. `supabase/hotfix_actor_uid.sql` — sin esto, subir documentos de
>    cumplimiento y crear facturas fallaba con error 500.
> 2. `supabase/hotfix_tenant_isolation.sql` — sin esto, una empresa podía
>    adjuntar un documento de cumplimiento falso a la unidad de OTRA
>    empresa (visible en su QR público) o facturar contra un cliente que
>    no era suyo.
> 3. `supabase/migration_billing.sql` (agrega columnas de Stripe a
>    `companies`) **seguido de** `supabase/hotfix_billing_rls.sql`
>    (protege esas columnas — sin esto, un owner podía activarse la
>    suscripción gratis llamando directo a la API de Supabase). Si nunca
>    activaste el cobro por Stripe puedes saltarte estos dos por ahora,
>    pero corre `hotfix_billing_rls.sql` de todos modos en cuanto
>    ejecutes `migration_billing.sql`.
>
> Un proyecto que ejecute `schema_fleet.sql` **desde cero, tal como está
> ahora en esta rama**, ya incluye los 4 fixes — no necesita ninguno de
> estos archivos sueltos.

### 1. Ejecutar el esquema de flota
En **Supabase > SQL Editor**, ejecuta `supabase/schema_fleet.sql` completo
(después de `schema.sql`). Crea tablas, RLS multi-tenant, funciones
transaccionales y los buckets de Storage `compliance-docs` y `trip-evidence`.
Si la creación de buckets falla por permisos del editor SQL, créalos
manualmente en **Storage** como privados (`public = false`).

### 2. Variables de entorno nuevas
Copia `.env.example` y agrega en Netlify (opcional pero recomendado en
producción):
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — rate limiting y
  caché distribuidos (gratis en https://upstash.com). Sin esto, cada función
  usa un limitador en memoria por instancia (no apto para producción real).
- `WHATSAPP_PROVIDER` + credenciales de Meta Cloud API o Twilio — para que
  los recordatorios de vencimiento y cobranza se envíen de verdad. Sin
  configurar, el sistema sigue funcionando: solo loggea el mensaje y no lo
  envía (revisa los logs de la función programada).
- `GOOGLE_VISION_API_KEY` — OCR de tickets de viáticos. Sin ella, el gasto
  se guarda igual con `review_status: revision_manual`.

### 3. Funciones programadas (cron)
Ya configuradas en `netlify.toml`:
`fleet-send-compliance-reminders` (07:00 hora CDMX) y
`fleet-send-payment-reminders` (08:00 hora CDMX). Netlify las despliega
automáticamente como *Scheduled Functions* al hacer push.

### 4. WhatsApp real (Meta Cloud API)

Los recordatorios (vencimiento de documentos, cobranza) son mensajes que
**tu empresa inicia** — WhatsApp exige que este tipo de mensaje use una
**plantilla pre-aprobada**, nunca texto libre (el texto libre solo es válido
si el destinatario te escribió primero en las últimas 24h). El código ya
está listo para esto (`_lib/notify.js` → `sendReminder`); falta la parte que
solo se hace desde la cuenta de Meta:

1. **Crea la app**: entra a https://developers.facebook.com/apps → Create
   App → tipo "Business". Dentro de la app, agrega el producto **WhatsApp**.
2. **Número de prueba o número propio**:
   - Para probar ya: Meta te da un número de prueba gratis y puedes
     verificar hasta 5 números destinatarios (tu celular, el del chofer de
     prueba, etc.) en **WhatsApp > API Setup**.
   - Para producción: verifica tu propio número de WhatsApp Business ahí
     mismo (requiere un número que no esté ya activo en la app de WhatsApp
     normal).
3. **Token permanente**: el token temporal de "API Setup" dura 24h. Para
   producción, crea un **System User** en Meta Business Suite (Configuración
   del negocio > Usuarios > Usuarios del sistema), asígnale el activo de
   WhatsApp con permiso `whatsapp_business_messaging`, y genera un token sin
   expiración desde ahí.
4. **Copia el Phone Number ID** (no el número de teléfono) desde
   **WhatsApp > API Setup**.
5. **Crea las 3 plantillas** en **WhatsApp Manager > Message Templates >
   Create Template** (categoría "Utility", idioma español MX). Usa
   exactamente estos nombres y cuerpos (las `{{n}}` son las variables):

   | Nombre exacto | Cuerpo |
   |---|---|
   | `operadorpro_vencimiento_documento` | `OperadorPro: el {{1}} de {{2}} vence el {{3}}. Renueva a tiempo para evitar arrastre o corralón.` |
   | `operadorpro_pago_proximo` | `OperadorPro: tu factura del viaje {{1}} por ${{2}} MXN vence el {{3}}.` |
   | `operadorpro_pago_vencido` | `OperadorPro: tu factura del viaje {{1}} por ${{2}} MXN tiene {{3}} día(s) de retraso. Vencimiento: {{4}}.` |

   Meta revisa cada plantilla (usualmente minutos a un par de horas). Hasta
   que estén **Approved**, el envío fallará — el recordatorio se marca
   `fallido` en la base y se reintenta en el siguiente corte del cron sin
   romper nada.
6. **Variables en Netlify**: `WHATSAPP_PROVIDER=meta`, `WHATSAPP_META_TOKEN`
   (el token permanente), `WHATSAPP_META_PHONE_ID`, y opcionalmente
   `WHATSAPP_META_TEMPLATE_LANG` si aprobaste las plantillas en un idioma
   distinto a `es_MX`.
7. **Prueba rápida** sin esperar al cron: invoca la función programada a
   mano (`curl -X POST https://TU-PREVIEW.netlify.app/.netlify/functions/fleet-send-compliance-reminders`)
   después de crear un documento con vencimiento cercano y un chofer con
   teléfono verificado en Meta.

Si prefieres probar más rápido sin esperar la aprobación de plantillas,
usa **Twilio Sandbox** en su lugar (`WHATSAPP_PROVIDER=twilio` +
`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_WHATSAPP_FROM`): el sandbox
permite texto libre a números que se unieron previamente, sin revisión de
plantillas — bueno para validar el flujo, no para producción real.

### 5. Cobro por suscripción de flota (Stripe)

Cobro **por unidad activa al mes**, replicando el flujo de Stripe Checkout
que ya usa el panel de certificación, pero como producto/precio separado.

1. Si aún no ejecutaste `schema_fleet.sql` con las columnas de facturación
   (`stripe_customer_id`, `stripe_subscription_id`, `subscription_status` en
   `companies`), corre `supabase/migration_billing.sql` — es la migración
   incremental, segura de ejecutar aunque ya tengas datos.
2. En Stripe **Products > Add product**: "Suscripción OperadorPro Flota",
   precio recurrente mensual. Recomendado: configúralo con **Tiered
   pricing** (graduated o volume) para que el descuento por tamaño de flota
   ($250-350 → $150-180 MXN/unidad según el volumen) lo aplique Stripe solo
   según la `quantity` que le mandamos — el código nunca calcula tiers.
   Copia el `price_...` → `STRIPE_FLEET_PRICE_ID`.
3. En Stripe **Developers > Webhooks > Add endpoint** (uno **nuevo**,
   distinto al de certificación):
   - URL: `https://TU-SITIO.netlify.app/.netlify/functions/fleet-stripe-webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`
   - Copia el `whsec_...` → `STRIPE_FLEET_WEBHOOK_SECRET` en Netlify.
4. Variables en Netlify: `STRIPE_FLEET_PRICE_ID`, `STRIPE_FLEET_WEBHOOK_SECRET`
   (reutiliza el `STRIPE_SECRET_KEY` que ya tienes de certificación — misma
   cuenta de Stripe).
5. En el panel (`fleet.html` → pestaña Flota), el **owner** de la empresa ve
   una tarjeta de "Suscripción" con botón **Activar suscripción** (abre
   Stripe Checkout) o **Gestionar mi suscripción** (abre el Billing Portal)
   una vez activa.
6. La cantidad de la suscripción se ajusta sola cuando das de alta una
   unidad nueva (`_lib/stripeSync.js`, best-effort: si Stripe falla, el alta
   de la unidad NO se bloquea — solo se loggea para revisar y sincronizar
   manualmente si hace falta).

### 6. Primer uso
1. Entra a `fleet.html`, regístrate o inicia sesión (mismo usuario/contraseña
   que el panel de certificación si ya tienes cuenta).
2. Crea tu empresa (te vuelves `owner` automáticamente).
3. Da de alta unidades, sube documentos de cumplimiento y revisa el semáforo.
4. Abre un viaje con presupuesto y registra gastos con foto del ticket.
5. Envía una inspección pre-viaje de prueba (5 fotos + 10 puntos).
6. Da de alta un cliente y registra una factura de flete.

---

## Estructura

```
operadorpro/
├── index.html                  Landing de venta
├── app.html                    Shell del panel de certificación (SPA)
├── verificar.html              Verificador público de certificados (QR)
├── fleet.html                  Shell del panel de flota — dueño/admin (SPA)
├── fleet-qr.html               Verificación pública de unidad (QR)
├── css/styles.css              Sistema visual "señal carretera"
├── css/fleet.css               Extensión visual del módulo de flota
├── js/config.js                Llaves públicas (editar)
├── js/courses-data.js          Contenido de cursos y exámenes
├── js/app.js                   Lógica del panel de certificación
├── js/fleet-app.js             Lógica del panel de flota
├── netlify/functions/
│   ├── create-checkout.js      Stripe Checkout (suscripción)
│   ├── stripe-webhook.js       Sincroniza estado de suscripción
│   ├── issue-certificate.js    Emite certificado (validación en servidor)
│   ├── verify-certificate.js   Verificación pública por folio
│   ├── fleet-create-company.js
│   ├── fleet-create-vehicle.js
│   ├── fleet-upload-compliance-doc.js
│   ├── fleet-compliance-dashboard.js
│   ├── fleet-vehicle-qr.js              (público)
│   ├── fleet-send-compliance-reminders.js (cron)
│   ├── fleet-create-trip.js
│   ├── fleet-submit-expense.js
│   ├── fleet-close-trip.js
│   ├── fleet-submit-inspection.js
│   ├── fleet-create-client.js
│   ├── fleet-create-invoice.js
│   ├── fleet-register-payment.js
│   ├── fleet-send-payment-reminders.js  (cron)
│   ├── fleet-create-driver.js
│   ├── fleet-update-vehicle-status.js   Activa/taller/baja (resincroniza Stripe)
│   ├── fleet-create-checkout.js         Stripe Checkout de flota (por unidad)
│   ├── fleet-billing-portal.js          Stripe Billing Portal
│   ├── fleet-stripe-webhook.js          Sincroniza subscription_status de companies
│   ├── domain/                 Reglas de negocio puras (sin I/O)
│   └── _lib/                   Auth/RBAC, rate limit, validación, logging,
│                                errores, respuesta, caché, notificaciones, OCR,
│                                Stripe (cliente + sync de cantidad)
├── scripts/check-rpc-contracts.js  Verifica admin.rpc(...) vs schema_fleet.sql (CI)
├── test/domain.test.js         Pruebas unitarias de domain/* (node:test)
├── .github/workflows/ci.yml    Sintaxis + contratos RPC + pruebas en cada push/PR
├── supabase/schema.sql         Tablas de certificación, trigger de perfil y RLS
├── supabase/schema_fleet.sql   Tablas de flota, RBAC multi-tenant, RLS,
│                                funciones transaccionales, buckets de Storage
├── supabase/hotfix_actor_uid.sql    Migración: auth.uid() → actor explícito en RPCs
├── supabase/migration_billing.sql  Migración: columnas de Stripe en companies
├── ARCHITECTURE.md             Arquitectura, seguridad, escalabilidad y caché
├── netlify.toml
├── package.json                 npm run verify → sintaxis + contratos RPC + tests
└── .env.example
```

## Seguridad implementada
- RLS en todas las tablas: cada usuario solo ve/edita lo suyo.
- El estado de suscripción NO puede modificarse desde el cliente
  (bloqueado por política RLS); solo lo escribe el webhook con service role.
- Los certificados solo se emiten en el servidor tras verificar: sesión
  válida + suscripción activa + examen aprobado registrado en la base.
- Firma del webhook de Stripe verificada; tabla de certificados cerrada
  al público (la verificación pasa por función con datos mínimos).

### Módulo de flota (ver `ARCHITECTURE.md` para el detalle completo)
- RBAC multi-tenant (`owner/admin/driver`) aplicado en dos capas: RLS en
  Postgres + verificación explícita en cada función (`requireCompanyRole`).
- Validación de entrada con `zod` en el backend (única fuente de verdad),
  nunca se confía en la validación del cliente.
- Rate limiting por IP+ruta en toda función (Upstash Redis en producción,
  fallback en memoria en desarrollo).
- Operaciones multi-tabla (cerrar viaje, registrar pago, crear factura con
  recordatorios) envueltas en funciones de Postgres transaccionales — nunca
  quedan a medias si la función serverless se corta.
- Buckets de Storage privados con política por membresía de empresa (nunca
  públicos); URLs firmadas de larga duración en vez de URLs públicas.
- Verificación pública por QR (`fleet-vehicle-qr.js`) con formato estricto
  anti-enumeración y rate limit agresivo, igual patrón que
  `verify-certificate.js`.
- Cabeceras de seguridad (`CSP`, `HSTS`, `Permissions-Policy`) en
  `netlify.toml` aplican a todo el sitio, incluido el panel de flota.

## Cómo agregar un curso nuevo
1. Agrega el objeto del curso en `js/courses-data.js` (mismo formato:
   id, title, badge, color, desc, lessons[], quiz[] de 10 reactivos).
2. Agrega su `id: "título"` en `COURSE_TITLES` dentro de
   `netlify/functions/issue-certificate.js`.
3. Push a GitHub → deploy automático. Nada más.

## Notas legales para producción
- **Contenido normativo:** las lecciones citan reglas de la NOM-087-SCT-2 y
  del complemento Carta Porte con fines de capacitación. Antes de publicar,
  valida el texto vigente de cada norma y las reglas actuales del SAT
  (versiones del complemento cambian).
- **DC-3:** para emitir constancias DC-3 oficiales necesitas registrarte
  como agente capacitador externo ante la STPS. Este MVP emite un
  certificado propio verificable; el módulo DC-3 se agrega en fase 2
  reutilizando el mismo generador de PDF.
- **Aviso de privacidad:** al recabar CURP y datos de licencia, publica tu
  aviso de privacidad (LFPDPPP) antes del lanzamiento y enlázalo desde el
  registro y el footer.

## Roadmap sugerido (fase 2)
- Constancias DC-3 (tras registro STPS como agente capacitador)
- Directorio público de operadores certificados (opt-in) para reclutadores
- Cursos con audio (tu pipeline de Edge-TTS encaja directo)
- Consulta legal vía WhatsApp como tier premium
- **Flota:** cobro por suscripción (Stripe) por unidad activa, replicando el
  flujo ya existente de `create-checkout.js`/`stripe-webhook.js`
- **Flota:** validación de licencia contra SICT y firma electrónica avanzada
  (ver §9-10 de `ARCHITECTURE.md` — adaptadores listos, pendientes de
  proveedor/convenio)
- **Flota:** alta masiva de choferes/unidades por CSV para flotas de 10+
  camiones
