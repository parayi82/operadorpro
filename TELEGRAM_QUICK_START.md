# ⚡ Quick Start - Bot de Telegram (5 min)

## Para Administradores

### 1️⃣ Ejecutar Migración (2 min)

1. Supabase Dashboard → SQL Editor → New Query
2. Copia todo de `supabase/migration_telegram.sql`
3. Click **Run**
4. ✅ Listo

### 2️⃣ Configurar Variables (2 min)

1. Telegram: busca @BotFather → `/newbot` → copia token
2. Netlify: Site settings → Environment variables
3. Agrega: `TELEGRAM_BOT_TOKEN=<token>`
4. Click **Trigger deploy**
5. ✅ Espera 2-3 min

### 3️⃣ Verificar (1 min)

- Abre Telegram, busca tu bot
- Escribe `/start`
- ✅ Responde "Bienvenido"

---

## Para Choferes

### Vincular Telegram

1. **App web:** Perfil → Telegram → "Generar código"
2. **Telegram:** Abre bot, `/auth <código>`
3. ✅ Vinculado

### Usar el Bot

- `1` → Inspección (5 fotos + checklist)
- `2` → Crear viaje (origen/destino/presupuesto)
- `3` → Gasto (ID viaje/categoría/monto/foto)
- `4` → Estado (documentos vencidos)
- `/start` → Menú principal

---

## 🆘 Si no funciona

| Problema | Solución |
|----------|----------|
| Bot no responde | Redeploy en Netlify |
| "No autenticado" | `/auth <código>` en Telegram |
| Inspección no se guarda | Verifica número económico exacto |
| Foto no sube | Revisa permisos Storage en Supabase |

---

## 📊 Validar en BD

```sql
-- ¿Está la sesión creada?
select count(*) from telegram_sessions;

-- ¿Se guardó la inspección?
select count(*) from inspections 
where driver_id = (select id from auth.users limit 1);

-- ¿Las fotos están en Storage?
-- Supabase > Storage > evidence > carpetas recientes
```

---

## 📞 Documentación Completa

- `TELEGRAM_SETUP_GUIDE.md` - Setup paso a paso
- `TELEGRAM_TEST_PLAN.md` - Test cases detallados
- `docs/TELEGRAM_BOT.md` - Documentación técnica
- `README.md` - Sección Telegram

