(() => {
  "use strict";

  const cfg = window.SAFARI_SUPABASE || {};
  const configured = Boolean(cfg.url && cfg.anonKey && !cfg.url.includes("COLE_AQUI") && !cfg.anonKey.includes("COLE_AQUI"));
  const db = configured && window.supabase ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  const loginView = document.getElementById("loginView");
  const dashboardView = document.getElementById("dashboardView");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const workspace = document.getElementById("adminWorkspace");
  const ticketList = document.getElementById("ticketList");
  const ticketContent = document.getElementById("ticketContent");
  const ticketDetail = document.getElementById("ticketDetail");
  const emptyState = document.getElementById("ticketEmptyState");
  const searchInput = document.getElementById("ticketSearch");
  const statusFilter = document.getElementById("statusFilter");
  const startServiceButton = document.getElementById("startServiceButton");
  const detailStatus = document.getElementById("detailStatus");
  const detailStatusPill = document.getElementById("detailStatusPill");
  const ticketListCount = document.getElementById("ticketListCount");

  let tickets = [];
  let activeTicket = null;

  if (!configured) {
    loginMessage.textContent = "Sistema interno indisponível no momento.";
    loginForm?.querySelector("button")?.setAttribute("disabled", "disabled");
  }

  const labels = {
    recebido: "Novo",
    em_analise: "Em atendimento",
    aguardando_cliente: "Aguardando cliente",
    respondido: "Respondido",
    encerrado: "Encerrado"
  };

  const fmt = (v, time = false) => v
    ? new Intl.DateTimeFormat("pt-BR", time ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(new Date(v.length === 10 ? `${v}T12:00:00` : v))
    : "Não informada";

  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));

  const phoneDigits = (value) => String(value || "").replace(/\D/g, "");
  const formatPhone = (value) => {
    const d = phoneDigits(value);
    const local = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;
    if (local.length === 11) return `(${local.slice(0,2)}) ${local.slice(2,7)}-${local.slice(7)}`;
    if (local.length === 10) return `(${local.slice(0,2)}) ${local.slice(2,6)}-${local.slice(6)}`;
    return value || "Não informado";
  };
  const whatsappNumber = (value) => {
    const d = phoneDigits(value);
    if (!d) return "";
    return d.length <= 11 ? `55${d}` : d;
  };

  async function isStaff() {
    const { data, error } = await db.rpc("is_sac_staff");
    return !error && data === true;
  }

  async function openDashboard(session) {
    if (!(await isStaff())) {
      await db.auth.signOut();
      loginMessage.textContent = "Este usuário não possui acesso ao painel do SAC.";
      return;
    }

    loginView.hidden = true;
    dashboardView.hidden = false;
    document.getElementById("adminUserEmail").textContent = session.user.email || "Usuário";
    await loadTickets();
  }

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!db) return;
    loginMessage.textContent = "Entrando...";

    const { data, error } = await db.auth.signInWithPassword({
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value
    });

    if (error) {
      loginMessage.textContent = "E-mail ou senha inválidos.";
      return;
    }

    loginMessage.textContent = "";
    await openDashboard(data.session);
  });

  document.getElementById("logoutButton")?.addEventListener("click", async () => {
    await db.auth.signOut();
    location.reload();
  });

  async function loadTickets() {
    ticketList.innerHTML = '<p class="ticket-list-empty">Carregando chamados...</p>';

    const { data, error } = await db
      .from("sac_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      ticketList.innerHTML = '<p class="ticket-list-empty">Erro ao carregar chamados.</p>';
      console.error(error);
      return;
    }

    tickets = data || [];
    updateCounts();
    renderTicketList();

    if (activeTicket) {
      const updated = tickets.find((t) => t.id === activeTicket.id);
      if (updated) await openTicket(updated.id, false);
    }
  }

  function updateCounts() {
    document.getElementById("countTotal").textContent = tickets.length;
    document.getElementById("countReceived").textContent = tickets.filter((t) => t.status === "recebido").length;
    document.getElementById("countAnalysis").textContent = tickets.filter((t) => t.status === "em_analise").length;
    document.getElementById("countWaiting").textContent = tickets.filter((t) => t.status === "aguardando_cliente").length;
    document.getElementById("countAnswered").textContent = tickets.filter((t) => t.status === "respondido").length;
  }

  function filteredTickets() {
    const q = (searchInput.value || "").toLowerCase().trim();
    const status = statusFilter.value;

    return tickets.filter((t) =>
      (!status || t.status === status) &&
      (!q || [t.protocol, t.location, t.category, t.customer_name, t.customer_email]
        .some((v) => String(v || "").toLowerCase().includes(q)))
    );
  }

  function renderTicketList() {
    const list = filteredTickets();
    ticketListCount.textContent = list.length;

    ticketList.innerHTML = list.length
      ? list.map((t) => `
        <button class="ticket-row ${activeTicket?.id === t.id ? "active" : ""}" data-ticket-id="${t.id}" data-status="${esc(t.status)}" type="button">
          <div class="ticket-row-top">
            <strong>${esc(t.protocol)}</strong>
            <span class="ticket-row-status">${labels[t.status] || esc(t.status)}</span>
          </div>
          <h3>${esc(t.category)}</h3>
          <p>${esc(t.customer_name || "Cliente não identificado")} • ${esc(t.location)}</p>
          <small>${fmt(t.created_at, true)} • ${t.rating}/5</small>
        </button>`).join("")
      : '<p class="ticket-list-empty">Nenhum chamado encontrado.</p>';
  }

  ticketList?.addEventListener("click", (e) => {
    const button = e.target.closest("[data-ticket-id]");
    if (button) openTicket(button.dataset.ticketId, true);
  });

  searchInput?.addEventListener("input", renderTicketList);
  statusFilter?.addEventListener("change", renderTicketList);
  document.getElementById("refreshTickets")?.addEventListener("click", loadTickets);

  function setDetailStatus(status) {
    detailStatus.value = status;
    detailStatusPill.textContent = labels[status] || status;
    detailStatusPill.dataset.status = status;
    startServiceButton.hidden = status !== "recebido";
  }

  async function openTicket(id, focusDetail = true) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;

    activeTicket = ticket;
    renderTicketList();

    const { data: messages, error } = await db
      .from("sac_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    emptyState.hidden = true;
    ticketContent.hidden = false;
    if (ticketDetail) ticketDetail.scrollTop = 0;

    document.getElementById("detailProtocol").textContent = ticket.protocol;
    document.getElementById("detailCategory").textContent = ticket.category;
    document.getElementById("detailLocation").textContent = ticket.location;
    document.getElementById("detailName").textContent = ticket.customer_name || "Não informado";
    document.getElementById("detailEmail").textContent = ticket.customer_email;

    const phone = ticket.customer_phone || "";
    const phoneEl = document.getElementById("detailPhone");
    const whatsappLink = document.getElementById("detailWhatsAppLink");
    const whatsappNote = document.getElementById("detailWhatsAppNote");
    phoneEl.textContent = phone ? formatPhone(phone) : "Não informado";
    if (phone && ticket.whatsapp_contact) {
      const waText = encodeURIComponent(`Olá! Aqui é do SAC da Safári Diversão. Estamos entrando em contato sobre o protocolo ${ticket.protocol}.`);
      whatsappLink.href = `https://wa.me/${whatsappNumber(phone)}?text=${waText}`;
      whatsappLink.hidden = false;
      whatsappNote.textContent = "Cliente autorizou contato por WhatsApp.";
    } else {
      whatsappLink.hidden = true;
      whatsappLink.removeAttribute("href");
      whatsappNote.textContent = phone ? "Cliente não marcou autorização para contato por WhatsApp." : "";
    }

    document.getElementById("detailVisitDate").textContent = fmt(ticket.visit_date);
    document.getElementById("detailCreated").textContent = fmt(ticket.created_at, true);
    document.getElementById("detailOriginalDate").textContent = fmt(ticket.created_at, true);
    document.getElementById("detailMessage").textContent = ticket.message;

    const ratingEl = document.getElementById("detailRating");
    ratingEl.textContent = `${"★".repeat(ticket.rating)} (${ticket.rating}/5)`;
    ratingEl.className = ticket.rating <= 2 ? "admin-rating-low" : ticket.rating >= 4 ? "admin-rating-high" : "";

    setDetailStatus(ticket.status);

    document.getElementById("detailMessages").innerHTML = (messages || []).length
      ? (messages || []).map((m) => `
        <div class="admin-thread-message ${m.sender_type === "staff" ? "staff" : "customer"}">
          <div>
            <strong>${m.sender_type === "staff" ? "SAC Safári" : "Cliente"}</strong>
            <small>${fmt(m.created_at, true)}</small>
          </div>
          <p>${esc(m.body)}</p>
        </div>`).join("")
      : '<p class="ticket-list-empty">Ainda não há outras mensagens neste atendimento.</p>';

    if (focusDetail && window.innerWidth <= 760) {
      workspace.classList.add("ticket-selected");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  document.getElementById("ticketBackButton")?.addEventListener("click", () => {
    workspace.classList.remove("ticket-selected");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) workspace.classList.remove("ticket-selected");
  });

  startServiceButton?.addEventListener("click", async () => {
    if (!activeTicket || activeTicket.status !== "recebido") return;

    startServiceButton.disabled = true;
    startServiceButton.textContent = "Iniciando...";

    const { error } = await db.from("sac_tickets").update({ status: "em_analise" }).eq("id", activeTicket.id);

    startServiceButton.disabled = false;
    startServiceButton.textContent = "Iniciar atendimento";

    if (error) {
      alert("Não foi possível iniciar o atendimento.");
      console.error(error);
      return;
    }

    activeTicket.status = "em_analise";
    await loadTickets();
  });

  detailStatus?.addEventListener("change", async (e) => {
    if (!activeTicket) return;

    const previous = activeTicket.status;
    const status = e.target.value;

    const { error } = await db.from("sac_tickets").update({ status }).eq("id", activeTicket.id);

    if (error) {
      alert("Não foi possível alterar o status.");
      e.target.value = previous;
      console.error(error);
      return;
    }

    activeTicket.status = status;
    setDetailStatus(status);
    await loadTickets();
  });

  document.getElementById("staffReplyForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeTicket) return;

    const body = document.getElementById("staffReplyBody").value.trim();
    if (!body) return;

    const button = e.currentTarget.querySelector("button[type='submit']");
    const msg = document.getElementById("replyMessage");
    const nextStatus = document.getElementById("statusAfterReply").value;

    button.disabled = true;
    button.textContent = "Enviando...";
    msg.textContent = "";

    const session = (await db.auth.getSession()).data.session;

    const { error: insertError } = await db.from("sac_messages").insert({
      ticket_id: activeTicket.id,
      sender_type: "staff",
      sender_name: session?.user?.email || "Equipe Safári",
      body
    });

    if (insertError) {
      button.disabled = false;
      button.textContent = "Enviar resposta ao cliente";
      msg.textContent = "Não foi possível enviar a resposta.";
      console.error(insertError);
      return;
    }

    const { error: updateError } = await db.from("sac_tickets").update({ status: nextStatus }).eq("id", activeTicket.id);

    button.disabled = false;
    button.textContent = "Enviar resposta ao cliente";

    if (updateError) {
      msg.textContent = "Resposta salva, mas o status não foi atualizado.";
      console.error(updateError);
    } else {
      msg.textContent = "Resposta enviada ao cliente com sucesso.";
    }

    document.getElementById("staffReplyBody").value = "";
    activeTicket.status = nextStatus;
    await loadTickets();
  });

  (async () => {
    if (!db) return;
    const { data } = await db.auth.getSession();
    if (data.session) await openDashboard(data.session);
  })();
})();
