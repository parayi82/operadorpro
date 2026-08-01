# 🧪 Plan de Pruebas - Bot de Telegram OperadorPro

## Resumen Ejecutivo

Este documento detalla el plan de pruebas QA para el bot de Telegram integrado en OperadorPro. Incluye casos de uso reales de conductores, criterios de aceptación y métricas de éxito.

---

## 📊 Scope de Pruebas

### Componentes Incluidos
- ✅ Autenticación Telegram ↔ OperadorPro
- ✅ Flujos conversacionales (inspección, viaje, gasto)
- ✅ Carga de fotos a Supabase Storage
- ✅ Persistencia de estado en BD
- ✅ Integración con módulo de flota

### Componentes Excluidos (Fase 2)
- ❌ Mobile app offline (será future companion app)
- ❌ Integración con WhatsApp Business
- ❌ Notificaciones push

---

## 🎯 Casos de Prueba

### TC-1: Autenticación Básica

**Descripción:** Usuario se autentica en Telegram usando código de la app web

**Precondiciones:**
- Usuario registrado en OperadorPro
- Empresa con al menos 1 miembro activo
- Bot configurado en Netlify

**Pasos:**
1. Usuario abre app web → Perfil → Telegram
2. Click "Generar código para Telegram"
3. Copia código de 6 dígitos
4. Abre Telegram, busca bot, escribe `/start`
5. Bot responde con instrucciones
6. Usuario escribe `/auth 123456`
7. Bot confirma: "✅ ¡Cuenta vinculada!"

**Resultado Esperado:**
- ✅ Código mostrado en app web
- ✅ Bot responde a `/start`
- ✅ Bot acepta `/auth` con código válido
- ✅ Perfil muestra "Vinculado a Telegram"
- ✅ Base de datos: `telegram_sessions` tiene registro

**Criterios de Aceptación:**
- Código válido por exactamente 15 minutos
- Código expira después de 15 min (rechazo con "/auth")
- Un usuario solo puede tener 1 sesión activa por empresa

---

### TC-2: Rechazo de Código Inválido

**Descripción:** Código expirado o incorrecto es rechazado

**Pasos:**
1. Usuario tira su código válido (o espera 16 minutos)
2. Escribe `/auth 999999` (código falso)
3. Bot rechaza

**Resultado Esperado:**
- ❌ "Código inválido o expirado"
- ✅ No se crea sesión
- ✅ Usuario sigue sin autenticar

**Criterios de Aceptación:**
- Error message es claro (no expone detalles de BD)

---

### TC-3: Flujo Inspección - Paso a Paso

**Descripción:** Conductor completa inspección pre-viaje con fotos

**Precondiciones:**
- Usuario autenticado en Telegram
- Empresa tiene 1+ vehículos
- Vehículo tiene número económico (ej. "001")

**Pasos:**

3.1 Iniciar inspección
- User: `1` (or button 🔍)
- Expected: "Selecciona unidad (economico):"

3.2 Seleccionar vehículo
- User: `001`
- Expected: "Unidad 001 seleccionada.\nEnvia 5 fotos..."

3.3 Enviar fotos (5)
- User: [Photo 1]
- Expected: "Fotos recibidas: 1"
- Repeat 4x

3.4 Finalizar fotos
- User: `listo`
- Expected: "Ahora ingresa kilometraje..."

3.5 Ingresar kilometraje
- User: `125450`
- Expected: "Responde checklist (10 items)..."

3.6 Completar checklist
- User: `SSSSSNSSSSN` (10 chars)
- Expected: "Inspeccion completada (5 fotos)"

**Resultado Esperado:**
- ✅ Inspección creada en DB
- ✅ 5 fotos subidas a Storage
- ✅ 10 items de checklist guardados
- ✅ Visible en Flota > Inspecciones (app web)

**Criterios de Aceptación:**
- Fotos generan URLs firmadas válidas por 365 días
- Cada foto asociada a tipo correcto (frente, llantas, motor, etc.)
- Checklist items con valores correctos (S=true, N=false)

---

### TC-4: Flujo Inspección - Casos Edge

**TC-4a: Sin fotos (usuario dice "sin fotos")**
- User: selecciona unidad → escribe "sin fotos"
- Expected: Salta a kilometraje (omite foto)
- Result: ✅ Inspección sin fotos se crea

