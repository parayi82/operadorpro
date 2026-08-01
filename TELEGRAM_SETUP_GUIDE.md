# 🚀 Guía de Configuración e Implementación del Bot de Telegram

Este documento describe los pasos exactos para poner en producción el bot de Telegram de OperadorPro.

---

## 1️⃣ Ejecución de la Migración de Base de Datos

### Paso 1.1: Acceder a Supabase SQL Editor

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto OperadorPro
3. En el menú izquierdo, haz clic en **SQL Editor**
4. Haz clic en el botón **+ New Query**

### Paso 1.2: Copiar y ejecutar la migración

1. Abre el archivo `supabase/migration_telegram.sql` en tu editor
2. Copia TODO el contenido del archivo
3. Pega en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona Ctrl+Enter)

**Resultado esperado:**
```
✓ CREATE TABLE telegram_sessions
✓ CREATE POLICY telegram_sessions: leer propia
✓ CREATE POLICY telegram_sessions: crear propia
✓ CREATE TABLE telegram_offline_queue
✓ CREATE POLICY telegram_queue: leer propia
✓ CREATE TABLE telegram_poll_state
✓ INSERT INTO telegram_poll_state
✓ CREATE TABLE telegram_conversation_state
✓ CREATE INDEX idx_conv_session
```

### Paso 1.3: Verificar que las tablas se crearon

En el SQL Editor, ejecuta:

```sql
select table_name from information_schema.tables 
where table_schema = 'public' 
  and table_name like 'telegram%'
order by table_name;
```

Deberías ver:
- `telegram_conversation_state`
- `telegram_offline_queue`
- `telegram_poll_state`
- `telegram_sessions`

---

## 2️⃣ Configuración de Variables de Entorno

### Paso 2.1: Obtener el token de Telegram (BotFather)

1. Abre Telegram y busca **@BotFather**
2. Escribe `/start` y sigue el menú
3. Usa `/newbot` para crear un bot nuevo
4. **Nombre:** "OperadorPro Truck Management"
5. **Username:** `operadorpro_bot` (o similar, debe ser único)
6. BotFather te responde con el **token** (formato: `123456789:ABCdefGHIjklmnoPQRstuvWXYZ`)
7. **Copia el token completo** en un lugar seguro

### Paso 2.2: Agregar variable de entorno en Netlify

