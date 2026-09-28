"use strict";

const filterButtons = [...document.querySelectorAll(".gallery-filter")];
const cards = [...document.querySelectorAll(".gallery-card")];
const lightbox = document.getElementById("galleryLightbox");
const lightboxImage = document.getElementById("galleryLightboxImage");
const lightboxCaption = document.getElementById("galleryLightboxCaption");
const closeButton = lightbox?.querySelector(".gallery-lightbox-close");
const prevButton = lightbox?.querySelector(".gallery-lightbox-prev");
const nextButton = lightbox?.querySelector(".gallery-lightbox-next");
let visibleCards = [...cards];
let activeIndex = 0;
let lastFocusedElement = null;

function categoriesOf(card) {
  return (card.dataset.category || "").split(/\s+/).filter(Boolean);
}

function applyFilter(filter) {
  cards.forEach((card) => {
    const visible = filter === "all" || categoriesOf(card).includes(filter);
    card.classList.toggle("is-hidden", !visible);
    card.setAttribute("aria-hidden", String(!visible));
  });
  visibleCards = cards.filter((card) => !card.classList.contains("is-hidden"));
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    applyFilter(button.dataset.filter || "all");
  });
});

function cardData(card) {
  const img = card.querySelector("img");
  const title = card.querySelector("figcaption strong")?.textContent?.trim() || "Projeto Safári";
  const description = card.querySelector("figcaption span")?.textContent?.trim() || "";
  return { src: img?.currentSrc || img?.src || "", alt: img?.alt || title, caption: description ? `${title} — ${description}` : title };
}

function renderLightbox(index) {
  if (!visibleCards.length || !lightbox || !lightboxImage || !lightboxCaption) return;
  activeIndex = (index + visibleCards.length) % visibleCards.length;
  const data = cardData(visibleCards[activeIndex]);
  lightboxImage.src = data.src;
  lightboxImage.alt = data.alt;
  lightboxCaption.textContent = data.caption;
}

function openLightbox(card) {
  if (!lightbox) return;
  visibleCards = cards.filter((item) => !item.classList.contains("is-hidden"));
  const index = Math.max(0, visibleCards.indexOf(card));
  lastFocusedElement = document.activeElement;
  renderLightbox(index);
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  closeButton?.focus();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

cards.forEach((card) => {
  card.querySelector(".gallery-card-open")?.addEventListener("click", () => openLightbox(card));
});

closeButton?.addEventListener("click", closeLightbox);
prevButton?.addEventListener("click", () => renderLightbox(activeIndex - 1));
nextButton?.addEventListener("click", () => renderLightbox(activeIndex + 1));
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (!lightbox?.classList.contains("is-open")) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") renderLightbox(activeIndex - 1);
  if (event.key === "ArrowRight") renderLightbox(activeIndex + 1);
});
