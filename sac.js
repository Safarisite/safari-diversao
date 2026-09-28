(() => {
  "use strict";

  const config = window.SAFARI_SUPABASE || {};
  const configured = Boolean(config.url && config.anonKey && !config.url.includes("COLE_AQUI") && !config.anonKey.includes("COLE_AQUI"));
  const db = configured && window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;

  const form = document.getElementById("sacForm");
  const warning = document.getElementById("sacSystemWarning");
  const submitButton = document.getElementById("sacSubmitButton");
  const result = document.getElementById("sacResult");
  const resultProtocol = document.getElementById("sacResultProtocol");
  const resultCode = document.getElementById("sacResultCode");
  const copyButton = document.getElementById("sacCopyAccess");
  const charCount = document.getElementById("sacCharCount");
  const messageInput = document.getElementById("sacMessage");
  const ratingFieldset = document.querySelector(".sac-rating-fieldset");
  const lookupForm = document.getElementById("sacLookupForm");
  const lookupMessage = document.getElementById("sacLookupMessage");
  const ticketView = document.getElementById("sacTicketView");
  const customerReplyForm = document.getElementById("customerReplyForm");
  let activeLookup = null;

  if (!configured && warning) warning.hidden = false;
  if (!configured && submitButton) submitButton.disabled = true;

  const statusLabels = {
    recebido: "Recebido",
    em_analise: "Em análise",
    aguardando_cliente: "Aguardando você",
    respondido: "Respondido",
    encerrado: "Encerrado"
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const formatDate = (value, includeTime = false) => {
    if (!value) return "Não informada";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return new Intl.DateTimeFormat("pt-BR", includeTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(date);
  };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const setInvalid = (element, invalid) => element.closest(".sac-field")?.classList.toggle("is-invalid", invalid);

  function validateForm() {
    let valid = true;
    const rating = form.querySelector('input[name="rating"]:checked');
    ratingFieldset?.classList.toggle("is-invalid", !rating);
    if (!rating) valid = false;

    const location = document.getElementById("sacLocation");
    const type = document.getElementById("sacType");
    const message = document.getElementById("sacMessage");
    const email = document.getElementById("sacEmail");
    [location, type, message].forEach((el) => { const invalid = !el.value.trim(); setInvalid(el, invalid); if (invalid) valid = false; });
    const emailInvalid = !isValidEmail(email.value); setInvalid(email, emailInvalid); if (emailInvalid) valid = false;
    const consent = document.getElementById("sacConsent");
    consent.closest(".sac-checkbox-field")?.classList.toggle("is-invalid", !consent.checked);
    if (!consent.checked) valid = false;
    return valid;
  }

  messageInput?.addEventListener("input", () => { charCount.textContent = String(messageInput.value.length); });

  form?.addEventListener("input", (event) => {
    const el = event.target;
    if (el.matches("input,select,textarea")) setInvalid(el, el.required && !el.value.trim());
  });
  form?.addEventListener("change", () => ratingFieldset?.classList.remove("is-invalid"));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!db || !validateForm()) {
      form.querySelector(".is-invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (document.getElementById("companyWebsite").value) return;

    const rating = Number(form.querySelector('input[name="rating"]:checked').value);
    submitButton.disabled = true;
    submitButton.innerHTML = "Registrando...";

    const { data, error } = await db.rpc("create_sac_ticket", {
      p_rating: rating,
      p_location: document.getElementById("sacLocation").value.trim(),
      p_visit_date: document.getElementById("sacDate").value || null,
      p_category: document.getElementById("sacType").value,
      p_message: document.getElementById("sacMessage").value.trim(),
      p_customer_name: document.getElementById("sacName").value.trim() || null,
      p_customer_email: document.getElementById("sacEmail").value.trim(),
      p_wants_reply: document.getElementById("sacReply").checked
    });

    submitButton.disabled = false;
    submitButton.innerHTML = 'Registrar no SAC <span>→</span>';

    if (error) {
      alert("Não foi possível registrar agora. Tente novamente em alguns instantes.");
      console.error(error);
      return;
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (!record?.protocol || !record?.access_code) return;
    resultProtocol.textContent = record.protocol;
    resultCode.textContent = record.access_code;
    document.getElementById("lookupProtocol").value = record.protocol;
    document.getElementById("lookupCode").value = record.access_code;
    result.hidden = false;
    form.reset();
    charCount.textContent = "0";
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  copyButton?.addEventListener("click", async () => {
    const text = `Protocolo: ${resultProtocol.textContent}\nChave de acesso: ${resultCode.textContent}`;
    try { await navigator.clipboard.writeText(text); copyButton.textContent = "Copiado ✓"; setTimeout(() => copyButton.textContent = "Copiar protocolo e chave", 1600); }
    catch { alert(text); }
  });

  function renderTicket(ticket) {
    const status = statusLabels[ticket.status] || ticket.status;
    document.getElementById("ticketProtocol").textContent = ticket.protocol;
    const statusEl = document.getElementById("ticketStatus");
    statusEl.textContent = status;
    statusEl.dataset.status = ticket.status;
    document.getElementById("ticketMeta").innerHTML = [
      `<span><b>Avaliação</b>${"★".repeat(Number(ticket.rating))} (${ticket.rating}/5)</span>`,
      `<span><b>Local</b>${escapeHtml(ticket.location)}</span>`,
      `<span><b>Assunto</b>${escapeHtml(ticket.category)}</span>`,
      `<span><b>Data da visita</b>${formatDate(ticket.visit_date)}</span>`,
      `<span><b>Registrado em</b>${formatDate(ticket.created_at, true)}</span>`
    ].join("");
    document.getElementById("ticketOriginalMessage").textContent = ticket.message;

    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    document.getElementById("ticketMessages").innerHTML = messages.length ? messages.map((msg) => `
      <div class="sac-thread-message ${msg.sender_type === "staff" ? "from-staff" : "from-customer"}">
        <div><strong>${msg.sender_type === "staff" ? "SAC Safári" : "Você"}</strong><small>${formatDate(msg.created_at, true)}</small></div>
        <p>${escapeHtml(msg.body)}</p>
      </div>`).join("") : '<p class="sac-empty-thread">Ainda não há respostas adicionais neste chamado.</p>';

    customerReplyForm.hidden = ticket.status === "encerrado";
    ticketView.hidden = false;
  }

  async function lookupTicket() {
    if (!db) { lookupMessage.textContent = "O SAC está temporariamente indisponível. Tente novamente mais tarde."; return; }
    const protocol = document.getElementById("lookupProtocol").value.trim().toUpperCase();
    const code = document.getElementById("lookupCode").value.trim().toUpperCase();
    if (!protocol || !code) return;
    lookupMessage.textContent = "Consultando...";
    ticketView.hidden = true;
    const { data, error } = await db.rpc("get_sac_ticket", { p_protocol: protocol, p_access_code: code });
    if (error || !data) {
      activeLookup = null;
      lookupMessage.textContent = "Protocolo ou chave de acesso não encontrados.";
      return;
    }
    activeLookup = { protocol, code };
    lookupMessage.textContent = "";
    renderTicket(data);
  }

  lookupForm?.addEventListener("submit", async (event) => { event.preventDefault(); await lookupTicket(); });

  customerReplyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!db || !activeLookup) return;
    const body = document.getElementById("customerReplyBody").value.trim();
    if (!body) return;
    const button = customerReplyForm.querySelector("button");
    button.disabled = true; button.textContent = "Enviando...";
    const { data, error } = await db.rpc("customer_reply_sac_ticket", { p_protocol: activeLookup.protocol, p_access_code: activeLookup.code, p_body: body });
    button.disabled = false; button.textContent = "Enviar complemento";
    if (error || !data) { alert("Não foi possível enviar o complemento."); return; }
    document.getElementById("customerReplyBody").value = "";
    await lookupTicket();
  });
})();
