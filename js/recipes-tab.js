import { CATEGORIES, getCategoryLabel, getCategoryEmoji, generateId } from './constants.js';
import { searchRecipesOnline, searchPhotosOnline } from './api-service.js';
import { compressImageToDataUrl, isValidImageUrl } from './image-service.js';

let recipes = [];
let activeCategory = 'all';
let editingId = null;
let currentPhotoUrl = '';
let collectionId = 'default';
let onSaveCallback = null;

const els = {};

export function initRecipesTab(collection, saveCallback) {
  collectionId = collection;
  onSaveCallback = saveCallback;

  els.list = document.getElementById('recipes-list');
  els.categoryFilter = document.getElementById('category-filter');
  els.btnAdd = document.getElementById('btn-add-recipe');
  els.modalForm = document.getElementById('modal-recipe-form');
  els.modalView = document.getElementById('modal-view-recipe');
  els.modalPhotoChoice = document.getElementById('modal-photo-choice');
  els.modalSearchRecipes = document.getElementById('modal-search-recipes');
  els.modalSearchPhotos = document.getElementById('modal-search-photos');

  renderCategoryFilter();
  renderCategorySelect();
  bindEvents();
}

export function setRecipes(data) {
  recipes = data;
  renderList();
}

function renderCategoryFilter() {
  els.categoryFilter.innerHTML = `
    <button class="category-chip category-chip--active" data-cat="all">Все</button>
    ${CATEGORIES.map(c => `
      <button class="category-chip" data-cat="${c.id}">${c.emoji} ${c.label}</button>
    `).join('')}
  `;
}

function renderCategorySelect() {
  const select = document.getElementById('recipe-category');
  select.innerHTML = CATEGORIES.map(c =>
    `<option value="${c.id}">${c.emoji} ${c.label}</option>`
  ).join('');
}

function bindEvents() {
  els.categoryFilter.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    els.categoryFilter.querySelectorAll('.category-chip').forEach(c =>
      c.classList.toggle('category-chip--active', c === chip)
    );
    activeCategory = chip.dataset.cat;
    renderList();
  });

  els.btnAdd.addEventListener('click', () => openForm());

  els.modalForm.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => els.modalForm.close())
  );
  els.modalView.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => els.modalView.close())
  );
  els.modalPhotoChoice.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => els.modalPhotoChoice.close())
  );
  els.modalSearchRecipes.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => els.modalSearchRecipes.close())
  );
  els.modalSearchPhotos.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', () => els.modalSearchPhotos.close())
  );

  document.getElementById('btn-save-recipe').addEventListener('click', saveRecipe);
  document.getElementById('btn-add-ingredient').addEventListener('click', () => addIngredientRow());
  document.getElementById('btn-search-recipe').addEventListener('click', openRecipeSearch);
  document.getElementById('recipe-photo-area').addEventListener('click', () => els.modalPhotoChoice.showModal());
  document.getElementById('btn-photo-upload').addEventListener('click', () =>
    document.getElementById('photo-file-input').click()
  );
  document.getElementById('btn-photo-url').addEventListener('click', handlePhotoUrl);
  document.getElementById('btn-photo-search').addEventListener('click', () => {
    els.modalPhotoChoice.close();
    openPhotoSearch();
  });
  document.getElementById('btn-photo-search-run').addEventListener('click', runPhotoSearch);
  document.getElementById('photo-search-query').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runPhotoSearch();
  });

  document.getElementById('photo-file-input').addEventListener('change', handlePhotoUpload);
  document.getElementById('btn-delete-recipe').addEventListener('click', deleteRecipe);
  document.getElementById('btn-edit-recipe').addEventListener('click', () => {
    const id = els.modalView.dataset.recipeId;
    els.modalView.close();
    openForm(id);
  });
}

function renderList() {
  const filtered = activeCategory === 'all'
    ? recipes
    : recipes.filter(r => r.category === activeCategory);

  if (filtered.length === 0) {
    els.list.innerHTML = '<p class="empty-state">Пока нет рецептов. Добавьте первый!</p>';
    return;
  }

  els.list.innerHTML = filtered.map(r => `
    <article class="recipe-card" data-id="${r.id}">
      ${r.photo
        ? `<img class="recipe-card__image" src="${r.photo}" alt="${esc(r.name)}" loading="lazy">`
        : `<div class="recipe-card__image recipe-card__image--placeholder">${getCategoryEmoji(r.category)}</div>`
      }
      <div class="recipe-card__body">
        <span class="recipe-card__category">${getCategoryLabel(r.category)}</span>
        <h3 class="recipe-card__title">${esc(r.name)}</h3>
      </div>
    </article>
  `).join('');

  els.list.querySelectorAll('.recipe-card').forEach(card =>
    card.addEventListener('click', () => viewRecipe(card.dataset.id))
  );
}

