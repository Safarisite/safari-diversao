
/*
  ROLETA SAFÁRI V6 — CONFIGURÁVEL PELO PAINEL ADMINISTRATIVO

  TESTE LOCAL:
  - Configuração, histórico, participação e controle de cupons ficam em localStorage.
  - A página admin.html altera a roleta sem editar código.
  - Na publicação final, o mesmo conceito será migrado para banco/backend.
*/

const COUPON_DATA = window.SAFARI_COUPONS || { expiration: "31/12/2026", pools: {} };

const STORAGE = {
  config: "roleta_safari_v8_config",
  state: "roleta_safari_v8_state",
  customPools: "roleta_safari_v8_custom_pools",
  history: "roleta_safari_v8_history",

  // Reaproveita os cupons já emitidos nos testes anteriores.
  used: "roleta_safari_v8_issued_coupons",
  sound: "roleta_safari_v4_sound",

  // Trava local de um cliente por aparelho.
  participation: "roleta_safari_v11_6_participation"
};

const DEFAULT_CONFIG = {
  version: 11.6,
  screen: {
    subtitleHtml: 'Gire e descubra sua <strong>promoção!</strong>',
    introText: "São prêmios, descontos e vantagens especiais esperando por você na Roleta Safári!",
    importantNoteHtml: 'O desconto de <strong>50%</strong> é válido somente para uma nova compra, não para a visita atual do cliente.'
  },
  prizes: [
    {
      id:"nao-foi",
      enabled:true,
      label:"Não foi dessa vez",
      icon:"sad",
      color:"#7b3fd6",
      visualCopies:2,
      mode:"random",
      weight:15,
      intervals:[],
      blockFirst:0,
      minGap:0,
      allowOnRetry:false,
      retry:false,
      emoji:"☹",
      kicker:"QUASE!",
      title:"Não foi dessa vez",
      message:"Dessa vez não saiu prêmio, mas obrigado por participar da Roleta Safári!",
      prizeText:"ATÉ A PRÓXIMA!",
      pool:null,
      couponCount:0,
      futurePurchase:false
    },
    {
      id:"tente-outra",
      enabled:true,
      label:"Tente outra vez",
      icon:"retry",
      color:"#f1a223",
      visualCopies:2,
      mode:"random",
      weight:10,
      intervals:[],
      blockFirst:0,
      minGap:0,
      allowOnRetry:false,
      retry:true,
      emoji:"↻",
      kicker:"OPA!",
      title:"Você ganhou outra chance!",
      message:"Passou raspando, mas a roleta te deu mais uma chance. Pode girar novamente agora.",
      prizeText:"GIRE MAIS UMA VEZ",
      pool:null,
      couponCount:0,
      futurePurchase:false
    },
    {
      id:"balao-10",
      enabled:true,
      label:"R$ 10 OFF no balão",
      icon:"balloon",
      color:"#187dd0",
      visualCopies:2,
      mode:"random",
      weight:10,
      intervals:[],
      blockFirst:0,
      minGap:0,
      allowOnRetry:true,
      retry:false,
      emoji:"🎈",
      kicker:"AÍ SIM!",
      title:"Você ganhou desconto!",
      message:"Use o cupom abaixo na compra do balão.",
      prizeText:"R$ 10,00 DE DESCONTO NO BALÃO",
      pool:"balao-10",
      couponCount:1,
      futurePurchase:false
    },
    {
      id:"proxima-50",
      enabled:true,
      label:"50% de desconto na próxima visita",
      icon:"percent",
      color:"#ef4b43",
      visualCopies:2,
      mode:"random",
      weight:25,
      intervals:[],
      blockFirst:2,
      minGap:2,
      allowOnRetry:false,
      retry:false,
      emoji:"%",
      kicker:"PARABÉNS!",
      title:"Tem desconto esperando por você!",
      message:"Na sua próxima compra, você ganha 50% de desconto.",
      prizeText:"50% DE DESCONTO NA PRÓXIMA VISITA",
      pool:"proxima-50",
      couponCount:1,
      futurePurchase:true
    },
    {
      id:"mais-20",
      enabled:true,
      label:"Volte daqui 2h e ganhe 20 min grátis",
      icon:"hourglass",
      color:"#18a94b",
      visualCopies:2,
      mode:"random",
      weight:20,
      intervals:[],
      blockFirst:0,
      minGap:0,
      allowOnRetry:true,
      retry:false,
      emoji:"⏳",
      kicker:"TEM BÔNUS!",
      title:"Você ganhou mais diversão!",
      message:"Volte daqui 2 horas e ganhe 20 minutos grátis.",
      prizeText:"VOLTE DAQUI 2H E GANHE 20 MIN GRÁTIS",
      pool:"mais-20",
      couponCount:1,
      futurePurchase:false
    },
    {
      id:"tempo-dobro",
      enabled:true,
      label:"Tempo em dobro",
      icon:"ticket",
      color:"#db3e72",
      visualCopies:2,
      mode:"random",
      weight:20,
      intervals:[],
      blockFirst:0,
      minGap:1,
      allowOnRetry:false,
      retry:false,
      emoji:"⏰",
      kicker:"PRÊMIO ESPECIAL!",
      title:"Você ganhou tempo em dobro!",
      message:"Apresente este resultado no atendimento para receber o benefício de tempo em dobro.",
      prizeText:"TEMPO EM DOBRO",
      pool:null,
      couponCount:0,
      futurePurchase:false
    }
  ]
};

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function normalizeConfig(raw){
  const cfg = raw && typeof raw === "object" ? raw : clone(DEFAULT_CONFIG);
  if(!cfg.screen) cfg.screen = clone(DEFAULT_CONFIG.screen);
  if(!Array.isArray(cfg.prizes) || !cfg.prizes.length) cfg.prizes = clone(DEFAULT_CONFIG.prizes);

  cfg.prizes = cfg.prizes.map((p, index) => ({
    id: p.id || `premio-${Date.now()}-${index}`,
    enabled: p.enabled !== false,
    label: p.label || "Novo\nprêmio",
    icon: p.icon || "ticket",
    color: p.color || "#6f35d8",
    visualCopies: Math.max(1, Number(p.visualCopies) || 2),
    mode: p.mode === "interval" ? "interval" : "random",
    weight: Number.isFinite(Number(p.weight)) ? Number(p.weight) : 0,
    intervals: Array.isArray(p.intervals)
      ? p.intervals.map(Number).filter(n => Number.isFinite(n) && n > 0)
      : [],
    blockFirst: Math.max(0, Number(p.blockFirst) || 0),
    minGap: Math.max(0, Number(p.minGap) || 0),
    allowOnRetry: Boolean(p.allowOnRetry),
    retry: Boolean(p.retry),
    emoji: p.emoji || "★",
    kicker: p.kicker || "PARABÉNS!",
    title: p.title || "Você ganhou!",
    message: p.message || "Aproveite seu prêmio.",
    prizeText: p.prizeText || p.title || "PRÊMIO",
    pool: p.pool || null,
    couponCount: Math.max(0, Number(p.couponCount) || 0),
    futurePurchase: Boolean(p.futurePurchase)
  }));

  return cfg;
}

