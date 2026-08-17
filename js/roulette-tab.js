import { CATEGORIES, getCategoryLabel, weightedRandomPick } from './constants.js';

let recipes = [];
let selectedCategories = CATEGORIES.map(c => c.id);
let isSpinning = false;
let onSelectCallback = null;

const CARD_WIDTH = 132;
const REPEAT = 5;

export function initRouletteTab(onRecipeSelected) {
  onSelectCallback = onRecipeSelected;

  renderCategoryCheckboxes();
  document.getElementById('btn-spin').addEventListener('click', spin);

  document.getElementById('roulette-categories').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const id = e.target.value;
    if (e.target.checked) {
      if (!selectedCategories.includes(id)) selectedCategories.push(id);
    } else {
      selectedCategories = selectedCategories.filter(c => c !== id);
    }
    buildTrack();
  });
}

export function setRecipes(data) {
  recipes = data;
  buildTrack();
}

function renderCategoryCheckboxes() {
  const container = document.getElementById('roulette-categories');
  container.innerHTML = CATEGORIES.map(c => `
    <label class="roulette-cat-check">
      <input type="checkbox" value="${c.id}" checked>
      ${c.emoji} ${c.label}
    </label>
  `).join('');
}

function getEligibleRecipes() {
  return recipes.filter(r => selectedCategories.includes(r.category));
}

function buildTrack() {
  const track = document.getElementById('roulette-track');
  const eligible = getEligibleRecipes();

  if (eligible.length === 0) {
    track.innerHTML = '<div class="roulette-item roulette-item--placeholder">🍽️</div>';
    document.getElementById('btn-spin').disabled = true;
    return;
  }

  document.getElementById('btn-spin').disabled = false;

  const cards = [];
  for (let r = 0; r < REPEAT; r++) {
    eligible.forEach(recipe => {
      cards.push(createCard(recipe));
    });
  }
  track.innerHTML = cards.join('');
  centerTrack(track, eligible.length * CARD_WIDTH);
}

function createCard(recipe) {
  if (recipe.photo) {
    return `<div class="roulette-item" data-id="${recipe.id}">
      <img src="${recipe.photo}" alt="${recipe.name}" loading="lazy">
    </div>`;
  }
  return `<div class="roulette-item roulette-item--placeholder" data-id="${recipe.id}">🍽️</div>`;
}

function centerTrack(track, offsetPx) {
  const wrapper = track.parentElement;
  const center = wrapper.offsetWidth / 2 - CARD_WIDTH / 2;
  track.style.transform = `translateX(${center - offsetPx}px)`;
  track.dataset.baseOffset = center - offsetPx;
}

async function spin() {
  if (isSpinning) return;
  const eligible = getEligibleRecipes();
  if (eligible.length === 0) return;

  isSpinning = true;
  const btn = document.getElementById('btn-spin');
  btn.disabled = true;
  document.getElementById('roulette-result').innerHTML = '';

  const winner = weightedRandomPick(eligible);
  const track = document.getElementById('roulette-track');
  const baseOffset = parseFloat(track.dataset.baseOffset || 0);

  const winnerIndices = [];
  track.querySelectorAll('.roulette-item').forEach((el, i) => {
    if (el.dataset.id === winner.id) winnerIndices.push(i);
  });

  const targetIndex = winnerIndices[Math.floor(winnerIndices.length / 2)] || winnerIndices[0];
  const wrapper = track.parentElement;
  const center = wrapper.offsetWidth / 2 - CARD_WIDTH / 2;
  const targetOffset = center - targetIndex * CARD_WIDTH;

  const startOffset = baseOffset - eligible.length * CARD_WIDTH * 2;
  const duration = 4000;
  const startTime = performance.now();

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOut(progress);
    const current = startOffset + (targetOffset - startOffset) * eased;
    track.style.transform = `translateX(${current}px)`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      finishSpin(winner);
    }
  }

  requestAnimationFrame(animate);
}

async function finishSpin(winner) {
  const result = document.getElementById('roulette-result');
  result.innerHTML = `
    <p class="roulette-result__name">🎉 ${winner.name}</p>
    <span class="roulette-result__link" data-id="${winner.id}">Посмотреть рецепт →</span>
  `;

  result.querySelector('.roulette-result__link').addEventListener('click', () => {
    if (onSelectCallback) onSelectCallback(winner.id, false);
  });

  await onSelectCallback(winner.id, true);

  isSpinning = false;
  document.getElementById('btn-spin').disabled = false;
}

export function getSelectedCategories() {
  return selectedCategories;
}