1. Ve a [Netlify Dashboard](https://app.netlify.com)
2. Selecciona tu sitio OperadorPro
3. En el menú superior, haz clic en **Site settings**
4. En el menú izquierdo, selecciona **Environment > Environment variables**
5. Haz clic en **Edit variables** (o **Add a variable**)
6. Agrega:
   - **Key:** `TELEGRAM_BOT_TOKEN`
   - **Value:** `<pega-el-token-de-BotFather>`
7. Haz clic en **Save**

### Paso 2.3: Hacer redeploy

1. En Netlify Dashboard, ve a **Deployments**
2. Busca el último deploy
3. Haz clic en el botón **Redeploy** (o usa el menú: **Deploys > Trigger deploy**)
4. Espera a que el deploy termine (2-3 minutos)

**Estado esperado:** Verde ✅ (Publish successful)

### Paso 2.4: Verificar que el bot está activo

Abre Telegram y busca tu bot (ej. `@operadorpro_bot`).

Verifica:
- ✓ El bot aparece en la búsqueda
- ✓ Puedes hacer clic en "Start"
- ✓ El bot responde con un mensaje de bienvenida

---

## 3️⃣ Pruebas en Vivo con Choferes

### Flujo de Prueba 1: Autenticación Básica

**Participantes:** 1 chofer (cuenta OperadorPro) + 1 probador

**Pasos:**

1. **Chofer:** Abre la app web en Perfil → Telegram
   - Click en "Generar código para Telegram"
   - Copia el código de 6 dígitos

2. **Chofer:** Abre Telegram y busca el bot (`@operadorpro_bot`)
   - Escribe `/start`
   - Bot responde con instrucciones

3. **Chofer:** Escribe `/auth 123456` (reemplaza con el código real)
   - Bot responde: "✅ ¡Cuenta vinculada!"

4. **Verificación:**
   - Recarga Perfil en la app web
   - Bajo "Telegram" debería ver: "✓ Vinculado a Telegram"
   - Última actividad: "ahora mismo"

**Resultado esperado:** ✅ PASS

---

### Flujo de Prueba 2: Inspección Pre-Viaje

**Requisitos previos:**
- Chofer autenticado (flujo 1)
- Mínimo 1 vehículo configurado en la empresa (Flota > Unidades)

**Pasos:**

1. **Chofer:** En Telegram, escribe `1` (o toca "🔍 Inspeccionar")
   - Bot responde: "Selecciona la unidad (ingresa número económico):"

2. **Chofer:** Escribe el número económico del vehículo (ej. `001`)
   - Bot responde: "Unidad 001 seleccionada.\n\nEnvia 5 fotos..."

3. **Chofer:** Envía 5 fotos desde la galería
   - Foto 1: Frente de la unidad
   - Foto 2: Llantas
   - Foto 3: Motor
   - Foto 4: Caja trasera
   - Foto 5: Odómetro
   
   Después de cada foto: "Fotos recibidas: X"

4. **Chofer:** Escribe `listo`
   - Bot responde: "Ahora ingresa el kilometraje actual (numero):"

5. **Chofer:** Escribe el kilometraje (ej. `125450`)
   - Bot responde: "Ahora responde el checklist. Por cada item escribe S (si) o N (no):"

6. **Chofer:** Escribe 10 caracteres S/N (ej. `SSSSSNSSSSN`)
   - Bot responde: "Inspeccion completada (5 fotos)."

7. **Verificación en app web:**
   - Ve a Flota > Inspecciones
   - Busca la inspección más reciente
   - Verifica: 5 fotos, 10 items de checklist, kilometraje correcto

**Resultado esperado:** ✅ PASS

---

### Flujo de Prueba 3: Crear Viaje

**Requisitos previos:**
- Chofer autenticado
- Mínimo 1 chofer y 1 vehículo en la empresa

**Pasos:**

1. **Chofer:** Escribe `2` (o toca "🚗 Crear Viaje")
   - Bot: "Escribe el origen (ciudad/dirección):"

2. **Chofer:** Escribe `Guadalajara, Jal`
   - Bot: "Escribe el destino:"

3. **Chofer:** Escribe `Mexico CDMX`
   - Bot: "Presupuesto para gastos (numero en pesos):"

4. **Chofer:** Escribe `5000`
   - Bot: "Viaje iniciado: Guadalajara, Jal -> Mexico CDMX. Presupuesto: $5000 MXN"

5. **Verificación en app web:**
   - Ve a Flota > Viajes
   - Busca el viaje más reciente
   - Verifica: estado "abierto", presupuesto $5,000

**Resultado esperado:** ✅ PASS

---

### Flujo de Prueba 4: Reportar Gasto

**Requisitos previos:**
- Chofer autenticado
- Viaje activo (flujo 3)

**Pasos:**

1. **Chofer:** Escribe `3` (o toca "⛽ Reportar Gasto")
   - Bot: "Cual es el ID del viaje?"

2. **Chofer:** Copia el ID del viaje de la app web (Flota > Viajes > detalles)
   - Escribe el ID
   - Bot: "Selecciona categoria: diesel, caseta, comida, taller, otro"

3. **Chofer:** Escribe `diesel`
   - Bot: "Monto del gasto (numero en pesos):"

4. **Chofer:** Escribe `450.50`
   - Bot: "Sube una foto del recibo (o escribe 'sin foto' para omitir):"

5. **Chofer:** Envía una foto del recibo
   - Bot: "Foto registrada. Válido por 1 año."
   - Bot: "Gasto registrado: DIESEL $450.50 MXN"

6. **Verificación en app web:**
   - Ve a Flota > Viajes > detalles del viaje
   - Busca el gasto reciente
   - Verifica: $450.50 diesel con foto adjunta

**Resultado esperado:** ✅ PASS

---

### Flujo de Prueba 5: Ver Estado

**Requisitos previos:**
- Chofer autenticado
- Documentos de cumplimiento en la empresa

**Pasos:**

1. **Chofer:** Escribe `4` (o toca "📋 Ver Estado")
   - Bot muestra estado de documentos con emojis:
     - 🟢 Vencido pronto
     - 🟡 Por vencer (próximos 30 días)
     - 🔴 Vencido

2. **Verificación:**
   - Compara con Flota > Cumplimiento en app web
   - Los estados deben coincidir

**Resultado esperado:** ✅ PASS

---

## 📋 Checklist Final

- [ ] Migración ejecutada sin errores
- [ ] 4 tablas telegram_* creadas en Supabase
- [ ] Variable de entorno TELEGRAM_BOT_TOKEN agregada en Netlify
- [ ] Redeploy completado exitosamente
- [ ] Bot responde a `/start` en Telegram
- [ ] Flujo 1: Autenticación funciona ✅
- [ ] Flujo 2: Inspección crea registro con fotos ✅
- [ ] Flujo 3: Viaje se crea con presupuesto ✅
- [ ] Flujo 4: Gasto se registra con foto ✅
- [ ] Flujo 5: Estado muestra documentos correctamente ✅

---

## 🆘 Troubleshooting

### Bot no responde a `/start`

**Causas posibles:**
1. Variable de entorno `TELEGRAM_BOT_TOKEN` no configurada
2. Redeploy no completado
3. Token incorrecto o expirado

**Solución:**
1. Verifica que la variable esté en Netlify > Site settings > Environment
2. Haz un redeploy manual
3. Si es necesario, regenera el token en BotFather

### Bot responde pero "No estás autenticado"

**Causa:** El usuario no ha vinculado su cuenta Telegram

**Solución:**
1. Abre Perfil > Telegram
2. Haz clic en "Generar código"
3. Escribe `/auth <código>` en Telegram

### Inspección no se guarda

**Causas posibles:**
1. Usuario no autenticado
2. Vehículo no existe o número económico incorrecto
3. Checklist incompleto (menos de 10 items)

**Solución:**
1. Verifica que el chofer esté autenticado (último paso en Telegram)
2. Verifica el número económico exacto en Flota > Unidades
3. Asegúrate de enviar exactamente 10 caracteres (S/N)

### Las fotos no se suben

**Causa:** Problema de permisos en Supabase Storage

**Solución:**
1. Ve a Supabase > Storage > evidence
2. Verifica que el bucket existe y está privado
3. Revisa las políticas RLS del bucket

---

## 📞 Soporte

Si encuentras problemas no listados aquí, revisa:
- `docs/TELEGRAM_BOT.md` - Documentación técnica
- Logs en Netlify > Functions > telegram-poller
- Logs en Netlify > Functions > telegram-auth
- Base de datos en Supabase > SQL Editor (consulta las tablas)