function viewRecipe(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;

  els.modalView.dataset.recipeId = id;
  const content = document.getElementById('view-recipe-content');

  content.innerHTML = `
    ${recipe.photo
      ? `<img class="view-recipe__photo" src="${recipe.photo}" alt="${esc(recipe.name)}">`
      : `<div class="view-recipe__photo view-recipe__photo--placeholder">${getCategoryEmoji(recipe.category)}</div>`
    }
    <h2 class="view-recipe__title">${esc(recipe.name)}</h2>
    <span class="view-recipe__category">${getCategoryEmoji(recipe.category)} ${getCategoryLabel(recipe.category)}</span>
    <h4 class="view-recipe__section-title">Ингредиенты</h4>
    <ul class="view-recipe__ingredients">
      ${(recipe.ingredients || []).map(ing => `
        <li>${esc(ing.name)}${ing.grams ? ` <span>— ${ing.grams} г</span>` : ''}</li>
      `).join('')}
    </ul>
    <h4 class="view-recipe__section-title">Приготовление</h4>
    <p class="view-recipe__instructions">${esc(recipe.instructions)}</p>
  `;

  els.modalView.showModal();
}

function openForm(id = null) {
  editingId = id;
  currentPhotoUrl = '';
  const recipe = id ? recipes.find(r => r.id === id) : null;

  document.getElementById('form-title').textContent = recipe ? 'Редактировать рецепт' : 'Новый рецепт';
  document.getElementById('recipe-name').value = recipe?.name || '';
  document.getElementById('recipe-category').value = recipe?.category || 'hot';
  document.getElementById('recipe-instructions').value = recipe?.instructions || '';

  currentPhotoUrl = recipe?.photo || '';
  updatePhotoPreview();

  const list = document.getElementById('ingredients-list');
  list.innerHTML = '';
  if (recipe?.ingredients?.length) {
    recipe.ingredients.forEach(ing => addIngredientRow(ing.name, ing.grams));
  } else {
    addIngredientRow();
  }

  els.modalForm.showModal();
}

