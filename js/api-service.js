const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

export async function searchRecipesOnline(query) {
  if (!query.trim()) return [];

  const url = `${MEALDB_BASE}/search.php?s=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.meals) return [];

  return data.meals.map(parseMealDBRecipe);
}

/** Бесплатный поиск фото: TheMealDB + Wikimedia Commons (без API-ключей) */
export async function searchPhotosOnline(query) {
  const q = query.trim() || 'food';
  const [mealPhotos, wikiPhotos] = await Promise.all([
    searchMealDBPhotos(q),
    searchWikimediaPhotos(q),
  ]);

  const seen = new Set();
  const merged = [];

  for (const photo of [...mealPhotos, ...wikiPhotos]) {
    if (!photo.url || seen.has(photo.url)) continue;
    seen.add(photo.url);
    merged.push(photo);
  }

  return merged;
}

async function searchMealDBPhotos(query) {
  try {
    const url = `${MEALDB_BASE}/search.php?s=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.meals) return [];

    return data.meals
      .filter(m => m.strMealThumb)
      .map(m => ({
        url: m.strMealThumb,
        alt: m.strMeal,
        source: 'TheMealDB',
      }));
  } catch {
    return [];
  }
}

async function searchWikimediaPhotos(query) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gssearch: `${query} food dish`,
      gsnamespace: '6',
      gslimit: '15',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '500',
      format: 'json',
      origin: '*',
    });

    const res = await fetch(`${WIKIMEDIA_API}?${params}`);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return [];

    return Object.values(pages)
      .filter(p => p.thumbnail?.source)
      .map(p => ({
        url: p.thumbnail.source,
        alt: (p.title || query).replace(/^File:/, ''),
        source: 'Wikimedia',
      }));
  } catch {
    return [];
  }
}

function parseMealDBRecipe(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      const grams = parseMeasureToGrams(measure);
      ingredients.push({ name: name.trim(), grams: grams || '' });
    }
  }

  return {
    name: meal.strMeal,
    image: meal.strMealThumb,
    ingredients,
    instructions: meal.strInstructions || '',
    source: meal.strSource || '',
  };
}

function parseMeasureToGrams(measure) {
  if (!measure) return '';
  const str = measure.trim().toLowerCase();

  const numMatch = str.match(/^([\d./]+)\s*(.*)/);
  if (!numMatch) return '';

  const amount = evalFraction(numMatch[1]);
  const unit = numMatch[2];

  const conversions = {
    g: 1, gram: 1, grams: 1,
    kg: 1000,
    ml: 1, l: 1000,
    oz: 28.35,
    lb: 453.6, lbs: 453.6,
    cup: 240, cups: 240,
    tbsp: 15, tablespoon: 15, tablespoons: 15,
    tsp: 5, teaspoon: 5, teaspoons: 5,
  };

  for (const [key, factor] of Object.entries(conversions)) {
    if (unit.startsWith(key)) {
      return Math.round(amount * factor);
    }
  }

  return '';
}

function evalFraction(str) {
  if (str.includes('/')) {
    const [a, b] = str.split('/').map(Number);
    return b ? a / b : a;
  }
  return parseFloat(str) || 0;
}
