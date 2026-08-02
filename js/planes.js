// ============================================================
// planes.js — Manejo de checkout en la página de planes
// ============================================================

async function checkout(email, plan, btn) {
  try {
    btn.disabled = true;
    btn.textContent = "Procesando...";

    const response = await fetch("/.netlify/functions/create-signup-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), plan })
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      alert(data.error || "Error al iniciar el pago");
      btn.disabled = false;
      btn.textContent = "Seleccionar plan";
      return;
    }

    // Redirigir a Stripe Checkout
    window.location.href = data.url;
  } catch (e) {
    alert("Error: " + e.message);
    btn.disabled = false;
    btn.textContent = "Seleccionar plan";
  }
}

// Agregar event listeners a los botones de planes
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[data-plan]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const planType = btn.getAttribute("data-plan");
      const email = prompt("Ingresa tu correo electrónico:", "");
      if (!email) return;

      if (!email.includes("@")) {
        alert("Por favor ingresa un email válido");
        return;
      }

      checkout(email, planType, btn);
    });
  });
});
