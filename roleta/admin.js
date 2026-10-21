
const STORAGE_KEY="roleta_safari_v8_config";
const CUSTOM_POOLS_KEY="roleta_safari_v8_custom_pools";
let config=null,selectedPrizeId=null,pendingCodes=[],fileCodes=[],online=false,isAdminUser=false,remoteCouponStats={};

const DEFAULT_PRIZES=[
{id:"nao-foi",enabled:true,label:"Não foi dessa vez",icon:"sad",color:"#7b3fd6",visualCopies:2,mode:"random",weight:15,intervals:[],blockFirst:0,minGap:0,allowOnRetry:false,retry:false,emoji:"☹",kicker:"QUASE!",title:"Não foi dessa vez",message:"Dessa vez não saiu prêmio, mas obrigado por participar da Roleta Safári!",prizeText:"ATÉ A PRÓXIMA!",pool:null,couponCount:0,futurePurchase:false},
{id:"tente-outra",enabled:true,label:"Tente outra vez",icon:"retry",color:"#f1a223",visualCopies:2,mode:"random",weight:10,intervals:[],blockFirst:0,minGap:0,allowOnRetry:false,retry:true,emoji:"↻",kicker:"OPA!",title:"Você ganhou outra chance!",message:"Passou raspando, mas a roleta te deu mais uma chance. Pode girar novamente agora.",prizeText:"GIRE MAIS UMA VEZ",pool:null,couponCount:0,futurePurchase:false},
{id:"balao-10",enabled:true,label:"R$ 10 OFF no balão",icon:"balloon",color:"#187dd0",visualCopies:2,mode:"random",weight:10,intervals:[],blockFirst:0,minGap:0,allowOnRetry:true,retry:false,emoji:"🎈",kicker:"AÍ SIM!",title:"Você ganhou desconto!",message:"Use o cupom abaixo na compra do balão.",prizeText:"R$ 10,00 DE DESCONTO NO BALÃO",pool:"balao-10",couponCount:1,futurePurchase:false},
{id:"proxima-50",enabled:true,label:"50% de desconto na próxima visita",icon:"percent",color:"#ef4b43",visualCopies:2,mode:"random",weight:25,intervals:[],blockFirst:2,minGap:2,allowOnRetry:false,retry:false,emoji:"%",kicker:"PARABÉNS!",title:"Tem desconto esperando por você!",message:"Na sua próxima compra, você ganha 50% de desconto.",prizeText:"50% DE DESCONTO NA PRÓXIMA VISITA",pool:"proxima-50",couponCount:1,futurePurchase:true},
{id:"mais-20",enabled:true,label:"Volte daqui 2h e ganhe 20 min grátis",icon:"hourglass",color:"#18a94b",visualCopies:2,mode:"random",weight:20,intervals:[],blockFirst:0,minGap:0,allowOnRetry:true,retry:false,emoji:"⏳",kicker:"TEM BÔNUS!",title:"Você ganhou mais diversão!",message:"Volte daqui 2 horas e ganhe 20 minutos grátis.",prizeText:"VOLTE DAQUI 2H E GANHE 20 MIN GRÁTIS",pool:"mais-20",couponCount:1,futurePurchase:false},
{id:"tempo-dobro",enabled:true,label:"Tempo em dobro",icon:"ticket",color:"#db3e72",visualCopies:2,mode:"random",weight:20,intervals:[],blockFirst:0,minGap:1,allowOnRetry:false,retry:false,emoji:"⏰",kicker:"PRÊMIO ESPECIAL!",title:"Você ganhou tempo em dobro!",message:"Apresente este resultado no atendimento para receber o benefício de tempo em dobro.",prizeText:"TEMPO EM DOBRO",pool:null,couponCount:0,futurePurchase:false}
];



const clone=v=>JSON.parse(JSON.stringify(v));
const safe=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const slug=v=>String(v||"premio").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,32)||`premio-${Date.now()}`;
const parseIntervals=v=>String(v||"").split(/[,;\s]+/).map(Number).filter(n=>Number.isFinite(n)&&n>0);
function localConfig(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch{return null}}
function saveLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(config))}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add("hidden"),2300)}
function localPools(){try{return JSON.parse(localStorage.getItem(CUSTOM_POOLS_KEY)||"{}")}catch{return{}}}
function saveLocalPools(v){localStorage.setItem(CUSTOM_POOLS_KEY,JSON.stringify(v))}
function localPoolStats(id){const a=localPools()[id]||[];return{total:a.length,used:0,remaining:a.length}}
function localCouponTotal(){return Object.values(localPools()).reduce((s,a)=>s+(Array.isArray(a)?a.length:0),0)}

