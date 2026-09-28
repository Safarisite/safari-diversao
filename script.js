"use strict";

const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const revealItems = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll(".counter");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   CABEÇALHO E MENU
========================================================= */
let scrollFrame = 0;

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 20);
  scrollFrame = 0;
}

function requestHeaderUpdate() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateHeader);
}

updateHeader();
window.addEventListener("scroll", requestHeaderUpdate, { passive: true });

function closeMenu() {
  menuButton?.classList.remove("active");
  mainNav?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

menuButton?.addEventListener("click", () => {
  const isOpen = mainNav?.classList.toggle("open") ?? false;
  menuButton.classList.toggle("active", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
});

mainNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 980) closeMenu();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

/* =========================================================
   ENTRADA SUAVE DAS SEÇÕES
========================================================= */
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -45px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

/* =========================================================
   CONTADORES
========================================================= */
let countersStarted = false;

function animateCounter(counter) {
  const target = Number(counter.dataset.target || 0);

  if (reducedMotion) {
    counter.textContent = target.toLocaleString("pt-BR");
    return;
  }

  const duration = 1350;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    counter.textContent = Math.floor(target * eased).toLocaleString("pt-BR");

    if (progress < 1) window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
}

const statsSection = document.querySelector(".stats-card");

if (statsSection && "IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting) || countersStarted) return;
      countersStarted = true;
      counters.forEach(animateCounter);
      observer.disconnect();
    },
    { threshold: 0.3 }
  );

  counterObserver.observe(statsSection);
} else {
  counters.forEach(animateCounter);
}

/* =========================================================
   PAUSA ANIMAÇÕES FORA DA TELA
========================================================= */
const animatedZones = document.querySelectorAll(".animated-zone");

if ("IntersectionObserver" in window && !reducedMotion) {
  const animationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-active", entry.isIntersecting);
      });
    },
    { threshold: 0.08, rootMargin: "150px 0px 150px" }
  );

  animatedZones.forEach((zone) => animationObserver.observe(zone));
} else {
  animatedZones.forEach((zone) => zone.classList.add("is-active"));
}

/* =========================================================
   FALLBACK DE IMAGENS
========================================================= */
function showTextLogo(container, label) {
  if (!container || container.querySelector(".fallback-logo")) return;
  const fallback = document.createElement("span");
  fallback.className = "fallback-logo";
  fallback.textContent = label || "Parceiro Safári";
  container.appendChild(fallback);
}

function handleImageError(image) {
  const imageShell = image.closest(".image-shell");
  if (imageShell) {
    imageShell.classList.add("is-fallback");
    return;
  }

  const brand = image.closest(".brand");
  if (brand) {
    image.hidden = true;
    const fallback = brand.querySelector(".brand-fallback");
    if (fallback) fallback.style.display = "block";
    return;
  }

  const partner = image.closest(".partner-logo");
  if (partner) {
    image.hidden = true;
    showTextLogo(partner, image.alt);
    return;
  }

  const association = image.closest(".associations article");
  if (association) {
    image.hidden = true;
    showTextLogo(association, image.alt);
    return;
  }

  image.hidden = true;
}

document.querySelectorAll("img").forEach((image) => {
  image.addEventListener("error", () => handleImageError(image), { once: true });

  if (image.complete && image.naturalWidth === 0) {
    handleImageError(image);
  }
});

/* =========================================================
   GUIA BIGTRON
========================================================= */
const popitGuide = document.getElementById("popitGuide");
const popitGuideMessage = document.getElementById("popitGuideMessage");
const popitGuideBubble = popitGuide?.querySelector(".popit-guide-bubble");
const popitGuideCharacter = document.getElementById("popitGuideCharacter");
const popitGuideClose = document.getElementById("popitGuideClose");
const popitGuideReopen = document.getElementById("popitGuideReopen");
const guideSections = Array.from(document.querySelectorAll("main section[data-guide-message]"));
let currentGuideSection = guideSections[0] || null;
let guideMessageTimer = 0;