**TC-4b: Número económico inválido**
- User: `999` (no existe)
- Expected: "No encontre unidad. Intenta de nuevo:"
- Result: ✅ No avanza, pide reintentar

**TC-4c: Checklist incompleto**
- User: `SSSSS` (solo 5 chars en lugar de 10)
- Expected: "Escribe 10 caracteres (S o N)"
- Result: ✅ Rechaza, pide reintentar

**TC-4d: Cancelar en mitad de flujo**
- User: en paso 2 (fotos), escribe `/start`
- Expected: Vuelve al menú principal, limpia estado
- Result: ✅ Conversación reset correctamente

---

### TC-5: Flujo Viaje Completo

**Descripción:** Crear viaje con origen, destino, presupuesto

**Pasos:**
1. User: `2` → Bot: "Escribe origen"
2. User: `Guadalajara, Jal` → Bot: "Escribe destino"
3. User: `Mexico CDMX` → Bot: "Presupuesto (MXN)"
4. User: `5000` → Bot: "Viaje iniciado"

**Resultado Esperado:**
- ✅ Viaje creado en DB (status: "abierto")
- ✅ Presupuesto: $5,000 MXN
- ✅ Visible en Flota > Viajes

**Criterios de Aceptación:**
- Origen y destino sin validación (texto libre)
- Presupuesto debe ser número positivo
- Presupuesto rechaza valores <= 0 o no-numéricos

---

### TC-6: Flujo Gasto Completo

**Descripción:** Reportar gasto de viaje con categoría, monto y recibo

**Precondiciones:**
- Viaje activo (de TC-5)
- ID del viaje disponible

**Pasos:**
1. User: `3` → Bot: "ID del viaje?"
2. User: `<trip-uuid>` → Bot: "Categoria?"
3. User: `diesel` → Bot: "Monto (MXN)?"
4. User: `450.50` → Bot: "Foto recibo?"
5. User: [Photo] → Bot: "Gasto registrado"

**Resultado Esperado:**
- ✅ Gasto creado en DB
- ✅ Foto subida a Storage (receipt)
- ✅ Monto exacto: $450.50
- ✅ Categoría: "diesel"
- ✅ Status: "pendiente" (revisión)

**Criterios de Aceptación:**
- Categorías válidas: diesel, caseta, comida, taller, otro
- Monto rechaza valores <= 0
- Foto es opcional (acepta "sin foto")

---

### TC-7: Flujo Estado Documentos

**Descripción:** Ver estado de vencimiento de documentos

**Pasos:**
1. User: `4` (o button 📋)
2. Bot responde con lista de documentos

**Resultado Esperado:**
- 🟢 Documentos vigentes: "Licencia Federal: Vigente (vence 25-AGO-2025)"
- 🟡 Por vencer (< 30 días): "Tarjeta Circulacion: Por vencer (15 días)"
- 🔴 Vencidos: "Verificacion: Vencida (refresca urgente)"

**Criterios de Aceptación:**
- Estados coinciden con BD (compliance_status_v)
- Colores/emojis son correctos
- Fechas están actualizadas

---

### TC-8: Persistencia de Estado Conversacional

**Descripción:** Usuario retoma flujo donde lo dejó

**Pasos:**
1. User: inicia inspección (1)
2. User: selecciona vehículo
3. User: envía 2 fotos
4. User: CIERRA Telegram (without finishing flow)
5. [Espera 10 minutos]
6. User: ABRE Telegram nuevamente
7. User: envía foto 3
8. Bot debería: "Fotos recibidas: 3"

**Resultado Esperado:**
- ✅ Estado se mantiene en DB
- ✅ Número de foto es correcto
- ✅ Usuario puede continuar donde dejó

**Criterios de Aceptación:**
- telegram_conversation_state tiene registro con flow_type="inspection"
- context guarda { photos: [...], vehicle_id, ... }

---

### TC-9: Rate Limiting

**Descripción:** Evitar abuso de generación de códigos

**Pasos:**
1. User: genera código (genera 10 códigos en < 1 minuto)
2. User: intenta generar el código 11

**Resultado Esperado:**
- ❌ "Demasiadas solicitudes. Intenta en 1 minuto"

**Criterios de Aceptación:**
- Límite configurado: 10 códigos por minuto por IP
- Mensaje de error es user-friendly

---

### TC-10: Seguridad - RLS en BD

