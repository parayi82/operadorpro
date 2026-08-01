# 🤖 Bot de Telegram OperadorPro

Bot offline-first para que choferes hagan inspecciones, registren viajes y gastos directamente desde Telegram, sin tener que iniciar sesión cada vez.

## 🚀 Setup Inicial

### 1. Crear el Bot en Telegram

1. Abre Telegram y busca **@BotFather**
2. Escribe `/start` y sigue las opciones
3. Usa `/newbot` para crear un nuevo bot
4. Nombre: `OperadorPro Truck Management`
5. Username: `operadorpro_bot` (debe ser único)
6. Copia el **token** que te da BotFather

### 2. Configurar en Netlify

1. Ve a **Site settings** → **Environment variables**
2. Agrega:
   ```
   TELEGRAM_BOT_TOKEN=<token-de-BotFather>
   ```
3. Redeploy el sitio

### 3. Configurar el Webhook

Ejecuta esto en tu terminal (reemplaza `{BOTFATHER_TOKEN}` y `{SITE_URL}`):

```bash
curl -X POST "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"{SITE_URL}/.netlify/functions/telegram-webhook\"}"
```

Ejemplo:
```bash
curl -X POST "https://api.telegram.org/bot123456789:ABCdefGHIjklmnoPQRstuvWXYZ/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://operadorpro.netlify.app/.netlify/functions/telegram-webhook\"}"
```

Para verificar que está configurado:
```bash
curl https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getWebhookInfo
```

## 📱 Flujo de Usuario (Chofer)

### Primer uso: Autenticación

1. **Chofer abre Telegram** y busca `@operadorpro_bot`
2. Escribe `/start`
3. Bot responde: "Para vincular tu cuenta, necesitas un código..."
4. **Chofer abre la app web** de OperadorPro (panel o dashboard)
5. Va a **Configuración** → **Bot de Telegram**
6. Solicita un **código de autenticación** (válido 15 minutos)
7. **Vuelve a Telegram** y escribe: `/auth 123456`
8. Bot confirma: "✅ ¡Cuenta vinculada!"

### Usar el Bot (después de autenticarse)

El chofer ve un menú con opciones:

```
👤 Juan Pérez
✅ Plan: Esencial

¿Qué deseas hacer?
  [🔍 Inspeccionar] [1]
  [🚗 Crear Viaje] [2]
  [⛽ Reportar Gasto] [3]
  [📋 Ver Estado] [4]
```

#### Opción 1️⃣: Inspeccionar (NOM-068)

```
🔍 Nueva Inspección Pre-Viaje

Selecciona la unidad (ingresa número económico):
[escribe: 001]

Unidad: Tractocamión 5a rueda (ABC-123-XY)
Odómetro (km): 
[escribe: 125450]

Ahora saca 5 fotos:
1. Frente (unidad completa)
2. Llantas (vista del conjunto)
3. Motor (capó abierto)
4. Caja trasera (sin carga)
5. Odómetro (pantalla)

[Chofer envía foto]
✅ Foto 1/5 guardada

[... repite para las 5 fotos]

Checklist de seguridad (10 items):
[✓] Frenos
[✓] Luces
[✓] Llantas (desgaste)
...

✅ Inspección registrada (ID: abc-123)
Sincronizando cuando llegues a internet...
```

#### Opción 2️⃣: Crear Viaje

```
🚗 Crear Viaje

Origen (ciudad/dirección):
[escribe: Guadalajara, Jal]

Destino:
[escribe: México CDMX]

Presupuesto de viaje (MXN):
[escribe: 5000]

✅ Viaje abierto (ID: xyz-789)
Presupuesto: $5,000 MXN
```

#### Opción 3️⃣: Reportar Gasto

```
⛽ Reportar Gasto de Viaje

¿Cuál es el ID del viaje?
[escribe: xyz-789]

Categoría:
[⛽ Diesel] [🛣️ Caseta] [🍽️ Comida] [🔧 Taller] [📦 Otro]
[escribe: 1 o ⛽]

Monto (MXN):
[escribe: 450.50]

Foto del recibo:
[Chofer envía foto]

✅ Gasto registrado: $450.50 MXN
Pendiente de revisión
```

#### Opción 4️⃣: Ver Estado

```
📋 Estado de Documentos

🟢 Licencia Federal: Vigente (vence 25-AGO-2025)
🟢 Póliza Seguro: Vigente (vence 10-DIC-2025)
🟡 Tarjeta Circulación: Por vencer (15 días)
🔴 Verificación: Vencida (refresca urgente)

Más detalles en: https://operadorpro.app
```

## 📡 Funcionamiento Offline

### Cómo funciona

1. **Chofer sin internet**: Toma fotos, completa inspecciones/gastos normalmente
   - Los datos se guardan **localmente en la cola offline** de la BD
   - El bot confirma: "⏳ Guardado localmente, se sincronizará cuando tengas internet"