function changeGuideMessage(message) {
  if (!message || !popitGuideMessage || popitGuideMessage.textContent === message) return;

  window.clearTimeout(guideMessageTimer);
  popitGuideBubble?.classList.add("is-changing");

  guideMessageTimer = window.setTimeout(() => {
    popitGuideMessage.textContent = message;
    popitGuideBubble?.classList.remove("is-changing");
  }, 120);
}

if (guideSections.length && "IntersectionObserver" in window) {
  const guideObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      currentGuideSection = visible.target;
      changeGuideMessage(visible.target.dataset.guideMessage);
    },
    { threshold: [0.15, 0.35, 0.55], rootMargin: "-17% 0px -38%" }
  );

  guideSections.forEach((section) => guideObserver.observe(section));
}

popitGuideCharacter?.addEventListener("click", () => {
  if (!guideSections.length) return;

  const currentIndex = Math.max(0, guideSections.indexOf(currentGuideSection));
  const nextSection = guideSections[currentIndex + 1] || guideSections[0];

  nextSection.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start"
  });
});

popitGuideClose?.addEventListener("click", () => {
  popitGuide?.classList.add("is-hidden");
  popitGuideReopen?.classList.add("is-visible");
});

popitGuideReopen?.addEventListener("click", () => {
  popitGuide?.classList.remove("is-hidden");
  popitGuideReopen.classList.remove("is-visible");
});

function updateGuideIntroVisibility() {
  if (!popitGuide) return;
  const shouldWait = window.innerWidth <= 680 && window.scrollY < Math.min(560, window.innerHeight * 0.72);
  popitGuide.classList.toggle("is-intro-hidden", shouldWait);
}

updateGuideIntroVisibility();
window.addEventListener("scroll", updateGuideIntroVisibility, { passive: true });
window.addEventListener("resize", updateGuideIntroVisibility);

/* =========================================================
   FAQ E RODAPÉ
========================================================= */
const faqItems = document.querySelectorAll(".faq-list details");
faqItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    faqItems.forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

const currentYear = document.getElementById("currentYear");
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