function loadConfig(){
  try{
    const stored = JSON.parse(localStorage.getItem(STORAGE.config) || "null");
    return normalizeConfig(stored || clone(DEFAULT_CONFIG));
  }catch{
    return clone(DEFAULT_CONFIG);
  }
}

let CONFIG = loadConfig();
let PRIZES = CONFIG.prizes.filter(p => p.enabled);

const wheel = document.getElementById("wheel");
const winnerSector = document.getElementById("winnerSector");
const wheelFrame = document.getElementById("wheelFrame");
const pointer = document.getElementById("pointer");
const segmentLabels = document.getElementById("segmentLabels");
const sliceLights = document.getElementById("sliceLights");
const lightRing = document.getElementById("lightRing");
const spinButton = document.getElementById("spinButton");
const soundButton = document.getElementById("soundButton");
const soundIcon = document.getElementById("soundIcon");
const statusText = document.getElementById("statusText");
const participationLock = document.getElementById("participationLock");
const resultModal = document.getElementById("resultModal");
const closeModal = document.getElementById("closeModal");
const resultEmoji = document.getElementById("resultEmoji");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultPrize = document.getElementById("resultPrize");
const couponBox = document.getElementById("couponBox");
const couponHelp = document.getElementById("couponHelp");
const couponList = document.getElementById("couponList");
const copyAllCoupons = document.getElementById("copyAllCoupons");
const expirationText = document.getElementById("expirationText");
const futurePurchaseWarning = document.getElementById("futurePurchaseWarning");
const resultAction = document.getElementById("resultAction");
const confetti = document.getElementById("confetti");
const screenSubtitle = document.getElementById("screenSubtitle");
const screenIntro = document.getElementById("screenIntro");
const screenImportantNote = document.getElementById("screenImportantNote");

let currentRotation = 0;
let isSpinning = false;
let currentPrize = null;
let currentCoupons = [];
let currentRoundForResult = null;
let soundEnabled = localStorage.getItem(STORAGE.sound) !== "off";
let audioContext = null;
let soundTimer = null;
let lightTimer = null;
let winnerTimer = null;

function applyScreenConfig(){
  if(screenSubtitle) screenSubtitle.innerHTML = CONFIG.screen?.subtitleHtml || DEFAULT_CONFIG.screen.subtitleHtml;
  if(screenIntro) screenIntro.textContent = CONFIG.screen?.introText || DEFAULT_CONFIG.screen.introText;
  if(screenImportantNote) screenImportantNote.innerHTML = CONFIG.screen?.importantNoteHtml || DEFAULT_CONFIG.screen.importantNoteHtml;
}
applyScreenConfig();

function getDeviceId(){
  const key="roleta_safari_device_id";
  let value=localStorage.getItem(key);
  if(!value){value=crypto.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(key,value)}
  return value;
}

function defaultParticipation(){
  return {
    firstSpinUsed:false,
    retryAvailable:false,
    completed:false,
    lastPrizeId:null,
    surveySessionId:null,
    updatedAt:null
  };
}

function loadParticipation(){
  let data;
  try{ data = JSON.parse(localStorage.getItem(STORAGE.participation) || "null"); }catch{ data=null; }
  if(!data || typeof data!=="object") data=defaultParticipation();
  return {...defaultParticipation(), ...data};
}

function saveParticipation(data){
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE.participation, JSON.stringify(data));
  return data;
}

function updateParticipationUI(){
  const p=loadParticipation();
  participationLock.classList.toggle("hidden", !p.completed);
  statusText.classList.toggle("status-hidden", p.completed);

  if(isSpinning){
    spinButton.disabled=true;
    return;
  }

  if(!window.SAFARI_SURVEY_READY){
    spinButton.disabled=true;
    spinButton.classList.remove("completed");
    spinButton.querySelector("span:last-child").textContent="RESPONDA A AVALIAÇÃO";
    statusText.textContent="Responda a avaliação para liberar sua Roleta Safári.";
    return;
  }

  if(p.completed){
    spinButton.disabled=true;
    spinButton.classList.add("completed");
    spinButton.querySelector("span:last-child").textContent="PARTICIPAÇÃO CONCLUÍDA";
    statusText.textContent="";
    return;
  }

  spinButton.classList.remove("completed");
  spinButton.disabled=false;

  if(p.retryAvailable){
    spinButton.querySelector("span:last-child").textContent="GIRAR DE NOVO";
    statusText.textContent="Você ganhou uma nova chance! Seu giro extra está liberado.";
  }else{
    spinButton.querySelector("span:last-child").textContent="GIRAR A ROLETA";
    statusText.textContent="Toque em “Girar a roleta” e boa sorte!";
  }
}

function markPrizeForParticipation(prize,{retry=false,forced=false}={}){
  if(forced) return;

  const p=loadParticipation();
  p.firstSpinUsed=true;
  p.lastPrizeId=prize.id;

  if(prize.retry && !retry){
    p.retryAvailable=true;
    p.completed=false;
  }else{
    p.retryAvailable=false;
    p.completed=true;
  }

  saveParticipation(p);
}

