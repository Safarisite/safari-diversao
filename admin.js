(() => {
  "use strict";
  const cfg = window.SAFARI_SUPABASE || {};
  const configured = Boolean(cfg.url && cfg.anonKey && !cfg.url.includes("COLE_AQUI") && !cfg.anonKey.includes("COLE_AQUI"));
  const db = configured && window.supabase ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  const loginView = document.getElementById("loginView");
  const dashboardView = document.getElementById("dashboardView");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const ticketList = document.getElementById("ticketList");
  const ticketContent = document.getElementById("ticketContent");
  const emptyState = document.getElementById("ticketEmptyState");
  const searchInput = document.getElementById("ticketSearch");
  const statusFilter = document.getElementById("statusFilter");
  let tickets = [];
  let activeTicket = null;

  if (!configured) { loginMessage.textContent = "Sistema interno indisponível no momento."; loginForm.querySelector("button").disabled = true; }

  const labels = { recebido:"Recebido", em_analise:"Em análise", aguardando_cliente:"Aguardando cliente", respondido:"Respondido", encerrado:"Encerrado" };
  const fmt = (v, time=false) => v ? new Intl.DateTimeFormat("pt-BR", time?{dateStyle:"short",timeStyle:"short"}:{dateStyle:"short"}).format(new Date(v.length===10?`${v}T12:00:00`:v)) : "Não informada";
  const esc = (v) => String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

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
    loginView.hidden = true; dashboardView.hidden = false;
    document.getElementById("adminUserEmail").textContent = session.user.email || "Usuário";
    await loadTickets();
  }

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault(); if (!db) return;
    loginMessage.textContent = "Entrando...";
    const { data, error } = await db.auth.signInWithPassword({ email: document.getElementById("loginEmail").value.trim(), password: document.getElementById("loginPassword").value });
    if (error) { loginMessage.textContent = "E-mail ou senha inválidos."; return; }
    loginMessage.textContent = ""; await openDashboard(data.session);
  });

  document.getElementById("logoutButton")?.addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });

  async function loadTickets() {
    ticketList.innerHTML = '<p class="ticket-list-empty">Carregando chamados...</p>';
    const { data, error } = await db.from("sac_tickets").select("*").order("created_at", { ascending:false }).limit(500);
    if (error) { ticketList.innerHTML = '<p class="ticket-list-empty">Erro ao carregar chamados.</p>'; console.error(error); return; }
    tickets = data || []; updateCounts(); renderTicketList();
    if (activeTicket) { const updated=tickets.find(t=>t.id===activeTicket.id); if(updated) await openTicket(updated.id); }
  }

  function updateCounts(){
    document.getElementById("countTotal").textContent=tickets.length;
    document.getElementById("countReceived").textContent=tickets.filter(t=>t.status==="recebido").length;
    document.getElementById("countAnalysis").textContent=tickets.filter(t=>t.status==="em_analise").length;
    document.getElementById("countWaiting").textContent=tickets.filter(t=>t.status==="aguardando_cliente").length;
    document.getElementById("countAnswered").textContent=tickets.filter(t=>t.status==="respondido").length;
  }

  function filteredTickets(){
    const q=(searchInput.value||"").toLowerCase().trim(), status=statusFilter.value;
    return tickets.filter(t=>(!status||t.status===status)&&(!q||[t.protocol,t.location,t.category,t.customer_name,t.customer_email].some(v=>String(v||"").toLowerCase().includes(q))));
  }

  function renderTicketList(){
    const list=filteredTickets();
    ticketList.innerHTML=list.length?list.map(t=>`<button class="ticket-row ${activeTicket?.id===t.id?'active':''}" data-ticket-id="${t.id}" type="button"><div class="ticket-row-top"><strong>${esc(t.protocol)}</strong><span class="ticket-row-status">${labels[t.status]||t.status}</span></div><h3>${esc(t.category)}</h3><p>${esc(t.location)}</p><small>${fmt(t.created_at,true)} • ${t.rating}/5</small></button>`).join(""):'<p class="ticket-list-empty">Nenhum chamado encontrado.</p>';
  }

  ticketList?.addEventListener("click",e=>{const b=e.target.closest("[data-ticket-id]");if(b)openTicket(b.dataset.ticketId);});
  searchInput?.addEventListener("input",renderTicketList); statusFilter?.addEventListener("change",renderTicketList);
  document.getElementById("refreshTickets")?.addEventListener("click",loadTickets);

  async function openTicket(id){
    const ticket=tickets.find(t=>t.id===id); if(!ticket)return; activeTicket=ticket; renderTicketList();
    const { data:messages,error }=await db.from("sac_messages").select("*").eq("ticket_id",id).order("created_at",{ascending:true});
    if(error){console.error(error);return;}
    emptyState.hidden=true; ticketContent.hidden=false;
    document.getElementById("detailProtocol").textContent=ticket.protocol;
    document.getElementById("detailCategory").textContent=ticket.category;
    document.getElementById("detailLocation").textContent=ticket.location;
    document.getElementById("detailName").textContent=ticket.customer_name||"Não informado";
    document.getElementById("detailEmail").textContent=ticket.customer_email;
    const ratingEl=document.getElementById("detailRating"); ratingEl.textContent=`${"★".repeat(ticket.rating)} (${ticket.rating}/5)`; ratingEl.className=ticket.rating<=2?"admin-rating-low":ticket.rating>=4?"admin-rating-high":"";
    document.getElementById("detailVisitDate").textContent=fmt(ticket.visit_date);
    document.getElementById("detailCreated").textContent=fmt(ticket.created_at,true);
    document.getElementById("detailMessage").textContent=ticket.message;
    document.getElementById("detailStatus").value=ticket.status;
    document.getElementById("detailMessages").innerHTML=(messages||[]).length?(messages||[]).map(m=>`<div class="admin-thread-message ${m.sender_type==='staff'?'staff':'customer'}"><div><strong>${m.sender_type==='staff'?'Equipe Safári':'Cliente'}</strong><small>${fmt(m.created_at,true)}</small></div><p>${esc(m.body)}</p></div>`).join(""):'<p class="ticket-list-empty">Ainda não há mensagens adicionais.</p>';
  }

  document.getElementById("detailStatus")?.addEventListener("change",async(e)=>{
    if(!activeTicket)return; const status=e.target.value;
    const {error}=await db.from("sac_tickets").update({status}).eq("id",activeTicket.id);
    if(error){alert("Não foi possível alterar o status.");return;} activeTicket.status=status; await loadTickets();
  });

  document.getElementById("staffReplyForm")?.addEventListener("submit",async(e)=>{
    e.preventDefault(); if(!activeTicket)return;
    const body=document.getElementById("staffReplyBody").value.trim(); if(!body)return;
    const button=e.currentTarget.querySelector("button"), msg=document.getElementById("replyMessage"), nextStatus=document.getElementById("statusAfterReply").value;
    button.disabled=true;button.textContent="Enviando...";msg.textContent="";
    const session=(await db.auth.getSession()).data.session;
    const {error:insertError}=await db.from("sac_messages").insert({ticket_id:activeTicket.id,sender_type:"staff",sender_name:session?.user?.email||"Equipe Safári",body});
    if(insertError){button.disabled=false;button.textContent="Enviar resposta";msg.textContent="Não foi possível enviar a resposta.";console.error(insertError);return;}
    const {error:updateError}=await db.from("sac_tickets").update({status:nextStatus}).eq("id",activeTicket.id);
    button.disabled=false;button.textContent="Enviar resposta";
    if(updateError){msg.textContent="Resposta salva, mas o status não foi atualizado.";console.error(updateError);}
    else msg.textContent="Resposta registrada com sucesso.";
    document.getElementById("staffReplyBody").value=""; await loadTickets();
  });

  (async()=>{ if(!db)return; const {data}=await db.auth.getSession(); if(data.session) await openDashboard(data.session); })();
})();