/* =========================================================
   ASSISTENTE SAFÁRI — RESPOSTAS AUTOMÁTICAS LOCAIS
   Observação: não envia dados para serviços externos.
========================================================= */
(() => {
  const launcher = document.getElementById("safariAssistantLauncher");
  const panel = document.getElementById("safariAssistant");
  const closeButton = document.getElementById("safariAssistantClose");
  const messages = document.getElementById("safariAssistantMessages");
  const form = document.getElementById("safariAssistantForm");
  const input = document.getElementById("safariAssistantInput");

  if (!launcher || !panel || !messages || !form || !input) return;

  const normalizeText = (value) => value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  let guideWasHiddenBeforeAssistant = false;
  let guideReopenWasVisibleBeforeAssistant = false;

  const hidePopitGuideForAssistant = () => {
    if (popitGuide) {
      guideWasHiddenBeforeAssistant = popitGuide.classList.contains("is-hidden");
      popitGuide.classList.add("assistant-open-hidden");
      popitGuide.setAttribute("aria-hidden", "true");
    }

    if (popitGuideReopen) {
      guideReopenWasVisibleBeforeAssistant = popitGuideReopen.classList.contains("is-visible");
      popitGuideReopen.classList.add("assistant-open-hidden");
    }
  };

  const restorePopitGuideAfterAssistant = () => {
    if (popitGuide) {
      popitGuide.classList.remove("assistant-open-hidden");
      popitGuide.setAttribute("aria-hidden", guideWasHiddenBeforeAssistant ? "true" : "false");
    }

    if (popitGuideReopen) {
      popitGuideReopen.classList.remove("assistant-open-hidden");
      popitGuideReopen.classList.toggle("is-visible", guideReopenWasVisibleBeforeAssistant);
    }
  };

  const openAssistant = () => {
    hidePopitGuideForAssistant();
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(() => input.focus({ preventScroll: true }), 100);
  };

  const closeAssistant = () => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    restorePopitGuideAfterAssistant();
    launcher.focus({ preventScroll: true });
  };

  const addMessage = (text, type = "bot", action = null) => {
    const wrapper = document.createElement("div");
    wrapper.className = `assistant-message assistant-message-${type}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    wrapper.appendChild(paragraph);

    if (action?.href && action?.label) {
      const link = document.createElement("a");
      link.className = "assistant-message-link";
      link.href = action.href;
      link.textContent = action.label;
      if (action.external) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      wrapper.appendChild(link);
    }

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  };

  const routeAnswer = (rawText) => {
    const text = normalizeText(rawText);

    if (/sac|reclam|avali|experiencia|elogio|sugest|problema|ruim|pessim/.test(text)) {
      return {
        text: "O SAC da Safári funciona dentro do próprio site. Você registra a experiência, recebe um protocolo e acompanha as respostas diretamente por lá.",
        action: { href: "sac.html", label: "Abrir o SAC →" }
      };
    }

    if (/empresa|historia|história|fundacao|fundação|quem somos|missao|missão|visao|visão|valores/.test(text)) {
      return {
        text: "Na página A Empresa você conhece a história da Safári, propósito, estrutura, atuação, personagens próprios e os formatos de projeto desenvolvidos para shopping centers.",
        action: { href: "empresa.html", label: "Conhecer a empresa →" }
      };
    }

    if (/bastidor|equipe|montagem|fabric|produc/.test(text)) {
      return {
        text: "Na galeria você encontra registros dos projetos, montagem, operação e momentos da Safári em shopping centers.",
        action: { href: "galeria.html", label: "Abrir galeria →" }
      };
    }

    if (/bigtron|big tr[oô]n|bigtrix|big trix|gelo|lava|personagem autoral|personagens autorais|universo safari/.test(text)) {
      return {
        text: "Bigtron, Bigtrix, Gelo, Lava e outros personagens fazem parte do universo próprio da Safári. As artes são sempre utilizadas em suas versões originais, sem alterar as características.",
        action: { href: "index.html#universo-safari", label: "Conhecer personagens →" }
      };
    }

    if (/portfolio|case|itiner|evento|loja|licenciado|licenciamento/.test(text)) {
      return {
        text: "O portfólio destaca primeiro os eventos itinerantes da Safári e também apresenta lojas e operações fixas já realizadas como cases históricos.",
        action: { href: "index.html#portfolio", label: "Ver portfólio →" }
      };
    }

    if (/foto|galeria|instagram|bastidor|equipe|montagem|fabric|produc/.test(text)) {
      return {
        text: "Na galeria você encontra bastidores, produção, montagem, equipe e registros dos projetos da Safári.",
        action: { href: "galeria.html", label: "Abrir galeria →" }
      };
    }

    if (/soluc|parque|circuito|inflavel|atracao|projeto|operacao/.test(text)) {
      return {
        text: "A Safári desenvolve eventos itinerantes, parques temáticos, circuitos infláveis, projetos especiais e operações completas para shopping centers.",
        action: { href: "index.html#solucoes", label: "Conhecer soluções →" }
      };
    }

    if (/parceria|parceiro|shopping center|shopping|levar|orcamento|proposta|comercial|contato|falar/.test(text)) {
      return {
        text: "Se você representa um shopping, use a área institucional do site e informe cidade, área disponível, período desejado e objetivo do projeto.",
        action: { href: "index.html#contato", label: "Ir para contato institucional →" }
      };
    }

    if (/parceir/.test(text)) {
      return {
        text: "A Safári já trabalhou com importantes grupos e empreendimentos. Você pode conferir a área de parcerias no site.",
        action: { href: "index.html#parcerias", label: "Ver parcerias →" }
      };
    }

    if (/endereco|onde fica|onde e|visitar|aberto|horario/.test(text)) {
      return {
        text: "As lojas exibidas no portfólio são cases já realizados e não são apresentadas como unidades atualmente em funcionamento. Para conhecer operações atuais, consulte o portfólio e o contato institucional.",
        action: { href: "index.html#portfolio", label: "Ver portfólio →" }
      };
    }

    if (/sobre|empresa|safari|quem sao|quem e/.test(text)) {
      return {
        text: "A Safári Diversão atua com entretenimento infantil para shopping centers, unindo criação, produção, implantação e operação de experiências.",
        action: { href: "empresa.html", label: "Conhecer a Safári →" }
      };
    }

    return {
      text: "Posso te ajudar a conhecer a empresa, eventos itinerantes, portfólio, galeria, personagens da Safári, parcerias, contato institucional ou o SAC."
    };
  };

  const sendPrompt = (value) => {
    const clean = value.trim();
    if (!clean) return;
    addMessage(clean, "user");
    input.value = "";
    const answer = routeAnswer(clean);
    window.setTimeout(() => addMessage(answer.text, "bot", answer.action), 180);
  };

  launcher.addEventListener("click", openAssistant);
  closeButton?.addEventListener("click", closeAssistant);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendPrompt(input.value);
  });

  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-assistant-prompt]");
    if (!button) return;
    sendPrompt(button.dataset.assistantPrompt || button.textContent || "");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) closeAssistant();
  });
})();

/* =========================================================
   TRANSIÇÃO DE MENU — BIGTRON + BIGTRIX
   V35: dispara somente nas abas A Empresa e SAC.
   Movimento visual: direita → esquerda (personagens entram pela direita).
========================================================= */
(() => {
  const nav = document.querySelector(".main-nav");
  if (!nav) return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reducedMotion) return;

  const overlay = document.createElement("div");
  overlay.className = "safari-page-transition";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <span class="safari-flight-trail"></span>
    <span class="safari-transition-spark spark-a"></span>
    <span class="safari-transition-spark spark-b"></span>
    <span class="safari-transition-spark spark-c"></span>
    <img class="safari-flight-character safari-flight-bigtrix" src="assets/personagens/originais/bigtrix-p2-original.png" alt="" decoding="async" />
    <img class="safari-flight-character safari-flight-bigtron" src="assets/personagens/originais/bigtron-p4-original.png" alt="" decoding="async" />
  `;
  document.body.appendChild(overlay);

  let running = false;
  const duration = 900;

  const closeMobileMenu = () => {
    nav.classList.remove("open");
    const toggle = document.querySelector(".menu-toggle");
    toggle?.classList.remove("active");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  const runTransition = (after) => {
    if (running) return;
    running = true;
    closeMobileMenu();
    overlay.classList.remove("is-running");
    void overlay.offsetWidth;
    overlay.classList.add("is-running");

    window.setTimeout(() => {
      after?.();
      window.setTimeout(() => {
        overlay.classList.remove("is-running");
        running = false;
      }, 120);
    }, duration);
  };

  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || running) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;

    const href = link.getAttribute("href")?.trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;

    let targetUrl;
    try {
      targetUrl = new URL(href, window.location.href);
    } catch {
      return;
    }

    if (targetUrl.origin !== window.location.origin) return;

    // A animação fica exclusiva para as duas abas institucionais escolhidas.
    const targetFile = targetUrl.pathname.split("/").pop()?.toLowerCase() || "";
    const animatedTabs = new Set(["empresa.html", "sac.html"]);
    if (!animatedTabs.has(targetFile)) return;

    // Evita animar/recarregar a aba que já está aberta.
    const currentFile = window.location.pathname.split("/").pop()?.toLowerCase() || "index.html";
    if (targetFile === currentFile && !targetUrl.hash) return;

    event.preventDefault();

    const sameDocument = targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search;
    if (sameDocument && targetUrl.hash) {
      runTransition(() => {
        const target = document.querySelector(targetUrl.hash);
        if (target) {
          history.pushState(null, "", targetUrl.hash);
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.location.assign(targetUrl.href);
        }
      });
      return;
    }

    runTransition(() => window.location.assign(targetUrl.href));
  });
})();