**Descripción:** Un usuario no puede ver sesiones/fotos de otro usuario

**Setup:**
- Crear 2 usuarios diferentes
- Autenticar ambos en Telegram
- Usuario A crea inspección

**Verificación en BD:**
```sql
-- Como usuario B, intenta:
select * from telegram_sessions where user_id != auth.uid();
-- Esperado: ❌ 0 filas (RLS bloquea)
```

**Criterios de Aceptación:**
- RLS policies están habilitadas
- Usuarios solo ven sus propios registros

---

## 📱 Escenarios de Uso Real

### Escenario 1: Inicio de Jornada
1. Chofer 6am: genera código en app web
2. 6:15am: abre Telegram, autentica con código
3. 6:20am: hace inspección pre-viaje (5 fotos + checklist)
4. 6:30am: ve estado de documentos
5. 7:00am: crea viaje (Guadalajara → Mexico)

**Métricas de éxito:**
- ✅ Todo ocurrió en < 1 hora
- ✅ Fotos claras y almacenadas
- ✅ Viaje aparece en app web en tiempo real

---

### Escenario 2: Gestión de Gastos en Ruta
1. Chofer está en ruta (viaje abierto)
2. Llena combustible: reporta gasto diesel ($450)
3. Come: reporta gasto comida ($120)
4. Paga caseta: reporta gasto caseta ($250)
5. Toma foto de cada recibo

**Métricas de éxito:**
- ✅ 3 gastos creados
- ✅ 3 fotos en Storage
- ✅ Total gastos: $820 < Presupuesto ($5000)
- ✅ Gastos visibles en app web

---

### Escenario 3: Flujo Offline (Conceptual)

> Nota: Bot de Telegram REQUIERE internet. Este escenario será para mobile app companion.

1. Chofer en zona sin señal
2. Captura datos localmente en mobile app
3. Al reconectar: sync automático via telegram-sync-queue

---

## ✅ Criterios de Aceptación Global

| Criterio | Esperado | Actual |
|----------|----------|--------|
| **Disponibilidad** | Bot responde en < 2s | ⏳ TBD |
| **Autenticación** | Código válido 15 min | ⏳ TBD |
| **Inspecciones** | Fotos se guardan en Storage | ⏳ TBD |
| **Viajes** | Se crean con presupuesto | ⏳ TBD |
| **Gastos** | Se registran con fotos | ⏳ TBD |
| **Estado** | Muestra docs vencidos | ⏳ TBD |
| **Seguridad RLS** | Usuarios no ven otros datos | ⏳ TBD |
| **Rate Limit** | Protege contra abuso | ⏳ TBD |
| **Errores** | Mensajes claros y útiles | ⏳ TBD |
| **Documentación** | Setup guide complete | ✅ PASS |

---

## 📋 Ejecución de Pruebas

### Equipo Requerido
- [ ] 2-3 probadores con cuenta OperadorPro
- [ ] 1 administrador para validar en BD
- [ ] Acceso a Supabase Dashboard
- [ ] Acceso a Netlify Dashboard

### Ambiente
- [ ] Staging o desarrollo con datos reales
- [ ] Bot vinculado a cuenta test de Telegram
- [ ] Empresa test con 2+ vehículos

### Duración Estimada
- Preparación: 30 min
- Ejecución de todos los TC: 2-3 horas
- Análisis y reporte: 1 hora
- **Total: 4 horas**

---

## 📝 Reporte de Resultados

Después de completar las pruebas, llenar esta tabla:

```markdown
## Resultados de Pruebas - Bot Telegram

**Fecha:** 2026-08-XX
**Probadores:** [nombres]
**Ambiente:** Staging

### Resumen
- Casos Totales: 10
- Pasados: ?
- Fallidos: ?
- Bloqueadores: ?

### Detalles

| TC | Caso | Resultado | Notas |
|----|------|-----------|-------|
| 1 | Autenticación | PASS/FAIL | ... |
| 2 | Código inválido | PASS/FAIL | ... |
| ... | ... | ... | ... |

### Conclusión
[✅ LISTO PARA PRODUCCIÓN / ❌ REQUIERE FIXES]
```

---

## 🔄 Sign-Off

- [ ] QA Lead: _________________ Fecha: _______
- [ ] Dev Lead: _________________ Fecha: _______
- [ ] Product Manager: __________ Fecha: _______

