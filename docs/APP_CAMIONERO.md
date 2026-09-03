# OperadorPro — La app del camionero

Enfoque del producto a partir de septiembre de 2026: OperadorPro deja de
presentarse como "plataforma de certificación con módulo de flota" y pasa a
ser **la app que el chofer, el hombre-camión y el pequeño flotero quieren
tener en el celular**, con una suscripción pequeña. Los cursos y
certificados siguen ahí, pero como un beneficio más, no como el centro.

## Para quién y qué le resuelve

| Persona | Cómo entra | Qué usa a diario |
|---|---|---|
| **Chofer de un patrón** | "Soy chofer de un patrón" + código de 6 letras + su celular | Viaje, gastos (foto opcional), cerrar con km, mandar resumen por WhatsApp, sus papeles, sus cursos |
| **Hombre-camión** | "Manejo mi propio camión" → placas + km, un formulario | Todo lo anterior + Mis cuentas (¿cuánto me quedó?), Mi camión (aceite/llantas), Me deben |
| **Pequeño flotero** | "Tengo varios camiones" → panel de flota + código de patrón | Panel de flota, dashboard, cobranza; sus choferes usan la app sin pagar |

## Pantallas (`app.html#/operador/...`)

| Ruta | Pantalla | Notas |
|---|---|---|
| `/operador` | Inicio | Onboarding la primera vez; viaje en curso con flete/gastado/va quedando; "esta semana"; alertas de papeles y mantenimiento |
| `/operador/alta` | Mi camión y yo | Alta express del hombre-camión (`fleet-setup-owner-operator`) |
| `/operador/unirme` | Entrar con mi patrón | Código + celular (`fleet-join-company`) |
| `/operador/codigo` | Código de patrón | Solo dueño (`fleet-invite-code`), botón WhatsApp |
| `/operador/viaje` | Viaje | Wizard: unidad → (chofer) → origen → destino → flete → km → confirmar. Con viaje activo: detalle + gastos |
| `/operador/cerrar` | Cerrar viaje | Km llegada, remisión firmada (opcional), flete si faltaba |
| `/operador/gasto` | Gasto | Categoría → monto (diésel: litros y odómetro) → foto opcional → confirmar |
| `/operador/cuentas` | Mis cuentas | Semana / mes / todo: me quedó, cobré, gasté, km, $/km, km/L, en qué se fue; WhatsApp |
| `/operador/cuentas/:id` | Cuentas del viaje | Detalle con gastos y evidencia; "poner a cobrar" |
| `/operador/papeles` | Mis papeles | Semáforo (perfil + documentos con archivo); el chofer sube los suyos |
| `/operador/camion` | Mi camión | Km actual, rendimiento, mantenimiento con "ya se hizo" |
| `/operador/cobranza` | Me deben | Por cobrar / vencido, "ya pagó", flete por cobrar en 4 campos |
| `/operador/auxilio` | Auxilio en carretera | 911 / 078 / 088 / 074 + aseguradora y patrón (localStorage), protocolo de percance. Funciona sin internet |
| `/operador/mas` | Más | Menú, sección "Soy el patrón", cambio de empresa, cerrar sesión |

## Reglas de negocio nuevas

- **Una suscripción cubre la empresa.** `requireActiveSubscription(admin, userId, companyId)`
  acepta al usuario con plan propio **o** miembro de una empresa cuyo dueño
  tiene plan activo. En el cliente: `hasAccess()` (`fn_company_has_access`).
  Los cursos/certificados siguen siendo por persona (`isSubscribed()`).
- **El chofer abre y cierra sus propios viajes** (`fleet-create-trip` acepta
  rol `driver` si `drivers.user_id` es él; `fn_close_trip_and_reconcile` igual).
- **Foto del ticket opcional** (`expenses.receipt_url` nullable). Diésel
  guarda `liters` y `odometer_km` → rendimiento km/L.
- **Flete y kilometraje en el viaje** (`trips.freight_amount`, `km_start`,
  `km_end`, `client_name`, `pod_url`). `trip_reconciliation_v` expone
  `profit_amount`, `diesel_amount`, `diesel_liters`, `distance_km`.
- **Odómetro de la unidad** (`vehicles.odometer_km`) se actualiza solo al
  abrir/cerrar viaje, cargar diésel o registrar un servicio.
- **Mantenimiento** (`maintenance_items`): cada N km y/o fecha límite.
  Estado `ok` / `pronto` (≤1,000 km o ≤15 días) / `vencido`.
- **Código de patrón** (`companies.invite_code`, 6 caracteres sin 0/O/1/I).
  El chofer entra con código + celular; si el patrón ya lo registró con ese
  celular se liga a su registro, si no se crea uno nuevo (el patrón lo ve
  en Flota y lo puede dar de baja).

Las fórmulas de cuentas viven en `netlify/functions/domain/trips.js`
(testeadas en `test/trips.test.js`) y están replicadas en
`js/operador-ui.js`; si cambia una, cambia la otra.

## Despliegue

1. Ejecutar `supabase/migrations/20260903_app_camionero.sql` en el SQL
   Editor de Supabase (idempotente). Instalaciones nuevas: `schema_fleet.sql`
   ya lo incluye.
2. Desplegar el sitio (Netlify). No hay variables de entorno nuevas.
3. Los precios/planes de Stripe no cambian (`esencial` / `protegido`); solo
   cambió cómo se presentan ("Camionero" / "Camionero Protegido").

## Lo que se dejó fuera a propósito

- Rastreo GPS continuo, telemetría, integración con ELD: la app es de
  captura simple; el GPS solo se usa (best-effort) en inspecciones.
- Timbrado de CFDI / Carta Porte desde la app: requiere PAC; se mantiene
  como documento adjunto y curso.
- Modo offline completo con cola de sincronización: el cascarón y Auxilio
  funcionan sin señal; guardar datos requiere internet (Telegram ya cubre
  el caso de captura diferida).