async function boot(){
  config=localConfig() || {version:8,screen:{subtitleHtml:'Gire e descubra sua <strong>promoção!</strong>',introText:'São prêmios, descontos e vantagens especiais esperando por você na Roleta Safári!',importantNoteHtml:'O desconto de <strong>50%</strong> é válido somente para uma nova compra.'},prizes:clone(DEFAULT_PRIZES)};
  online=Boolean(await window.SafariBackend?.schemaReady?.());
  if(online){
    const remote=await window.SafariBackend.loadConfig().catch(()=>null);
    if(remote?.prizes?.length){config=remote;saveLocal()}
  }
  bind();
  await updateAuth();
  renderAll();
}

async function updateAuth(){
  const badge=document.getElementById("modeBadge"),box=document.getElementById("loginBox"),status=document.getElementById("loginStatus");
  if(!online){badge.textContent="Modo local";badge.className="mode-badge local";box.classList.add("hidden");isAdminUser=false;return}
  badge.textContent="Banco online";badge.className="mode-badge online";box.classList.remove("hidden");
  const user=await window.SafariBackend.getUser();isAdminUser=await window.SafariBackend.isAdmin();
  if(user){
    document.getElementById("adminEmail").value=user.email||"";
    document.getElementById("loginBtn").classList.add("hidden");document.getElementById("logoutBtn").classList.remove("hidden");
    status.textContent=isAdminUser?`Conectado como ${user.email}. Você pode salvar online.`:`Conectado como ${user.email}, mas esse e-mail ainda não está liberado como administrador.`;
  }else{
    document.getElementById("loginBtn").classList.remove("hidden");document.getElementById("logoutBtn").classList.add("hidden");status.textContent="Entre para salvar alterações no banco online.";
  }
}

function bind(){
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(`tab-${b.dataset.tab}`).classList.add("active");if(b.dataset.tab==="historico")renderHistory();if(b.dataset.tab==="codigos")renderCoupons()});
  document.getElementById("saveTopBtn").onclick=saveAll;document.getElementById("saveBottomBtn").onclick=saveAll;document.getElementById("addPrizeBtn").onclick=addPrize;
  document.getElementById("loginBtn").onclick=async()=>{const email=document.getElementById("adminEmail").value.trim();if(!email)return toast("Digite seu e-mail.");try{await window.SafariBackend.sendMagicLink(email);toast("Link de acesso enviado para seu e-mail.")}catch(e){toast(e.message||"Não consegui enviar.")}};
  document.getElementById("logoutBtn").onclick=async()=>{await window.SafariBackend.signOut();location.reload()};
  document.getElementById("couponPasteInput").oninput=refreshPreview;document.getElementById("couponFileInput").onchange=readFile;
  document.getElementById("clearCodesBtn").onclick=clearCodes;document.getElementById("importCodesBtn").onclick=importCodes;document.getElementById("exportHistoryBtn").onclick=exportHistory;
}

function renderAll(){renderMetrics();renderPrizes();renderChanceAlert();renderCoupons()}
function renderMetrics(){
  const active=config.prizes.filter(p=>p.enabled!==false),slices=active.reduce((s,p)=>s+Math.max(1,Number(p.visualCopies)||1),0),chance=active.filter(p=>p.mode!=="interval").reduce((s,p)=>s+(Number(p.weight)||0),0);
  document.getElementById("metricPrizes").textContent=active.length;document.getElementById("metricSlices").textContent=slices;document.getElementById("metricChance").textContent=`${chance}%`;
  const total=Object.values(remoteCouponStats).reduce((s,x)=>s+(x.total||0),0);document.getElementById("metricCoupons").textContent=total||localCouponTotal();
}
function renderChanceAlert(){
  const total=config.prizes.filter(p=>p.enabled!==false&&p.mode!=="interval").reduce((s,p)=>s+(Number(p.weight)||0),0),el=document.getElementById("chanceAlert");
  if(total===100){el.className="chance-alert ok";el.innerHTML="✅ As chances aleatórias somam <strong>100%</strong>. Está certinho."}
  else{el.className="chance-alert warn";el.innerHTML=total<100?`⚠️ As chances somam <strong>${total}%</strong>. Faltam <strong>${100-total}%</strong>.`:`⚠️ As chances somam <strong>${total}%</strong>. Passou <strong>${total-100}%</strong>.`}
}