function canSpin({retry=false,forced=false}={}){
  if(forced) return true;
  const p=loadParticipation();
  if(p.completed) return false;
  if(retry) return p.retryAvailable;
  return !p.firstSpinUsed;
}

function iconSvg(type){
  const common='viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
  const map={
    sad:`<svg ${common}><circle cx="32" cy="32" r="23"/><circle cx="24" cy="26" r="2" fill="currentColor" stroke="none"/><circle cx="40" cy="26" r="2" fill="currentColor" stroke="none"/><path d="M22 43c5-7 15-7 20 0"/></svg>`,
    retry:`<svg ${common}><path d="M47 20V9l-8 7"/><path d="M49 29a18 18 0 1 1-7-14"/></svg>`,
    balloon:`<svg ${common}><path d="M32 45c10 0 18-9 18-21S42 6 32 6 14 12 14 24s8 21 18 21Z"/><path d="M27 45h10l-5 7-5-7ZM32 52v7"/></svg>`,
    percent:`<svg ${common}><circle cx="20" cy="20" r="7"/><circle cx="44" cy="44" r="7"/><path d="M18 49 46 15"/></svg>`,
    hourglass:`<svg ${common}><path d="M18 8h28M18 56h28M21 10c0 13 11 14 11 22S21 41 21 54M43 10c0 13-11 14-11 22s11 9 11 22"/></svg>`,
    ticket:`<svg ${common}><path d="M8 19h48v10a7 7 0 0 0 0 14v10H8V43a7 7 0 0 0 0-14V19Z"/><path d="M32 24v24M26 31h12"/></svg>`
  };
  if(map[type]) return map[type];
  return `<span class="custom-icon">${String(type || "★").slice(0,4)}</span>`;
}

