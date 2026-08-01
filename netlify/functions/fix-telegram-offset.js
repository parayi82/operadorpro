// ============================================================
// fix-telegram-offset.js — Utility to reset polling offset
// to current Telegram API state, preventing duplicate messages
// ============================================================

const https = require("https");
const { createClient } = require("@supabase/supabase-js");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function getLatestUpdate() {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=1&timeout=0`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok && parsed.result.length > 0) {
            resolve(parsed.result[0].update_id);
          } else {
            resolve(0);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");

    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("DEBUG: Obteniendo latest update ID de Telegram API");
    const latestUpdateId = await getLatestUpdate();
    console.log("DEBUG: Latest update ID:", latestUpdateId);

    if (latestUpdateId === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          message: "No updates found in Telegram API",
          latestUpdateId
        })
      };
    }

    console.log("DEBUG: Actualizando telegram_poll_state a offset:", latestUpdateId + 1);

    // Get or create the state
    const { data: existing, error: getErr } = await admin
      .from("telegram_poll_state")
      .select("*");

    if (getErr && getErr.code !== "PGRST116") {
      throw getErr;
    }

    if (!existing || existing.length === 0) {
      // Create if doesn't exist
      const { data: created, error: createErr } = await admin
        .from("telegram_poll_state")
        .insert({ last_update_id: latestUpdateId, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (createErr) throw createErr;

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          message: "Created telegram_poll_state and set offset",
          oldOffset: 0,
          newOffset: latestUpdateId,
          result: created
        })
      };
    } else {
      // Update existing
      const oldOffset = existing[0].last_update_id;
      const { data: updated, error: updateErr } = await admin
        .from("telegram_poll_state")
        .update({ last_update_id: latestUpdateId, updated_at: new Date().toISOString() })
        .eq("id", existing[0].id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          message: "Updated telegram_poll_state offset",
          oldOffset,
          newOffset: latestUpdateId,
          result: updated
        })
      };
    }
  } catch (e) {
    console.error("ERROR in fix-telegram-offset:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