function card(p,i){const c=Math.max(1,Number(p.visualCopies)||1);return `<article class="prize-card" data-index="${i}">
<div class="prize-top"><div class="prize-name"><span class="dot" style="background:${safe(p.color||"#777")}"></span><label class="label" style="width:100%"><span>Nome que aparece na fatia</span><input data-field="label" value="${safe(String(p.label||"").replaceAll("\n"," "))}"></label></div>
<div class="label"><span>Quantas fatias aparecem?</span><div class="stepper"><button data-step="-1">−</button><strong>${c}</strong><button data-step="1">+</button></div><small class="help">Muda só o visual, não a chance.</small></div>
<div><span class="help" style="margin:0 0 5px;font-weight:900;color:#557087">Como esse prêmio sai?</span><div class="mode-row"><button class="mode-btn ${p.mode!=="interval"?"active":""}" data-mode="random">Chance (%)</button><button class="mode-btn ${p.mode==="interval"?"active":""}" data-mode="interval">A cada X clientes</button></div></div>
<label class="switch"><input data-field="enabled" type="checkbox" ${p.enabled!==false?"checked":""}> Ativo</label></div>
<div class="rule-box"><div class="rule-fields">${p.mode==="interval"?`<label class="label"><span>A cada quantos clientes?</span><input data-field="intervals" value="${safe((p.intervals||[]).join(", ")||"10")}" placeholder="10 ou 10, 15, 20"><small class="help">Pode alternar os intervalos.</small></label>`:`<label class="label chance-input"><span>Qual a chance de sair?</span><input data-field="weight" type="number" min="0" max="100" value="${Number(p.weight)||0}"><b>%</b><small class="help">Ex.: 20 = cerca de 20 em 100 giros aleatórios.</small></label>`}
<label class="label"><span>Quantos códigos entrega?</span><input data-field="couponCount" type="number" min="0" max="20" value="${Number(p.couponCount)||0}"><small class="help">0 = sem código; 1 = um cupom; 3 = três.</small></label>
<label class="label"><span>Cor da fatia</span><input data-field="color" type="color" value="${safe(p.color||"#7b3fd6")}"></label></div></div>
<details><summary>Mais opções ▾</summary><div class="advanced"><div class="advanced-grid"><label class="label"><span>Título quando ganhar</span><input data-field="title" value="${safe(p.title||"")}"></label><label class="label"><span>Texto grande</span><input data-field="prizeText" value="${safe(p.prizeText||"")}"></label><label class="label full"><span>Mensagem</span><textarea data-field="message" rows="2">${safe(p.message||"")}</textarea></label><label class="label"><span>Bloquear nos primeiros X clientes</span><input data-field="blockFirst" type="number" min="0" value="${Number(p.blockFirst)||0}"></label><label class="label"><span>Mínimo entre dois iguais</span><input data-field="minGap" type="number" min="0" value="${Number(p.minGap)||0}"></label></div><div class="actions"><label class="switch"><input data-field="allowOnRetry" type="checkbox" ${p.allowOnRetry?"checked":""}> Pode sair no giro extra</label><label class="switch"><input data-field="retry" type="checkbox" ${p.retry?"checked":""}> Dá outro giro</label><label class="switch"><input data-field="futurePurchase" type="checkbox" ${p.futurePurchase?"checked":""}> Só próxima compra</label><button class="btn light duplicate">Duplicar</button><button class="btn danger remove">Excluir</button></div></div></details></article>`}