function escapeSegmentText(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function segmentLabelMarkup(prize){
  const label=String(prize.label || "").trim();
  const safe=escapeSegmentText(label);

  if(["nao-foi","nao-foi-1","nao-foi-2"].includes(prize.id)){
    return '<span class="seg-main seg-main-medium">NÃO FOI</span><span class="seg-sub">DESSA VEZ</span>';
  }

  if(prize.id==="tente-outra"){
    return '<span class="seg-main seg-main-medium">TENTE</span><span class="seg-sub">OUTRA VEZ</span>';
  }

  if(prize.id==="balao-10"){
    const money=label.match(/R\$\s*(\d+(?:[,.]\d+)?)/i)?.[1] || "10";
    return `<span class="seg-main seg-main-money">R$${escapeSegmentText(money)} OFF</span><span class="seg-sub seg-sub-large">NO BALÃO</span>`;
  }

  if(prize.id==="proxima-50"){
    const percent=label.match(/(\d+)\s*%/)?.[1] || "50";
    return `<span class="seg-main seg-main-percent">${escapeSegmentText(percent)}% OFF</span><span class="seg-sub">NA PRÓXIMA VISITA</span>`;
  }

  if(prize.id==="mais-20"){
    const minutes=label.match(/(\d+)\s*min/i)?.[1] || "20";
    const hours=label.match(/(\d+)\s*h/i)?.[1] || "2";
    return `<span class="seg-top">${escapeSegmentText(minutes)}MIN</span><span class="seg-main seg-main-free">GRÁTIS</span><span class="seg-sub">DAQUI ${escapeSegmentText(hours)} HORAS</span>`;
  }

  if(prize.id==="tempo-dobro"){
    return '<span class="seg-main seg-main-medium">TEMPO</span><span class="seg-sub seg-sub-large">EM DOBRO</span>';
  }

  return `<span class="seg-generic">${safe}</span>`;
}

function visualGroupKey(prize){
  if(["nao-foi","nao-foi-1","nao-foi-2"].includes(prize.id)) return "nao-foi";
  return prize.id;
}

function shuffleArray(list){
  const arr=[...list];
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function hasAdjacentVisualDupes(list){
  if(list.length<2) return false;
  for(let i=0;i<list.length;i++){
    const a=visualGroupKey(list[i]);
    const b=visualGroupKey(list[(i+1)%list.length]);
    if(a===b) return true;
  }
  return false;
}

function arrangeVisualSegments(list){
  for(let attempt=0;attempt<500;attempt++){
    const shuffled=shuffleArray(list);
    if(!hasAdjacentVisualDupes(shuffled)) return shuffled;
  }

  const remaining=[...list];
  const result=[];
  while(remaining.length){
    let pickIndex=remaining.findIndex(item=>{
      const prev=result[result.length-1];
      return !prev || visualGroupKey(prev)!==visualGroupKey(item);
    });
    if(pickIndex<0) pickIndex=0;
    result.push(remaining.splice(pickIndex,1)[0]);
  }
  if(hasAdjacentVisualDupes(result) && result.length>2){
    for(let i=1;i<result.length;i++){
      if(visualGroupKey(result[i])===visualGroupKey(result[i-1])){
        const swapIndex=result.findIndex((item,idx)=>idx>i && visualGroupKey(item)!==visualGroupKey(result[i-1]) && visualGroupKey(item)!==visualGroupKey(result[(idx+1)%result.length]));
        if(swapIndex>0) [result[i],result[swapIndex]]=[result[swapIndex],result[i]];
      }
    }
  }
  return result;
}

function buildSegments(){
  segmentLabels.innerHTML="";
  sliceLights.innerHTML="";

  const active = PRIZES.slice();
  if(!active.length) return;

  // Duplica visualmente todas as fatias sem deixar o par colado ao original.
  const repeated=[];
  active.forEach(prize=>{
    const copies=Math.max(1,Math.min(8,Number(prize.visualCopies)||2));
    for(let copy=0;copy<copies;copy++){
      repeated.push({...prize,visualIndex:copy,visualId:`${prize.id}__${copy}`});
    }
  });
  VISUAL_SEGMENTS = arrangeVisualSegments(repeated);

  const count = Math.max(1, VISUAL_SEGMENTS.length);
  const segmentAngle = 360 / count;
  const start = -segmentAngle / 2;

  wheel.style.setProperty("--segment-angle", `${segmentAngle}deg`);
  wheel.style.setProperty("--segment-start", `${start}deg`);
  wheel.style.setProperty("--segment-count", String(count));

  const stops = [];
  VISUAL_SEGMENTS.forEach((segment,index)=>{
    const a = index * segmentAngle;
    const from = index * segmentAngle;
    const to = from + segmentAngle;
    stops.push(`${segment.color} ${from}deg ${to}deg`);

    segment.centerAngle = a;
    segment.segmentIndex = index;
    segment.segmentAngle = segmentAngle;
    segment.segmentStart = start;

    const item=document.createElement("div");
    item.className="segment-label";
    item.dataset.id=segment.id;
    item.dataset.visualId=segment.visualId;
    item.dataset.angle=String(a);
    item.innerHTML=`<div class="segment-content segment-design segment-${segment.id}">${segmentLabelMarkup(segment)}</div>`;
    segmentLabels.appendChild(item);

    const light=document.createElement("span");
    light.className="slice-light";
    light.dataset.angle=String(a);
    sliceLights.appendChild(light);
  });

  wheel.style.background = `conic-gradient(from ${start}deg, ${stops.join(",")})`;
  updateGeometry();
}

function buildBulbs(){
  lightRing.innerHTML="";
  for(let i=0;i<24;i++){
    const b=document.createElement("span");
    b.className="bulb";
    b.dataset.index=String(i);
    b.dataset.angle=String(i*(360/24));
    lightRing.appendChild(b);
  }
  updateGeometry();
}

function updateGeometry(){
  const wheelSize=wheel.getBoundingClientRect().width;
  if(!wheelSize) return;

  const count=Math.max(1,VISUAL_SEGMENTS.length || PRIZES.length);
  const labelRadius=wheelSize*(count>10?.342:count>8?.33:.31);
  const baseFontSize =
    count<=6 ? Math.max(18, Math.min(27, wheelSize*.036)) :
    count<=8 ? Math.max(16, Math.min(24, wheelSize*.032)) :
    Math.max(15, Math.min(23, wheelSize*.0305));

  const labelWidth =
    count>10
      ? Math.max(82, Math.min(126, wheelSize*.174))
      : Math.max(92, Math.min(160, wheelSize*.22));

  segmentLabels.querySelectorAll(".segment-label").forEach(item=>{
    const angle=Number(item.dataset.angle||0);
    item.style.width=`${labelWidth}px`;
    item.style.transform=`translate(-50%,-50%) rotate(${angle}deg) translateY(-${labelRadius}px) rotate(-${angle}deg)`;

    const content=item.querySelector(".segment-content");
    if(content){
      content.style.width=`${labelWidth}px`;
      content.style.maxWidth=`${labelWidth}px`;
    }

    if(content){
      content.style.fontSize=`${baseFontSize}px`;
    }
  });

  const ringSize=lightRing.getBoundingClientRect().width;
  const bulbRadius=Math.max(0,ringSize/2-16);
  lightRing.querySelectorAll(".bulb").forEach(item=>{
    const angle=Number(item.dataset.angle||0);
    item.style.transform=`rotate(${angle}deg) translateY(-${bulbRadius}px)`;
  });

  const sliceLightRadius=Math.max(0,wheelSize/2-24);
  sliceLights.querySelectorAll(".slice-light").forEach(item=>{
    const angle=Number(item.dataset.angle||0);
    item.style.transform=`translate(-50%,-50%) rotate(${angle}deg) translateY(-${sliceLightRadius}px)`;
  });
}

function readableLabelAngle(screenAngle){
  // O texto acompanha a tangente da fatia, como na arte de referência,
  // mas é invertido quando necessário para nunca ficar de cabeça para baixo.
  let a=(((screenAngle-90)%360)+360)%360;
  if(a>180) a-=360;
  if(a>90) a-=180;
  if(a<-90) a+=180;
  return a;
}
function updateLabelCompensation(){
  const rotation=((currentRotation%360)+360)%360;
  segmentLabels.querySelectorAll(".segment-label").forEach(item=>{
    const base=Number(item.dataset.angle||0);
    const screen=base+rotation;
    const desired=readableLabelAngle(screen);
    const content=item.querySelector(".segment-content");
    if(content) content.style.transform=`rotate(${desired-rotation}deg)`;
  });
}

buildSegments();
buildBulbs();
updateLabelCompensation();
window.addEventListener("resize",updateGeometry);

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function defaultState(){
  return {
    rounds:0,
    controlled:{},
    lastWinRound:{}
  };
}

function loadState(){
  let state;
  try{state=JSON.parse(localStorage.getItem(STORAGE.state)||"null")}catch{state=null}
  if(!state||typeof state!=="object") state=defaultState();
  if(!Number.isFinite(state.rounds)) state.rounds=0;
  if(!state.controlled||typeof state.controlled!=="object") state.controlled={};
  if(!state.lastWinRound||typeof state.lastWinRound!=="object") state.lastWinRound={};

  // Inicializa/repara os agendamentos dos prêmios controlados.
  CONFIG.prizes
    .filter(p=>p.enabled && p.mode==="interval")
    .forEach(prize=>{
      ensureControlledPrizeState(state, prize);
    });

  saveState(state);
  return state;
}

function saveState(state){
  localStorage.setItem(STORAGE.state,JSON.stringify(state));
}

function ensureControlledPrizeState(state,prize){
  if(!state.controlled[prize.id]){
    state.controlled[prize.id]={
      nextAt:null,
      intervalBag:[],
      lastInterval:null
    };
  }

  const s=state.controlled[prize.id];

  if(!Array.isArray(s.intervalBag)) s.intervalBag=[];
  if(!Number.isFinite(s.lastInterval)) s.lastInterval=null;

  const validIntervals =
    Array.isArray(prize.intervals) && prize.intervals.length
      ? prize.intervals.map(Number).filter(n=>Number.isFinite(n)&&n>0)
      : [10];

  if(!Number.isFinite(s.nextAt)){
    const interval=drawInterval(s,validIntervals);
    s.nextAt=state.rounds+interval;
  }

  return s;
}

function drawInterval(scheduleState, intervals){
  if(!scheduleState.intervalBag.length){
    let bag=shuffle(intervals);
    if(
      scheduleState.lastInterval!==null &&
      bag.length>1 &&
      bag[0]===scheduleState.lastInterval
    ){
      [bag[0],bag[1]]=[bag[1],bag[0]];
    }
    scheduleState.intervalBag=bag;
  }

  const interval=Number(scheduleState.intervalBag.shift()) || Number(intervals[0]) || 10;
  scheduleState.lastInterval=interval;
  return interval;
}

function getCustomPools(){
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE.customPools)||"{}");
    return data&&typeof data==="object"?data:{};
  }catch{
    return {};
  }
}

