# OperadorPro — Plataforma unificada de operadores y flota

Una sola plataforma para el sector de autotransporte en México — **un solo
acceso** (`app.html`), sin importar si el usuario es un chofer que solo
busca certificarse, un "hombre-camión" dueño de su unidad, o una empresa
(persona física o moral, mismo servicio para ambas):

- **Certificación**: cursos, exámenes de 10 reactivos (aprueba con 8) y
  certificados PDF con folio único y QR verificable.
- **Gestión de flota**: cumplimiento documental con semáforo y QR por
  unidad, viáticos con OCR de tickets, inspección pre-viaje (NOM-068) con
  evidencia fotográfica geolocalizada, y cobranza de fletes con
  recordatorios automáticos por WhatsApp.
- **Cuenta única**: al registrarte se crea tu perfil de operador Y tu
  empresa automáticamente — no hay un paso separado de "alta de flota".
- **Panel de administrador de plataforma** (`admin.html`, acceso
  restringido): ver y gestionar todas las cuentas, dar de alta manualmente,
  activar/desactivar suscripciones y suspender accesos.

Ver `ARCHITECTURE.md` para el diseño completo (RBAC multi-tenant, RLS,
rate limiting, caché, etc.)

**Stack:** HTML/CSS/JS sin build (PWA instalable) · Supabase (Auth +
PostgreSQL con RLS + Storage) · Netlify (hosting + funciones serverless +
funciones programadas) · Stripe (dos suscripciones: certificación y flota) ·
Upstash Redis (rate limiting/caché, opcional) · jsPDF + QR.

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
   precio recurrente mensual de **$249 MXN** (plan Esencial). Copia el
   `price_...` → variable STRIPE_PRICE_ID. Si también ofreces el plan
   Protegido ($349 MXN/mes, incluye asesoría legal), crea un segundo
   precio para ese producto.
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

### 6. Instalar como app en el celular (PWA)

El sitio ya es una **Progressive Web App**: en Android/Chrome aparece
"Instalar app" (o se agrega solo al menú), y en iPhone/Safari se agrega a
la pantalla de inicio manualmente. Una vez instalada abre en pantalla
completa, sin barra del navegador, con ícono propio.

- **Android (Chrome)**: entra a `app.html`, toca el menú ⋮ → **"Instalar
  app"** (o aparece un banner automático).
- **iPhone/iPad (Safari)**: entra a `app.html`, toca el botón de compartir
  (cuadro con flecha ↑) → **"Agregar a inicio"**.
  Safari ignora el prompt automático de Android pero sí respeta el ícono
  y el modo pantalla completa vía las etiquetas `apple-mobile-web-app-*`
  ya incluidas.
- El ícono (`icons/icon-*.png`) usa el mismo monograma "OP" del logo del
  sitio — generado sin depender de herramientas externas de imagen, ver
  `scripts/generate-icons.js` (solo hace falta volver a correrlo si cambia
  el diseño del logo).
- `sw.js` (service worker) usa estrategia **"red primero, caché de
  respaldo"** — nunca sirve una versión vieja del panel si hay internet;
  el caché solo entra si el celular se queda sin señal a media carretera.
  Nunca cachea llamadas a `/.netlify/functions/*` ni a Supabase.

### 7. Plataforma unificada (persona física/moral) y panel de administrador

Ejecuta `supabase/schema_platform.sql` (después de `schema.sql` y
`schema_fleet.sql`). Hace tres cosas:

1. Agrega `entity_type` (`fisica`/`moral`) a `companies` — dato informativo,
   no cambia ningún permiso ni funcionalidad; el servicio es el mismo para
   ambos tipos de contribuyente, como se pidió.
2. Crea un trigger que **da de alta la empresa automáticamente** al
   registrarse un usuario nuevo (mismo nombre que puso al registrarse,
   editable después en Perfil → "Mi empresa"). Ya no existe un paso
   separado de "crear empresa": un chofer que solo quiere certificarse
   también tiene una empresa lista si algún día da de alta una unidad.
3. Crea `platform_admins` — la tabla que da acceso al panel de
   administrador (`admin.html`). Deliberadamente **sin ninguna política
   RLS**: con RLS habilitado y cero `create policy`, nadie puede leerla ni
   escribirla vía el cliente (ni siquiera el propio admin autenticado) —
   solo la service role key, usada exclusivamente por las funciones
   `fleet-admin-*.js` después de verificar la sesión, puede tocarla.

**Para activar tu propio acceso de administrador:**
1. Regístrate normalmente en `app.html` con el correo que quieres usar
   como administrador (ej. el tuyo).