function renderPrizes(){
  const h=document.getElementById("prizeCards");h.innerHTML=config.prizes.map(card).join("");
  h.querySelectorAll(".prize-card").forEach(cardEl=>{
    const i=Number(cardEl.dataset.index),p=config.prizes[i];
    cardEl.querySelectorAll("[data-field]").forEach(input=>{
      const ev=(input.type==="checkbox"||input.tagName==="SELECT")?"change":"input";input.addEventListener(ev,()=>{
        const f=input.dataset.field;if(["enabled","allowOnRetry","retry","futurePurchase"].includes(f))p[f]=input.checked;else if(["weight","couponCount","blockFirst","minGap"].includes(f))p[f]=Math.max(0,Number(input.value)||0);else if(f==="intervals")p.intervals=parseIntervals(input.value);else p[f]=input.value;if(f==="color")cardEl.querySelector(".dot").style.background=input.value;renderMetrics();renderChanceAlert();
      })
    });
    cardEl.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{p.visualCopies=Math.max(1,Math.min(8,(Number(p.visualCopies)||1)+Number(b.dataset.step)));renderPrizes();renderMetrics()});
    cardEl.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{p.mode=b.dataset.mode;if(p.mode==="interval"&&!p.intervals?.length)p.intervals=[10];renderPrizes();renderChanceAlert()});
    cardEl.querySelector(".duplicate").onclick=()=>{const c=clone(p);c.id=`${slug(c.label||c.title)}-${Date.now().toString().slice(-6)}`;config.prizes.splice(i+1,0,c);renderAll()};
    cardEl.querySelector(".remove").onclick=()=>{if(confirm(`Excluir "${p.label||p.title}"?`)){config.prizes.splice(i,1);renderAll()}};
  });
}
function addPrize(){config.prizes.push({id:`premio-${Date.now().toString().slice(-7)}`,enabled:true,label:"Novo prêmio",icon:"ticket",color:"#7b3fd6",visualCopies:1,mode:"random",weight:10,intervals:[],blockFirst:0,minGap:0,allowOnRetry:false,retry:false,emoji:"★",kicker:"PARABÉNS!",title:"Novo prêmio",message:"Você ganhou um prêmio especial.",prizeText:"NOVO PRÊMIO",pool:null,couponCount:0,futurePurchase:false});renderAll();toast("Novo prêmio criado.")}

async function saveAll(){config.prizes.forEach(p=>{p.visualCopies=Math.max(1,Number(p.visualCopies)||1);p.pool=Number(p.couponCount)>0?p.id:null});saveLocal();if(online&&isAdminUser){try{await window.SafariBackend.saveConfig(config);toast("Tudo salvo no banco online.");return}catch(e){toast(`Salvo localmente. Online: ${e.message}`);return}}toast(online?"Salvo neste navegador. Entre como administrador para salvar online.":"Salvo neste navegador.")}