function getPool(poolName){
  if(!poolName) return [];
  const aliases={"balao-10":"balloon10","proxima-50":"return50","mais-20":"wait20"};
  const legacyName=aliases[poolName] || poolName;
  const base=Array.isArray(COUPON_DATA.pools?.[legacyName]) ? COUPON_DATA.pools[legacyName] : [];
  const custom=getCustomPools();
  const extraCurrent=Array.isArray(custom[poolName]) ? custom[poolName] : [];
  const extraLegacy=Array.isArray(custom[legacyName]) ? custom[legacyName] : [];
  return [...new Set([...base,...extraCurrent,...extraLegacy])];
}

function getUsedMap(){
  try{return JSON.parse(localStorage.getItem(STORAGE.used)||"{}")||{}}catch{return {}}
}

function saveUsedMap(map){
  localStorage.setItem(STORAGE.used,JSON.stringify(map));
}

function availableCount(poolName){
  const pool=getPool(poolName);
  const used=new Set(getUsedMap()[poolName]||[]);
  return pool.reduce((n,c)=>n+(used.has(c)?0:1),0);
}

function issueCodes(poolName,count){
  if(!poolName||count<=0) return [];

  const pool=getPool(poolName);
  const usedMap=getUsedMap();
  const used=new Set(usedMap[poolName]||[]);
  const available=pool.filter(code=>!used.has(code));

  if(available.length<count) return [];

  const selected=[];

  for(let i=0;i<count;i++){
    const idx=Math.floor(Math.random()*available.length);
    const [code]=available.splice(idx,1);
    selected.push(code);
    used.add(code);
  }

  usedMap[poolName]=[...used];
  saveUsedMap(usedMap);

  return selected;
}

function prizeHasStock(prize){
  return !prize.pool || prize.couponCount<=0 || availableCount(prize.pool)>=prize.couponCount;
}

function chooseWeighted(choices){
  const valid=choices.filter(p=>p.enabled && prizeHasStock(p) && Number(p.weight)>0);
  const total=valid.reduce((s,p)=>s+Number(p.weight||0),0);

  if(total<=0) return null;

  let roll=Math.random()*total;

  for(const p of valid){
    roll-=Number(p.weight||0);
    if(roll<0) return p;
  }

  return valid[valid.length-1]||null;
}

function chooseRegularPrize({retry=false,round=0,state=null}={}){
  if(retry){
    const retryChoices=CONFIG.prizes.filter(
      p=>p.enabled &&
         p.mode==="random" &&
         p.allowOnRetry &&
         !p.retry &&
         prizeHasStock(p)
    );

    return chooseWeighted(retryChoices) ||
      retryChoices[0] ||
      CONFIG.prizes.find(p=>p.enabled && p.id==="nao-foi") ||
      CONFIG.prizes.find(p=>p.enabled);
  }

  const choices=CONFIG.prizes.filter(prize=>{
    if(!prize.enabled || prize.mode!=="random") return false;
    if(!prizeHasStock(prize)) return false;

    if(round<=Number(prize.blockFirst||0)) return false;

    const last=state?.lastWinRound?.[prize.id];
    if(Number.isFinite(last) && (round-last)<=Number(prize.minGap||0)) return false;

    return Number(prize.weight)>0;
  });

  return chooseWeighted(choices) ||
    CONFIG.prizes.find(p=>p.enabled && p.id==="nao-foi") ||
    CONFIG.prizes.find(p=>p.enabled && prizeHasStock(p)) ||
    CONFIG.prizes.find(p=>p.enabled);
}

function getDueControlledPrizes(state){
  return CONFIG.prizes
    .filter(p=>p.enabled && p.mode==="interval" && prizeHasStock(p))
    .map(prize=>{
      const s=ensureControlledPrizeState(state,prize);
      return {prize,schedule:s};
    })
    .filter(item=>state.rounds>=item.schedule.nextAt)
    .sort((a,b)=>a.schedule.nextAt-b.schedule.nextAt);
}

function choosePrize({retry=false}={}){
  if(retry){
    return {
      prize:chooseRegularPrize({retry:true}),
      round:null
    };
  }

  const state=loadState();
  state.rounds+=1;

  let prize=null;

  const due=getDueControlledPrizes(state);

  if(due.length){
    prize=due[0].prize;

    const schedule=due[0].schedule;
    const intervals =
      prize.intervals?.length
        ? prize.intervals.map(Number).filter(n=>n>0)
        : [10];

    schedule.nextAt=state.rounds+drawInterval(schedule,intervals);
  }else{
    prize=chooseRegularPrize({
      retry:false,
      round:state.rounds,
      state
    });
  }

  if(prize){
    state.lastWinRound[prize.id]=state.rounds;
  }

  saveState(state);

  return {
    prize,
    round:state.rounds
  };
}

function getAudioContext(){
  if(!audioContext){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(Ctx)audioContext=new Ctx();
  }
  return audioContext;
}

async function ensureAudioReady(){
  const ctx=getAudioContext();
  if(ctx&&ctx.state==="suspended"){try{await ctx.resume()}catch{}}
  return ctx;
}

function pointerTick(){
  pointer.classList.remove("tick");
  void pointer.offsetWidth;
  pointer.classList.add("tick");
}

