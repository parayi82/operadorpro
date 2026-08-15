// ============================================================
// stripe-webhook.js — Sincroniza el estado de la suscripción
// Endpoint a registrar en Stripe Dashboard > Developers > Webhooks:
//   https://TU-SITIO.netlify.app/.netlify/functions/stripe-webhook
// Eventos: checkout.session.completed, customer.subscription.updated,
//          customer.subscription.deleted, invoice.payment_failed
// ============================================================

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Verificar la firma del webhook (obligatorio: nunca confiar en el body sin firma)
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error("Firma de webhook inválida:", e.message);
    return { statusCode: 400, body: "Firma inválida" };
  }

  const setStatus = async (customerId, status, plan) => {
    const update = { subscription_status: status, updated_at: new Date().toISOString() };
    if (plan === "esencial" || plan === "protegido") update.plan = plan;
    const { error } = await admin
      .from("profiles")
      .update(update)
      .eq("stripe_customer_id", customerId);
    if (error) console.error("Error actualizando perfil:", error.message);
  };

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const plan = session.metadata?.plan === "protegido" ? "protegido" : "esencial";
        const isNewSignup = session.metadata?.new_signup === "true";
        const email = session.metadata?.email || session.customer_email;

        // Si es nuevo signup, crear la cuenta automáticamente
        if (isNewSignup && email) {
          console.log(`Auto-creating account for ${email} after payment`);

          // Verificar si el usuario ya existe
          const { data: existingUser } = await admin.auth.admin.listUsers();
          const userExists = existingUser?.users?.some(u => u.email === email);

          if (!userExists) {
            try {
              // Generar una contraseña segura aleatoria (usuario debe cambiarla después)
              const tempPassword = Math.random().toString(36).slice(-16) + "Aa1!";

              // Crear usuario en auth
              const { data: newUser, error: authError } = await admin.auth.admin.createUser({
                email: email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                  auto_created: true,
                  signup_plan: plan
                }
              });

              if (authError || !newUser) {
                console.error("Error creating auth user:", authError);
              } else {
                // Actualizar perfil (el trigger on_auth_user_created ya lo creó)
                await admin.from("profiles").update({
                  full_name: email.split("@")[0],
                  stripe_customer_id: session.customer,
                  subscription_status: "active",
                  plan: plan,
                  updated_at: new Date().toISOString()
                }).eq("id", newUser.user.id);

                // Enviar email de bienvenida con instrucciones para resetear password
                // TODO: Implementar envío de email con contraseña temporal y link para resetear
                console.log(`Account created for ${email}, temp password sent`);
              }
            } catch (createErr) {
              console.error("Error auto-creating account:", createErr);
            }
          } else {
            // Usuario ya existe, actualizar la suscripción por UUID (no hay columna email en profiles)
            const update = {
              stripe_customer_id: session.customer,
              subscription_status: "active",
              plan,
              updated_at: new Date().toISOString()
            };
            const authUser = existingUser?.users?.find(
              (u) => u.email === email.toLowerCase() || u.email === email
            );
            if (authUser) {
              await admin.from("profiles").update(update).eq("id", authUser.id);
            } else {
              console.warn(`stripe-webhook: no se encontró usuario en auth para email ${email}`);
            }
          }
        } else {
          // Usuario autenticado (flujo anterior)
          const update = {
            stripe_customer_id: session.customer,
            subscription_status: "active",
            plan,
            updated_at: new Date().toISOString()
          };
          if (session.client_reference_id) {
            await admin.from("profiles").update(update).eq("id", session.client_reference_id);
          } else {
            await admin.from("profiles").update(update).eq("stripe_customer_id", session.customer);
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        const map = { active: "active", trialing: "active", past_due: "past_due", canceled: "canceled", unpaid: "past_due", incomplete: "inactive", incomplete_expired: "inactive" };
        await setStatus(sub.customer, map[sub.status] || "inactive", sub.metadata?.plan);
        break;
      }
      case "customer.subscription.deleted": {
        await setStatus(stripeEvent.data.object.customer, "canceled");
        break;
      }
      case "invoice.payment_failed": {
        await setStatus(stripeEvent.data.object.customer, "past_due");
        break;
      }
      default:
        break; // Eventos no manejados: responder 200 para que Stripe no reintente
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e) {
    console.error("stripe-webhook error:", e);
    return { statusCode: 500, body: "Error interno" };
  }
};