async function renderCoupons(){
  const prizes=config.prizes.filter(p=>p.enabled!==false);if(!selectedPrizeId&&prizes.length)selectedPrizeId=prizes[0].id;if(online)remoteCouponStats=await window.SafariBackend.couponStats(prizes.map(p=>p.id)).catch(()=>({}));
  document.getElementById("couponStats").innerHTML=prizes.map(p=>{const s=remoteCouponStats[p.id]||localPoolStats(p.id);return `<article class="coupon-card"><strong>${safe(p.label||p.title)}</strong><span>Total</span><b>${s.total}</b><span>${s.used||0} entregues • ${s.remaining||s.total} restantes</span></article>`}).join("");
  const c=document.getElementById("couponPrizeChoices");c.innerHTML=prizes.map(p=>{const s=remoteCouponStats[p.id]||localPoolStats(p.id);return `<button class="choice ${selectedPrizeId===p.id?"active":""}" data-id="${safe(p.id)}"><strong>${safe(p.label||p.title)}</strong><small>${s.remaining||0} disponíveis</small></button>`}).join("");c.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{selectedPrizeId=b.dataset.id;renderCoupons();refreshPreview()});renderMetrics();
}
function parseTextCodes(text){const raw=String(text||"").replace(/^\uFEFF/,"").trim();if(!raw)return[];const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(lines.length>1){const header=lines[0].toLowerCase(),d=header.includes(";")?";":header.includes("\t")?"\t":header.includes(",")?",":null;if(d){const cols=lines[0].split(d).map(x=>x.replace(/^"|"$/g,"").trim().toLowerCase()),idx=cols.findIndex(x=>["cupom","coupon","codigo","código","code"].includes(x));if(idx>=0)return lines.slice(1).map(l=>l.split(d)[idx]).map(x=>String(x||"").replace(/^"|"$/g,"").trim()).filter(Boolean)}}return raw.split(/\r?\n|,|;/).map(x=>x.replace(/^"|"$/g,"").trim()).filter(Boolean).filter(x=>!["cupom","codigo","código","code"].includes(x.toLowerCase()))}
async function readFile(e){const f=e.target.files?.[0];if(!f){fileCodes=[];refreshPreview();return}document.getElementById("fileName").textContent=f.name;try{const ext=f.name.split(".").pop().toLowerCase();if(["xlsx","xls"].includes(ext)&&window.XLSX){const wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});let idx=0;if(rows.length){const h=rows[0].map(x=>String(x).trim().toLowerCase()),found=h.findIndex(x=>["cupom","coupon","codigo","código","code"].includes(x));if(found>=0)idx=found}fileCodes=rows.slice(1).map(r=>String(r[idx]||"").trim()).filter(Boolean)}else fileCodes=parseTextCodes(await f.text());refreshPreview()}catch{fileCodes=[];toast("Não consegui ler essa planilha.")}}
function refreshPreview(){pendingCodes=[...new Set([...fileCodes,...parseTextCodes(document.getElementById("couponPasteInput").value)].map(x=>String(x).trim()).filter(Boolean))];const e=document.getElementById("couponPreview"),b=document.getElementById("importCodesBtn");if(!pendingCodes.length){e.className="preview empty";e.textContent="Nenhum código carregado.";b.disabled=true;b.textContent="Cadastrar códigos";return}e.className="preview";e.innerHTML=`<div class="preview-pills"><span class="pill">${pendingCodes.length} códigos encontrados</span></div>${pendingCodes.slice(0,20).map(c=>`<code>${safe(c)}</code>`).join("")}${pendingCodes.length>20?`<code>+${pendingCodes.length-20}</code>`:""}`;b.disabled=!selectedPrizeId;b.textContent=`Cadastrar ${pendingCodes.length} códigos`}
function clearCodes(){fileCodes=[];pendingCodes=[];document.getElementById("couponFileInput").value="";document.getElementById("couponPasteInput").value="";document.getElementById("fileName").textContent="Nenhum arquivo selecionado";refreshPreview()}
async function importCodes(){if(!selectedPrizeId||!pendingCodes.length)return;const p=config.prizes.find(x=>x.id===selectedPrizeId);if(p&&Number(p.couponCount)===0){p.couponCount=1;p.pool=p.id;saveLocal()}if(online&&isAdminUser){try{await window.SafariBackend.importCoupons(selectedPrizeId,pendingCodes);toast(`${pendingCodes.length} códigos enviados para o banco.`);clearCodes();await renderCoupons();return}catch(e){toast(`Não consegui salvar online: ${e.message}`);return}}const pools=localPools(),set=new Set(pools[selectedPrizeId]||[]);pendingCodes.forEach(c=>set.add(c));pools[selectedPrizeId]=[...set];saveLocalPools(pools);toast(`${pendingCodes.length} códigos salvos neste navegador.`);clearCodes();renderCoupons()}

async function renderHistory(){const body=document.getElementById("historyBody");let rows=[];if(online&&isAdminUser)rows=await window.SafariBackend.history(200).catch(()=>[]);if(!rows.length){try{rows=JSON.parse(localStorage.getItem("roleta_safari_v8_history")||"[]").map(x=>({created_at:x.at,spin_no:x.round,prize_name:x.prizeTitle,codes:x.codes||[]}))}catch{}}body.innerHTML=rows.length?rows.map(r=>`<tr><td>${new Date(r.created_at||Date.now()).toLocaleString("pt-BR")}</td><td>${r.spin_no??"-"}</td><td>${safe(r.prize_name||r.prize_id||"-")}</td><td>${(r.codes||[]).map(c=>`<code>${safe(c)}</code>`).join(" ")||"—"}</td></tr>`).join(""):`<tr><td colspan="4">Ainda não há resultados.</td></tr>`;window.__historyRows=rows}
function exportHistory(){const rows=window.__historyRows||[],csv=[["data","rodada","premio","codigos"],...rows.map(r=>[r.created_at||"",r.spin_no??"",r.prize_name||r.prize_id||"",(r.codes||[]).join(" | ")])].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download="historico_roleta_safari.csv";a.click()}

boot();
