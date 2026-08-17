export const CATEGORIES = [
  { id: 'soup', label: 'Суп', emoji: '🍲' },
  { id: 'hot', label: 'Горячее', emoji: '🍖' },
  { id: 'salads', label: 'Салаты', emoji: '🥗' },
  { id: 'desserts', label: 'Десерты', emoji: '🍰' },
  { id: 'breakfasts', label: 'Завтраки', emoji: '🥞' },
  { id: 'snacks', label: 'Закуски', emoji: '🥨' },
];

export const WEIGHT_RESET_DAYS = 30;
export const MIN_WEIGHT = 0.1;

export function getCategoryLabel(id) {
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ? cat.label : id;
}

export function getCategoryEmoji(id) {
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ? cat.emoji : '🍽️';
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getEffectiveWeight(recipe) {
  if (!recipe.lastSelected) return 1;
  const daysSince = (Date.now() - recipe.lastSelected) / (1000 * 60 * 60 * 24);
  if (daysSince >= WEIGHT_RESET_DAYS) return 1;
  return MIN_WEIGHT + (1 - MIN_WEIGHT) * (daysSince / WEIGHT_RESET_DAYS);
}

export function weightedRandomPick(recipes) {
  if (recipes.length === 0) return null;
  if (recipes.length === 1) return recipes[0];

  const weights = recipes.map(r => getEffectiveWeight(r));
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;

  for (let i = 0; i < recipes.length; i++) {
    random -= weights[i];
    if (random <= 0) return recipes[i];
  }
  return recipes[recipes.length - 1];
}