function playClick(intensity=1){
  pointerTick();
  if(!soundEnabled)return;
  const ctx=getAudioContext();
  if(!ctx)return;
  const now=ctx.currentTime;
  const osc=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type="square";
  osc.frequency.setValueAtTime(190+Math.random()*40,now);
  osc.frequency.exponentialRampToValueAtTime(92,now+.03);
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(.024*intensity,now+.003);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.035);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now+.038);
}

function playWhoosh(){
  if(!soundEnabled)return;
  const ctx=getAudioContext();
  if(!ctx)return;
  const duration=.42;
  const buffer=ctx.createBuffer(1,ctx.sampleRate*duration,ctx.sampleRate);
  const d=buffer.getChannelData(0);
  for(let i=0;i<d.length;i++){
    const f=1-i/d.length;
    d[i]=(Math.random()*2-1)*f*.12;
  }
  const src=ctx.createBufferSource();
  const filter=ctx.createBiquadFilter();
  const gain=ctx.createGain();
  filter.type="bandpass";
  filter.frequency.value=760;
  filter.Q.value=.7;
  gain.gain.value=.085;
  src.buffer=buffer;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function playWin(){
  if(!soundEnabled)return;
  const ctx=getAudioContext();
  if(!ctx)return;
  [[523.25,0,.13],[659.25,.1,.14],[783.99,.2,.22]].forEach(([f,at,d])=>{
    const o=ctx.createOscillator();
    const g=ctx.createGain();
    const s=ctx.currentTime+at;
    o.type="sine";
    o.frequency.value=f;
    g.gain.setValueAtTime(.0001,s);
    g.gain.exponentialRampToValueAtTime(.055,s+.015);
    g.gain.exponentialRampToValueAtTime(.0001,s+d);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(s);
    o.stop(s+d+.02);
  });
}

function startSpinSound(){
  stopSpinSound();
  const start=performance.now();

  function tick(){
    if(!isSpinning)return;
    const p=Math.min(1,(performance.now()-start)/6200);
    const interval=38+Math.pow(p,2.35)*230;
    playClick(.95-p*.44);
    soundTimer=setTimeout(tick,interval);
  }

  playWhoosh();
  tick();
}

function stopSpinSound(){
  if(soundTimer){
    clearTimeout(soundTimer);
    soundTimer=null;
  }
}

function updateSound(){
  soundIcon.textContent=soundEnabled?"🔊":"🔇";
  soundButton.setAttribute("aria-label",soundEnabled?"Desativar som":"Ativar som");
}

soundButton.addEventListener("click",async()=>{
  await ensureAudioReady();
  soundEnabled=!soundEnabled;
  localStorage.setItem(STORAGE.sound,soundEnabled?"on":"off");
  updateSound();
  if(soundEnabled)playClick(.7);
  else stopSpinSound();
});

updateSound();

function startLights(){
  stopLights();
  const bulbs=[...lightRing.querySelectorAll(".bulb")];
  const slices=[...sliceLights.querySelectorAll(".slice-light")];
  let active=0;

  lightTimer=setInterval(()=>{
    bulbs.forEach((b,i)=>{
      const d=(i-active+bulbs.length)%bulbs.length;
      b.classList.toggle("dim",d>3&&d<bulbs.length-1);
      b.classList.toggle("hot",d===0||d===1);
    });

    if(slices.length){
      const sectorActive = Math.floor((active / Math.max(1, bulbs.length)) * slices.length) % slices.length;
      slices.forEach((s,i)=>{
        const d=(i-sectorActive+slices.length)%slices.length;
        s.classList.toggle("dim", d>1 && d<slices.length-1);
        s.classList.toggle("hot", d===0 || d===1);
      });
    }

    playClick(.22);
    active=(active+1)%bulbs.length;
  },72);
}

function stopLights(){
  if(lightTimer){
    clearInterval(lightTimer);
    lightTimer=null;
  }
  lightRing.querySelectorAll(".bulb").forEach(b=>b.classList.remove("dim","hot"));
  sliceLights.querySelectorAll(".slice-light").forEach(s=>s.classList.remove("dim","hot"));
}

function clearWinner(){
  wheelFrame.classList.remove("winner");
  wheel.classList.remove("winner-stop");
  winnerSector.classList.remove("active");
  winnerSector.style.background = "transparent";
  segmentLabels.querySelectorAll(".segment-label").forEach(x=>x.classList.remove("winner-label"));
  if(winnerTimer){
    clearTimeout(winnerTimer);
    winnerTimer=null;
  }
}

function showWinnerAnimation(prize){
  clearWinner();

  const angle = Number(prize.segmentAngle || (360 / Math.max(1, PRIZES.length)));
  const start = Number(prize.segmentStart ?? (-angle / 2));
  const index = Number(prize.segmentIndex || 0);
  const from = index * angle;
  const to = from + angle;

  /*
    A camada luminosa usa a mesma geometria do conic-gradient da roda,
    então o brilho fica exatamente dentro da fatia que realmente ganhou.
  */
  winnerSector.style.background = `
    conic-gradient(
      from ${start}deg,
      transparent 0deg ${from}deg,
      rgba(255,255,255,.02) ${from}deg,
      rgba(255,239,146,.52) ${from + angle * .18}deg,
      rgba(255,255,255,.27) ${from + angle * .50}deg,
      rgba(255,219,75,.48) ${from + angle * .82}deg,
      rgba(255,255,255,.02) ${to}deg,
      transparent ${to}deg 360deg
    )
  `;

  wheelFrame.classList.add("winner");
  wheel.classList.add("winner-stop");
  winnerSector.classList.add("active");

  segmentLabels.querySelectorAll(`[data-id="${CSS.escape(prize.id)}"]`).forEach(el=>el.classList.add("winner-label"));

  winnerTimer=setTimeout(clearWinner,3000);
}

function rotateToPrize(prize){
  const options = VISUAL_SEGMENTS.filter(item=>item.id===prize.id);
  const chosen = options.length ? options[Math.floor(Math.random()*options.length)] : prize;

  const jitter=(Math.random()*10)-5;
  const target=Number(chosen.centerAngle||0)+jitter;
  const current=((currentRotation%360)+360)%360;
  const desired=((360-target)+360)%360;
  const correction=((desired-current)+360)%360;
  currentRotation+=(8+Math.floor(Math.random()*2))*360+correction;
  wheel.style.transform=`rotate(${currentRotation}deg)`;
}


function launchConfetti(){
  confetti.innerHTML="";
  const colors=["#0b67c2","#10a84a","#ffd443","#ef4b43","#df3e76","#7334dc","#f5a019"];
  for(let i=0;i<48;i++){
    const p=document.createElement("span");
    p.className="confetti-piece";
    p.style.left=`${Math.random()*100}%`;
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    p.style.setProperty("--duration",`${1.55+Math.random()*.9}s`);
    p.style.setProperty("--delay",`${Math.random()*.32}s`);
    p.style.setProperty("--drift",`${-95+Math.random()*190}px`);
    p.style.setProperty("--rotation",`${400+Math.random()*760}deg`);
    confetti.appendChild(p);
  }
}

function renderCoupons(codes){
  couponList.innerHTML="";

  codes.forEach((code,index)=>{
    const row=document.createElement("div");
    row.className="coupon-item";
    row.innerHTML=`<span class="coupon-number">${index+1}</span><code>${code}</code><button class="coupon-copy" type="button" data-code="${code}">COPIAR</button>`;
    couponList.appendChild(row);
  });

  couponList.querySelectorAll(".coupon-copy").forEach(btn=>{
    btn.addEventListener("click",async()=>{
      try{
        await navigator.clipboard.writeText(btn.dataset.code);
        const old=btn.textContent;
        btn.textContent="COPIADO!";
        setTimeout(()=>btn.textContent=old,1200);
      }catch{
        btn.textContent="SELECIONE";
      }
    });
  });
}

function getHistory(){
  try{
    const h=JSON.parse(localStorage.getItem(STORAGE.history)||"[]");
    return Array.isArray(h)?h:[];
  }catch{
    return [];
  }
}

function addHistory(entry){
  const history=getHistory();
  history.unshift({
    id:`h-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    at:new Date().toISOString(),
    ...entry
  });

  localStorage.setItem(
    STORAGE.history,
    JSON.stringify(history.slice(0,2000))
  );
}

function openResult(prize,{retry=false,forced=false,round=null,remoteCoupons=null}={}){
  currentPrize=prize;
  currentRoundForResult=round;
  currentCoupons=Array.isArray(remoteCoupons) ? remoteCoupons : issueCodes(prize.pool,prize.couponCount);

  resultEmoji.textContent=prize.emoji;
  resultKicker.textContent=prize.kicker;
  resultTitle.textContent=prize.title;
  resultMessage.textContent=prize.message;
  resultPrize.textContent=prize.prizeText;

  futurePurchaseWarning.classList.toggle("hidden",!prize.futurePurchase);

  if(prize.couponCount>0){
    couponBox.classList.remove("hidden");

    if(currentCoupons.length===prize.couponCount){
      couponHelp.textContent=
        prize.couponCount>1
          ? `Você recebeu ${prize.couponCount} cupons diferentes. Guarde todos.`
          : "Guarde este código e apresente no atendimento.";

      renderCoupons(currentCoupons);
      copyAllCoupons.classList.toggle("hidden",currentCoupons.length<2);
      expirationText.textContent=`Validade: ${COUPON_DATA.expiration||"31/12/2026"}. Cada código é liberado uma única vez por esta roleta.`;
    }else{
      couponHelp.textContent="Os cupons desta promoção acabaram ou não foram carregados.";
      couponList.innerHTML='<div class="coupon-item"><span class="coupon-number">!</span><code>PROCURE A EQUIPE SAFÁRI</code></div>';
      copyAllCoupons.classList.add("hidden");
      expirationText.textContent="";
    }
  }else{
    couponBox.classList.add("hidden");
  }

  addHistory({
    round,
    prizeId:prize.id,
    prizeTitle:prize.title,
    prizeLabel:String(prize.label).replaceAll("\n"," "),
    retrySpin:Boolean(retry),
    forced:Boolean(forced),
    codes:[...currentCoupons]
  });

  markPrizeForParticipation(prize,{retry,forced});

  resultAction.textContent=
    prize.retry&&!retry&&!forced
      ? "GIRAR DE NOVO"
      : "ENTENDI";

  resultModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  if(!prize.retry){
    launchConfetti();
    playWin();
  }else{
    playClick(1);
  }

  if(navigator.vibrate){
    navigator.vibrate(prize.retry?[35]:[45,45,80]);
  }
}

function closeResult(){
  resultModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  updateParticipationUI();
}

copyAllCoupons.addEventListener("click",async()=>{
  if(!currentCoupons.length)return;

  try{
    await navigator.clipboard.writeText(currentCoupons.join("\n"));
    const old=copyAllCoupons.textContent;
    copyAllCoupons.textContent="COPIADOS!";
    setTimeout(()=>copyAllCoupons.textContent=old,1300);
  }catch{
    copyAllCoupons.textContent="SELECIONE";
  }
});

async function spin({retry=false,forced=null}={}){
  const isForced=Boolean(forced);

  if(!isForced && !window.SAFARI_SURVEY_READY){
    updateParticipationUI();
    return;
  }

  if(isSpinning||!canSpin({retry,forced:isForced})){
    updateParticipationUI();
    return;
  }

  await ensureAudioReady();
  clearWinner();

  isSpinning=true;
  spinButton.disabled=true;
  participationLock.classList.add("hidden");
  wheel.classList.add("spinning");

  if(retry&&!isForced){
    const p=loadParticipation();
    p.retryAvailable=false;
    saveParticipation(p);
  }

  let prize;
  let round=null;
  let remoteCoupons=null;

  if(isForced){
    prize=forced;
  }else{
    let remote=null;
    const surveyMode=window.SafariSurvey?.getMode?.()||"local";
    if(window.SafariBackend && surveyMode==="online"){
      try{
        remote=await window.SafariBackend.spin({retry,deviceId:getDeviceId(),surveySessionId:window.SafariSurvey?.getSessionId?.()||null});
      }catch(err){
        console.error("Giro online bloqueado:",err);
        isSpinning=false;
        spinButton.disabled=false;
        wheel.classList.remove("spinning");
        statusText.textContent=err?.message||"Não foi possível validar sua participação. Procure a equipe Safári.";
        return;
      }
    }
    if(remote?.prizeId){
      prize=CONFIG.prizes.find(p=>p.id===remote.prizeId);
      round=remote.spinNo ?? null;
      remoteCoupons=Array.isArray(remote.codes)?remote.codes:[];
    }else{
      const choice=choosePrize({retry});
      prize=choice.prize;
      round=choice.round;
    }
  }

  if(!prize){
    isSpinning=false;
    spinButton.disabled=false;
    wheel.classList.remove("spinning");
    statusText.textContent="Nenhum prêmio está disponível. Procure a equipe Safári.";
    return;
  }

  statusText.textContent=
    retry
      ? "Mais uma chance! Vamos ver onde a roleta vai parar..."
      : "Valendo! A roleta está girando...";

  rotateToPrize(prize);
  startSpinSound();
  startLights();

  setTimeout(()=>{
    isSpinning=false;
    wheel.classList.remove("spinning");
    stopSpinSound();
    stopLights();
    updateLabelCompensation();
    playClick(1.2);
    showWinnerAnimation(prize);
    statusText.textContent="Pronto! Veja o seu resultado.";

    setTimeout(
      ()=>openResult(prize,{retry,forced:isForced,round,remoteCoupons}),
      520
    );
  },6200);
}

spinButton.addEventListener("click",()=>{
  const p=loadParticipation();
  spin({retry:p.retryAvailable});
});

closeModal.addEventListener("click",closeResult);
resultModal.addEventListener("click",e=>{
  if(e.target.classList.contains("modal-shade"))closeResult();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!resultModal.classList.contains("hidden"))closeResult();
});

resultAction.addEventListener("click",()=>{
  const p=loadParticipation();

  if(currentPrize?.retry&&p.retryAvailable){
    closeResult();
    setTimeout(()=>spin({retry:true}),230);
  }else{
    closeResult();
  }
});

updateParticipationUI();

async function loadRemoteConfigIfAvailable(){
  if(!window.SafariBackend) return;
  try{
    const remote=await window.SafariBackend.loadConfig();
    if(remote?.prizes?.length){
      CONFIG=normalizeConfig(remote);
      PRIZES=CONFIG.prizes.filter(p=>p.enabled);
      localStorage.setItem(STORAGE.config,JSON.stringify(CONFIG));
      applyScreenConfig();buildSegments();buildBulbs();updateLabelCompensation();
    }
  }catch(err){console.warn("Configuração online indisponível:",err)}
}
loadRemoteConfigIfAvailable();

window.addEventListener("storage",(event)=>{
  if(event.key===STORAGE.config){
    CONFIG=loadConfig();
    PRIZES=CONFIG.prizes.filter(p=>p.enabled);
    applyScreenConfig();
    buildSegments();
    buildBulbs();
    updateLabelCompensation();
  }
});

function refreshWheelAfterReveal(){
  const run=()=>{
    updateGeometry();
    updateLabelCompensation();
  };
  run();
  requestAnimationFrame(run);
  setTimeout(run,60);
  setTimeout(run,180);
  setTimeout(run,420);
}

window.addEventListener("load", refreshWheelAfterReveal);
document.addEventListener("visibilitychange", ()=>{
  if(!document.hidden) refreshWheelAfterReveal();
});

window.addEventListener("safari:survey-completed",()=>{
  updateParticipationUI();
  refreshWheelAfterReveal();
});
window.addEventListener("safari:survey-reset",()=>{
  updateParticipationUI();
  refreshWheelAfterReveal();
});

window.safariRoleta={
  status(){
    const state=loadState();
    const used=getUsedMap();
    const participation=loadParticipation();

    const controlled=CONFIG.prizes
      .filter(p=>p.enabled&&p.mode==="interval")
      .map(p=>{
        const s=ensureControlledPrizeState(state,p);
        return {
          premio:p.title,
          proximaRodada:s.nextAt,
          faltam:Math.max(0,s.nextAt-state.rounds)
        };
      });

    const info={
      participacao:participation,
      rodadas:state.rounds,
      controlados:controlled,
      codigosDisponiveis:Object.fromEntries(
        CONFIG.prizes
          .filter(p=>p.pool)
          .map(p=>[p.title,availableCount(p.pool)])
      ),
      codigosEmitidos:Object.fromEntries(
        Object.entries(used).map(([k,v])=>[k,v.length])
      ),
      historico:getHistory().length,
      som:soundEnabled?"ligado":"desligado"
    };

    console.table(controlled);
    console.log(info);
    return info;
  },

  novoCliente(){
    localStorage.removeItem(STORAGE.participation);
    window.SafariSurvey?.resetForNextCustomer?.();
    currentPrize=null;
    currentCoupons=[];
    closeResult();
    updateParticipationUI();
    console.log("Novo cliente liberado neste aparelho. Rodadas, cupons e histórico foram mantidos.");
  },

  reset(){
    localStorage.removeItem(STORAGE.state);
    localStorage.removeItem("roleta_safari_v10_6_survey_responses");
    localStorage.removeItem("roleta_safari_v11_6_survey_responses");
    window.SafariSurvey?.resetForNextCustomer?.();
    localStorage.removeItem(STORAGE.used);
    localStorage.removeItem(STORAGE.participation);
    localStorage.removeItem(STORAGE.history);
    currentPrize=null;
    currentCoupons=[];
    closeResult();
    updateParticipationUI();
    console.log("Teste local totalmente resetado.");
  },

  force(id){
    const prize=CONFIG.prizes.find(p=>p.id===id && p.enabled);
    if(!prize){
      console.log("Prêmio não encontrado/ativo.",CONFIG.prizes.map(p=>p.id));
      return;
    }
    spin({forced:prize});
  }
};