2. **Chofer con internet**: Llama `/sync` o el bot sincroniza automáticamente
   - Todas las acciones pendientes se suben a Supabase
   - Fotos se transfieren a `trip-evidence` bucket
   - El bot confirma: "✅ Sincronizado: 3 fotos, 2 gastos, 1 inspección"

3. **Flujo de fotos**:
   - Chofer envía foto via Telegram → se almacena en `telegram_offline_queue`
   - Con internet → foto se sube a Supabase Storage (`trip-evidence`)
   - La URL de Supabase se guarda en `inspections_photos`/`expenses`

### Tabla `telegram_offline_queue`

```sql
-- Estructura
telegram_session_id  (FK → telegram_sessions)
message_type         ('inspection_create', 'inspection_photo', 'expense_submit', etc.)
payload              (JSON con todos los datos del evento)
retry_count          (contador de reintentos si falla)
last_error           (mensaje de error si falló)
created_at           (cuándo se creó)
synced_at            (cuándo se sincronizó; NULL = pendiente)
```

## 🔐 Seguridad

### Autenticación
- Código de 6 dígitos válido solo 15 minutos
- Se valida contra `auth.users` de Supabase
- Sesión Telegram vinculada a `user_id` específico

### Autorización
- Solo choferes de una empresa pueden ver/editar datos de esa empresa
- RLS en `telegram_sessions` → solo el propio usuario ve su sesión
- RLS en `telegram_offline_queue` → solo el propio usuario ve su cola
- `company_id` se valida en cada operación (inspecciones, viajes, gastos)

### Datos
- Fotos se suben a bucket privado `trip-evidence`
- Acceso controlado por RLS (solo miembros de la empresa)
- Mensajes de Telegram NO se guardan, solo metadatos

## 🛠️ Endpoints API (para frontend web)

### Generar código de autenticación

```bash
POST /.netlify/functions/telegram-auth
Content-Type: application/json
Authorization: Bearer {JWT}

{
  "company_id": "uuid-of-company"
}

# Response
{
  "code": "123456",
  "expiresIn": "15m",
  "instructions": "Ingresa este código en el bot..."
}
```

### Sincronizar cola offline

```bash
POST /.netlify/functions/telegram-sync-queue
Content-Type: application/json
Authorization: Bearer {JWT}

{
  "telegram_session_id": "uuid-of-session"
}

# Response
{
  "synced": 5,
  "results": [
    { "id": "item-1", "status": "ok", "result": { "inspection_id": "..." } },
    { "id": "item-2", "status": "ok", "result": { "photo_id": "..." } },
    ...
  ]
}
```

### Ver sesión Telegram actual

```bash
GET /.netlify/functions/telegram-get-session?company_id=uuid
Authorization: Bearer {JWT}

# Response
{
  "id": "session-uuid",
  "telegram_user_id": "123456789",
  "authenticated_at": "2026-08-01T10:30:00Z",
  "last_activity_at": "2026-08-01T14:22:00Z"
}
```

## 📊 Monitoreo

### Ver cola pendiente (admin)

```sql
select count(*) as items_pending, telegram_user_id, created_at
from public.telegram_offline_queue oq
join public.telegram_sessions ts on ts.id = oq.telegram_session_id
where oq.synced_at is null
group by ts.telegram_user_id, oq.created_at
order by oq.created_at;
```

### Ver sesiones activas

```sql
select ts.id, p.full_name, ts.authenticated_at, ts.last_activity_at,
       (select count(*) from telegram_offline_queue oq where oq.telegram_session_id = ts.id and oq.synced_at is null) as pending_items
from public.telegram_sessions ts
join public.profiles p on p.id = ts.user_id
order by ts.last_activity_at desc;
```

## 🐛 Troubleshooting

### El bot no responde
- Verifica que `TELEGRAM_BOT_TOKEN` esté en Netlify ✅
- Redeploy el sitio
- Verifica webhook: `curl https://api.telegram.org/bot.../getWebhookInfo`
- Revisa logs en Netlify: **Functions** → **telegram-webhook**

### Código de autenticación no funciona
- ¿Pasaron más de 15 minutos? Solicita uno nuevo
- ¿Ingresaste bien los 6 dígitos? Revisa el código en la app web
- Revisa logs: **Functions** → **telegram-auth**

### Fotos no se sincronizan
- ¿Tiene el chofer conexión a internet?
- Intenta `/sync` manualmente
- Revisa la cola pendiente: `select * from telegram_offline_queue where synced_at is null`
- Revisa errores: `select * from telegram_offline_queue where last_error is not null`

### Acceso denegado
- ¿Pertenece el chofer a la empresa?
- ¿Tiene rol de "driver" en `company_members`?
- Revisa RLS: `select * from company_members where user_id = '...'`

## 🚀 Próximas Mejoras

- [ ] Notificaciones automáticas cuando documentos están por vencer
- [ ] Captura de GPS automática en cada foto
- [ ] Reconocimiento de odómetro vía OCR
- [ ] Chat con administrador directamente desde bot
- [ ] Soporte para archivo PDF de inspección
- [ ] Integración con Google Drive para backup