function addIngredientRow(name = '', grams = '') {
  const list = document.getElementById('ingredients-list');
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="text" class="ingredient-name" placeholder="Ингредиент" value="${esc(name)}">
    <div class="ingredient-row__grams">
      <input type="number" class="ingredient-grams" placeholder="0" min="0" value="${grams}">
      <span>г</span>
    </div>
    <button type="button" class="ingredient-row__remove" title="Удалить">&times;</button>
  `;
  row.querySelector('.ingredient-row__remove').addEventListener('click', () => {
    row.remove();
    if (!list.children.length) addIngredientRow();
  });
  list.appendChild(row);
}

function collectIngredients() {
  return [...document.querySelectorAll('#ingredients-list .ingredient-row')].map(row => ({
    name: row.querySelector('.ingredient-name').value.trim(),
    grams: row.querySelector('.ingredient-grams').value.trim(),
  })).filter(i => i.name);
}

async function saveRecipe() {
  const name = document.getElementById('recipe-name').value.trim();
  if (!name) {
    alert('Введите название рецепта');
    return;
  }

  const recipe = {
    id: editingId || generateId(),
    name,
    category: document.getElementById('recipe-category').value,
    ingredients: collectIngredients(),
    instructions: document.getElementById('recipe-instructions').value.trim(),
    photo: currentPhotoUrl,
    lastSelected: editingId
      ? recipes.find(r => r.id === editingId)?.lastSelected || null
      : null,
    createdAt: editingId
      ? recipes.find(r => r.id === editingId)?.createdAt || Date.now()
      : Date.now(),
  };

  const idx = recipes.findIndex(r => r.id === recipe.id);
  if (idx >= 0) {
    recipes[idx] = recipe;
  } else {
    recipes.push(recipe);
  }

  await onSaveCallback(recipes);
  els.modalForm.close();
}

async function deleteRecipe() {
  const id = els.modalView.dataset.recipeId;
  if (!id || !confirm('Удалить этот рецепт?')) return;

  recipes = recipes.filter(r => r.id !== id);
  await onSaveCallback(recipes);
  els.modalView.close();
}

function updatePhotoPreview() {
  const img = document.getElementById('recipe-photo-preview');
  const placeholder = document.getElementById('recipe-photo-placeholder');

  if (currentPhotoUrl) {
    img.src = currentPhotoUrl;
    img.hidden = false;
    placeholder.hidden = true;
  } else {
    img.hidden = true;
    placeholder.hidden = false;
  }
}

async function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  els.modalPhotoChoice.close();

  try {
    currentPhotoUrl = await compressImageToDataUrl(file);
    updatePhotoPreview();
  } catch {
    alert('Не удалось обработать фото');
  }
  e.target.value = '';
}

function handlePhotoUrl() {
  const url = prompt('Вставьте ссылку на фото (https://...):');
  if (!url) return;
  if (!isValidImageUrl(url.trim())) {
    alert('Некорректная ссылка. Используйте адрес, начинающийся с http:// или https://');
    return;
  }
  currentPhotoUrl = url.trim();
  updatePhotoPreview();
  els.modalPhotoChoice.close();
}

async function openRecipeSearch() {
  const query = document.getElementById('recipe-name').value.trim();
  if (!query) {
    alert('Введите название для поиска');
    return;
  }

  const track = document.getElementById('search-recipes-track');
  track.innerHTML = '<div class="carousel-slide"><div class="carousel-slide__card"><div class="loading-spinner"></div><p style="margin-top:0.5rem">Ищем рецепты...</p></div></div>';
  els.modalSearchRecipes.showModal();

  const results = await searchRecipesOnline(query);

  if (results.length === 0) {
    track.innerHTML = '<div class="carousel-slide"><div class="carousel-slide__card"><p>Ничего не найдено. Попробуйте другое название.</p></div></div>';
    document.getElementById('search-recipes-counter').textContent = '';
    return;
  }

  track.innerHTML = results.map((r, i) => `
    <div class="carousel-slide" data-index="${i}">
      <div class="carousel-slide__card">
        ${r.image ? `<img class="carousel-slide__image" src="${r.image}" alt="${esc(r.name)}">` : ''}
        <h4 class="carousel-slide__title">${esc(r.name)}</h4>
        <div class="carousel-slide__ingredients">
          <strong>Ингредиенты:</strong><br>
          ${r.ingredients.map(ing =>
            `${esc(ing.name)}${ing.grams ? ` — ${ing.grams} г` : ''}`
          ).join('<br>')}
        </div>
        ${r.instructions ? `<div class="carousel-slide__instructions">${esc(r.instructions.slice(0, 300))}${r.instructions.length > 300 ? '...' : ''}</div>` : ''}
        <button class="btn btn--primary btn-insert-recipe" data-index="${i}">Вставить в рецепт</button>
      </div>
    </div>
  `).join('');

  initCarousel('search-recipes', results, (item) => {
    document.getElementById('recipe-name').value = item.name;
    if (item.image) {
      currentPhotoUrl = item.image;
      updatePhotoPreview();
    }
    document.getElementById('recipe-instructions').value = item.instructions;

    const list = document.getElementById('ingredients-list');
    list.innerHTML = '';
    item.ingredients.forEach(ing => addIngredientRow(ing.name, ing.grams));
    if (!item.ingredients.length) addIngredientRow();

    els.modalSearchRecipes.close();
  });
}

async function openPhotoSearch() {
  const name = document.getElementById('recipe-name').value.trim();
  document.getElementById('photo-search-query').value = name;
  els.modalSearchPhotos.showModal();
  if (name) await runPhotoSearch();
  else renderPhotoSearchEmpty();
}

async function runPhotoSearch() {
  const query = document.getElementById('photo-search-query').value.trim();
  const track = document.getElementById('search-photos-track');

  if (!query) {
    renderPhotoSearchEmpty();
    return;
  }

  track.innerHTML = '<div class="carousel-slide"><div class="carousel-slide__card"><div class="loading-spinner"></div><p style="margin-top:0.5rem">Ищем фото...</p></div></div>';

  const results = await searchPhotosOnline(query);
  renderPhotoResults(results);
}

function renderPhotoSearchEmpty() {
  const track = document.getElementById('search-photos-track');
  track.innerHTML = '<div class="carousel-slide"><div class="carousel-slide__card"><p>Введите название блюда и нажмите «Найти»</p></div></div>';
  document.getElementById('search-photos-counter').textContent = '';
}

function renderPhotoResults(results) {
  const track = document.getElementById('search-photos-track');

  if (results.length === 0) {
    track.innerHTML = '<div class="carousel-slide"><div class="carousel-slide__card"><p>Фото не найдены. Попробуйте другое название или вставьте ссылку вручную.</p></div></div>';
    document.getElementById('search-photos-counter').textContent = '';
    return;
  }

  track.innerHTML = results.map((p, i) => `
    <div class="carousel-slide" data-index="${i}">
      <div class="carousel-slide__card">
        <img class="carousel-slide__image" src="${p.url}" alt="${esc(p.alt)}" loading="lazy">
        <p class="carousel-slide__source">${esc(p.source || '')}</p>
        <button class="btn btn--primary btn-select-photo">Выбрать</button>
      </div>
    </div>
  `).join('');

  initCarousel('search-photos', results, (item) => {
    currentPhotoUrl = item.url;
    updatePhotoPreview();
    els.modalSearchPhotos.close();
  }, true);
}

function initCarousel(prefix, items, onSelect, isPhoto = false) {
  let current = 0;
  const track = document.getElementById(`${prefix}-track`);
  const counter = document.getElementById(`${prefix}-counter`);
  const prev = document.getElementById(`${prefix}-prev`);
  const next = document.getElementById(`${prefix}-next`);

  function update() {
    track.style.transform = `translateX(-${current * 100}%)`;
    counter.textContent = `${current + 1} / ${items.length}`;
    prev.disabled = current === 0;
    next.disabled = current === items.length - 1;
  }

  prev.onclick = () => { if (current > 0) { current--; update(); } };
  next.onclick = () => { if (current < items.length - 1) { current++; update(); } };

  track.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-insert-recipe') || e.target.classList.contains('btn-select-photo')) {
      const idx = isPhoto ? current : parseInt(e.target.dataset.index, 10);
      onSelect(items[idx]);
    }
  });

  update();
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export function viewRecipeById(id) {
  viewRecipe(id);
}
