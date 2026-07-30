// ============================================================
// fleet-create-driver.js — Alta de chofer. Solo owner/admin.
// ============================================================

const { withHandler } = require("./_lib/handler");
const { requireCompanyRole } = require("./_lib/auth");
const { validate, parseJsonBody, schemas } = require("./_lib/validate");
const { created } = require("./_lib/response");

exports.handler = withHandler(
  { name: "fleet-create-driver", methods: ["POST"] },
  async ({ event, admin, user }) => {
    const input = validate(schemas.createDriver, parseJsonBody(event));
    await requireCompanyRole(admin, user.id, input.company_id, ["owner", "admin"]);

    const { data, error } = await admin.from("drivers").insert(input).select().single();
    if (error) throw error;
    return created({ driver: data });
  }
);
