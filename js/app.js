import { initFirebase, subscribeRecipes, saveRecipes, isConfigLoaded } from './firebase-service.js';
import { initRecipesTab, setRecipes as setRecipesTab, viewRecipeById } from './recipes-tab.js';
import { initRouletteTab, setRecipes as setRouletteRecipes } from './roulette-tab.js';

const LOCAL_KEY = 'recipes-bank-local';
let collectionId = 'default';
let recipes = [];

async function init() {
  initTabs();
  initSyncStatus();

  const fb = await initFirebase();
  if (fb.ok) {
    collectionId = fb.collection;
    subscribeRecipes(collectionId, (data, status) => {
      recipes = data;
      updateSyncStatus(status);
      refreshUI();
    });
  } else {
    loadLocal();
    updateSyncStatus('offline');
  }

  initRecipesTab(collectionId, persistRecipes);
  initRouletteTab(handleRouletteSelect);

  refreshUI();
}

function initTabs() {
  document.querySelectorAll('.tabs__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs__btn').forEach(b => b.classList.remove('tabs__btn--active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('tab-content--active'));
      btn.classList.add('tabs__btn--active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('tab-content--active');
    });
  });
}

function refreshUI() {
  setRecipesTab(recipes);
  setRouletteRecipes(recipes);
}

async function persistRecipes(updated) {
  recipes = updated;
  refreshUI();

  if (isConfigLoaded()) {
    try {
      await saveRecipes(collectionId, recipes);
      updateSyncStatus('connected');
    } catch {
      updateSyncStatus('error');
      saveLocal();
    }
  } else {
    saveLocal();
  }
}

async function handleRouletteSelect(recipeId, markSelected = false) {
  if (!markSelected) {
    openRecipeView(recipeId);
    return;
  }

  const idx = recipes.findIndex(r => r.id === recipeId);
  if (idx >= 0) {
    recipes[idx] = { ...recipes[idx], lastSelected: Date.now() };
    await persistRecipes(recipes);
  }
}

function openRecipeView(id) {
  document.querySelector('[data-tab="recipes"]')?.click();
  setTimeout(() => viewRecipeById(id), 150);
}

function loadLocal() {
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    recipes = data ? JSON.parse(data) : [];
  } catch {
    recipes = [];
  }
}

function saveLocal() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(recipes));
  updateSyncStatus('offline');
}

function initSyncStatus() {
  /* placeholder — updated dynamically */
}

function updateSyncStatus(status) {
  const el = document.getElementById('sync-status');
  el.className = 'sync-status';

  const texts = {
    connected: 'Синхронизировано',
    offline: 'Локальный режим',
    error: 'Ошибка синхронизации',
  };

  if (status === 'connected') el.classList.add('sync-status--connected');
  else if (status === 'error') el.classList.add('sync-status--error');
  else el.classList.add('sync-status--offline');

  el.querySelector('.sync-status__text').textContent = texts[status] || 'Подключение...';
}

init();