2. En el SQL Editor de Supabase, corre (ya viene al final de
   `schema_platform.sql`, pero puedes ejecutarlo solo si ya corriste el
   resto antes de registrarte):
   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'TU-CORREO@ejemplo.com'
   on conflict (user_id) do nothing;
   ```
3. Entra a `admin.html` con ese correo. Si tu cuenta no está en
   `platform_admins`, verás "Tu cuenta no tiene acceso de administrador de
   plataforma" — no un error confuso, ni datos de otras empresas.

**Qué puedes hacer desde `admin.html`:**
- Ver todas las empresas (dueño, tipo de contribuyente, RFC, unidades
  activas, estatus de suscripción, fecha de alta) y todos los usuarios
  registrados (con las empresas a las que pertenecen y su rol).
- **Dar de alta manual**: crea una cuenta por correo + nombre sin que la
  persona se registre sola (útil para onboarding por venta directa/
  telefónica). Se genera una contraseña temporal que tú le compartes por
  tu cuenta (ej. WhatsApp) — no depende de que el SMTP de Supabase esté
  configurado para funcionar.
- **Activar/desactivar la suscripción de flota manualmente**, sin pasar
  por Stripe (tratos negociados, cortesías, o corregir un desajuste).
- **Suspender o reactivar** el acceso de un usuario a una empresa
  específica, sin afectar a los demás miembros.

### 8. Primer uso
1. Entra a `app.html`, regístrate o inicia sesión — una sola cuenta te da
   acceso a cursos y flota, sin pasos separados.
2. Tu empresa ya existe (se creó sola). Desde **Perfil → Mi empresa**
   puedes editar el nombre, RFC y tipo de contribuyente (física/moral).
3. Entra a la pestaña **Flota**: da de alta unidades y choferes, sube
   documentos de cumplimiento y revisa el semáforo.
4. Abre un viaje con presupuesto y registra gastos con foto del ticket.
5. Envía una inspección pre-viaje de prueba (5 fotos + 10 puntos).
6. Da de alta un cliente y registra una factura de flete.
7. (Si activaste tu acceso de administrador) entra a `admin.html` y
   confirma que ves la empresa y el usuario que acabas de crear.

---

## Estructura

```
operadorpro/
├── index.html                  Landing de venta
├── app.html                    Panel UNIFICADO (cursos + flota) — SPA, único acceso
├── admin.html                  Panel de administrador de plataforma (acceso restringido)
├── verificar.html              Verificador público de certificados (QR)
├── fleet.html                  Redirect a app.html#/flota (compatibilidad de links viejos)
├── fleet-qr.html               Verificación pública de unidad (QR)
├── manifest.webmanifest        Manifest PWA (instalar como app)
├── sw.js                       Service worker (red primero, caché de respaldo)
├── icons/                      Íconos PWA (generados por scripts/generate-icons.js)
├── css/styles.css              Sistema visual "señal carretera"
├── css/fleet.css               Extensión visual del módulo de flota
├── js/config.js                Llaves públicas (editar)
├── js/courses-data.js          Contenido de cursos y exámenes
├── js/panel.js                 Lógica del panel unificado (cursos + flota, un solo estado)
├── js/admin-app.js             Lógica del panel de administrador (app aislada a propósito)
├── js/register-sw.js           Registra el service worker (app.html)
├── netlify/functions/
│   ├── create-checkout.js      Stripe Checkout (suscripción de certificación)
│   ├── stripe-webhook.js       Sincroniza estado de suscripción de certificación
│   ├── issue-certificate.js    Emite certificado (validación en servidor)
│   ├── verify-certificate.js   Verificación pública por folio
│   ├── fleet-create-company.js
│   ├── fleet-update-company.js          Nombre/RFC/tipo de contribuyente
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
│   ├── fleet-admin-list-companies.js    (admin) todas las empresas
│   ├── fleet-admin-list-users.js        (admin) todos los usuarios
│   ├── fleet-admin-create-account.js    (admin) alta manual con contraseña temporal
│   ├── fleet-admin-set-subscription.js  (admin) activar/desactivar sin Stripe
│   ├── fleet-admin-set-member-status.js (admin) suspender/reactivar acceso
│   ├── domain/                 Reglas de negocio puras (sin I/O)
│   └── _lib/                   Auth/RBAC/requirePlatformAdmin, rate limit, validación,
│                                logging, errores, respuesta, caché, notificaciones,
│                                OCR, Stripe (cliente + sync de cantidad)
├── scripts/check-rpc-contracts.js  Verifica admin.rpc(...) vs schema_fleet.sql (CI)
├── scripts/generate-icons.js   Genera icons/*.png (encoder PNG propio, sin deps)
├── test/domain.test.js         Pruebas unitarias de domain/* (node:test)
├── .github/workflows/ci.yml    Sintaxis + contratos RPC + pruebas en cada push/PR
├── supabase/schema.sql         Tablas de certificación, trigger de perfil y RLS
├── supabase/schema_fleet.sql   Tablas de flota, RBAC multi-tenant, RLS,
│                                funciones transaccionales, buckets de Storage
├── supabase/schema_platform.sql    entity_type, alta automática de empresa,
│                                    platform_admins (acceso de administrador)
├── supabase/hotfix_actor_uid.sql    Migración: auth.uid() → actor explícito en RPCs
├── supabase/hotfix_tenant_isolation.sql  Migración: aislamiento entre empresas
├── supabase/migration_billing.sql  Migración: columnas de Stripe en companies
├── supabase/hotfix_billing_rls.sql Migración: protege columnas de Stripe en companies
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

### Administración de plataforma
- `platform_admins` es la única tabla del sistema sin ninguna política
  RLS: con RLS habilitado y cero `create policy`, es inalcanzable desde el
  cliente (ni siquiera para el propio admin autenticado) — solo la
  service role key puede leerla, y solo la usan las funciones
  `fleet-admin-*.js` tras verificar la sesión del usuario.
- `requirePlatformAdmin()` (en `_lib/auth.js`) es el primer chequeo de
  toda función `fleet-admin-*.js`, antes de tocar cualquier otro dato —
  mismo patrón que `requireCompanyRole()`, pero para el rol transversal
  de plataforma en vez del rol dentro de una empresa.
- El alta manual (`fleet-admin-create-account.js`) genera una contraseña
  temporal aleatoria de alta entropía (`crypto.randomBytes`) en vez de
  depender de que el admin elija una — y solo se muestra una vez en el
  panel, nunca se guarda en la base ni en logs.

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
