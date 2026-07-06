# OperadorPro — MVP

Plataforma de capacitación y certificación por suscripción para operadores de
tractocamión y autotransporte federal.

**Incluye en este MVP:**
- Landing de venta (`index.html`)
- Panel del operador (`app.html`): registro/login, 3 cursos con lecciones,
  exámenes de 10 reactivos (aprueba con 8), perfil profesional
- Certificados PDF con folio único tipo placa y código QR
- Verificador público de certificados (`verificar.html`)
- Suscripción mensual con Stripe Checkout + webhook de sincronización
- Emisión de certificados validada 100% del lado del servidor

**Stack:** HTML/CSS/JS sin build · Supabase (Auth + PostgreSQL con RLS) ·
Netlify (hosting + funciones serverless) · Stripe (suscripciones) · jsPDF + QR.

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

## Estructura

```
operadorpro/
├── index.html                  Landing de venta
├── app.html                    Shell del panel (SPA)
├── verificar.html              Verificador público (destino del QR)
├── css/styles.css              Sistema visual "señal carretera"
├── js/config.js                Llaves públicas (editar)
├── js/courses-data.js          Contenido de cursos y exámenes
├── js/app.js                   Lógica del panel
├── netlify/functions/
│   ├── create-checkout.js      Stripe Checkout (suscripción)
│   ├── stripe-webhook.js       Sincroniza estado de suscripción
│   ├── issue-certificate.js    Emite certificado (validación en servidor)
│   └── verify-certificate.js   Verificación pública por folio
├── supabase/schema.sql         Tablas, trigger de perfil y políticas RLS
├── netlify.toml
├── package.json
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
- Panel B2B para flotas: alta masiva de operadores y reporte de avance
- Directorio público de operadores certificados (opt-in) para reclutadores
- Cursos con audio (tu pipeline de Edge-TTS encaja directo)
- Consulta legal vía WhatsApp como tier premium
