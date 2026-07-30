// ============================================================
// fleet-upload-compliance-doc.js — Registra un documento de
// cumplimiento (licencia, póliza, tarjeta de circulación, etc.) y
// programa sus 3 recordatorios (30/15/5 días) en una sola transacción
// vía la función de Postgres fn_create_compliance_document.
//
// El archivo en sí (PDF/foto) se sube antes desde el frontend
// directo a Supabase Storage (bucket privado "compliance-docs") con
// el JWT del usuario; aquí solo se registra la URL resultante.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");
const { invalidate } = require("./_lib/cache");

exports.handler = withHandler(
  { name: "fleet-upload-compliance-doc", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createComplianceDoc, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const { data, error } = await admin.rpc("fn_create_compliance_document", {
      p_company_id: input.company_id,
      p_vehicle_id: input.vehicle_id || null,
      p_driver_id: input.driver_id || null,
      p_doc_type: input.doc_type,
      p_doc_number: input.doc_number || null,
      p_file_url: input.file_url,
      p_issued_at: input.issued_at || null,
      p_expires_at: input.expires_at
    });

    if (error) throw error;
    await invalidate(`fleet:${input.company_id}:dashboard`);
    return created({ document: data });
  }
);
