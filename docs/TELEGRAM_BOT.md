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

### 3. Ejecutar Migración de BD

En Supabase SQL Editor, corre:

```sql
-- archivo: supabase/migration_telegram.sql
-- (copia el contenido y ejecuta)
```

Esto crea las tablas necesarias:
- `telegram_sessions` → vinculación usuario-Telegram
- `telegram_conversation_state` → progreso en flujos conversacionales
- `telegram_poll_state` → offset de último mensaje procesado

### 4. Redeploy

El bot está listo. No requiere configurar webhook: usa **polling** (getUpdates cada minuto)
via función programada `telegram-poller.js` en `netlify.toml`.

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
🔍 Nueva Inspeccion Pre-Viaje

Selecciona la unidad (ingresa numero economico):
> 001

Unidad 001 seleccionada.

Envia 5 fotos: Frente, Llantas, Motor, Caja trasera, Odometro
(Cuando termines escribe: listo)

[Chofer envía foto 1]
Fotos recibidas: 1
Envia mas fotos o escribe 'listo':

[Chofer envía fotos 2-5]
...

[Chofer escribe: listo]
Gracias. Ahora ingresa el kilometraje actual (numero):
> 125450

Ahora responde el checklist. Por cada item escribe S (si) o N (no):

1. Frenos
2. Luces
3. Llantas (desgaste)
4. Niveles de fluidos
5. Fugas
6. Espejos
7. Claxon
8. Extintor
9. Triangulos de seguridad
10. Cinturon de seguridad

Escribe: SSSSSNSSSSS (ejemplo)
> SSSSSNSSSSN

Inspeccion completada (5 fotos).

Inspecciona otra unidad? Escribe /start para volver al menu.
```

#### Opción 2️⃣: Crear Viaje

```
🚗 Crear Viaje

Escribe el origen (ciudad/direccion):
> Guadalajara, Jal

Escribe el destino:
> Mexico CDMX

Presupuesto para gastos (numero en pesos):
> 5000

Viaje iniciado: Guadalajara, Jal -> Mexico CDMX

Presupuesto: $5000 MXN

Ahora puedes reportar gastos. /start para menu.
```

#### Opción 3️⃣: Reportar Gasto

```
⛽ Reportar Gasto de Viaje

Cual es el ID del viaje?
> xyz-789

Selecciona categoria: diesel, caseta, comida, taller, otro
> diesel

Monto del gasto (numero en pesos):
> 450.50

Sube una foto del recibo (o escribe 'sin foto' para omitir):

[Chofer envía foto]
Foto registrada. Válido por 1 año.

Gasto registrado: DIESEL $450.50 MXN

Reporta otro gasto? /start para menu.
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

## 📡 Sincronización Offline

### Nota sobre conectividad

El **bot de Telegram requiere internet** para recibir y enviar mensajes. Por lo tanto:

- ✅ Cuando el chofer escribe en Telegram → tiene internet
- ✅ Fotos se suben inmediatamente a Supabase Storage
- ✅ Inspecciones/viajes/gastos se crean de inmediato en BD

### Cola Offline

La tabla `telegram_offline_queue` existe para **futuras aplicaciones móviles** que sí pueden trabajar sin internet. El Telegram bot **no la usa** (no hay caso de uso con Telegram sin internet).

Si construyes una app móvil companion para OperadorPro:
1. Captura datos localmente (offline)
2. Guarda en `telegram_offline_queue`
3. Al conectarse, llama `telegram-sync-queue` para subir todo
4. Las funciones `processQueueItem` procesan cada tipo de mensaje

### Estructura de `telegram_offline_queue`

```sql
telegram_session_id  (FK → telegram_sessions)
message_type         ('inspection_create', 'trip_start', 'expense_submit', etc.)
payload              (JSON: {vehicle_id, origin, amount, ...})
retry_count          (contador de reintentos en sync)
last_error           (último error si falló)
created_at           (cuándo se creó)
synced_at            (NULL = pendiente; timestamp = sincronizado)
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
