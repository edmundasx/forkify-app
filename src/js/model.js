import { async } from 'regenerator-runtime';
import { API_URL, RES_PER_PAGE, KEY } from './config.js';
// import { getJSON, sendJSON } from './helpers.js';
import { AJAX } from './helpers.js';

class Model {
  state = {
    recipe: {},
    search: {
      query: '',
      results: [],
      page: 1,
      resultsPerPage: RES_PER_PAGE,
    },
    bookmarks: [],
  };

  constructor() {
    this.#loadBookmarks();
  }

  #createRecipeObject(data) {
    const { recipe } = data.data;
    return {
      id: recipe.id,
      title: recipe.title,
      publisher: recipe.publisher,
      sourceUrl: recipe.source_url,
      image: recipe.image_url,
      servings: recipe.servings,
      cookingTime: recipe.cooking_time,
      ingredients: recipe.ingredients,
      ...(recipe.key && { key: recipe.key }),
    };
  }

  async loadRecipe(id) {
    try {
      const data = await AJAX(`${API_URL}${id}?key=${KEY}`);
      this.state.recipe = this.#createRecipeObject(data);

      this.state.recipe.bookmarked = this.state.bookmarks.some(
        bookmark => bookmark.id === id
      );

      console.log(this.state.recipe);
    } catch (err) {
      // Temp error handling
      console.error(`${err} 💥💥💥💥`);
      throw err;
    }
  }

  async loadSearchResults(query) {
    try {
      this.state.search.query = query;

      const data = await AJAX(`${API_URL}?search=${query}&key=${KEY}`);
      console.log(data);

      this.state.search.results = data.data.recipes.map(rec => ({
        id: rec.id,
        title: rec.title,
        publisher: rec.publisher,
        image: rec.image_url,
        ...(rec.key && { key: rec.key }),
      }));
      this.state.search.page = 1;
    } catch (err) {
      console.error(`${err} 💥💥💥💥`);
      throw err;
    }
  }

  getSearchResultsPage(page = this.state.search.page) {
    this.state.search.page = page;

    const start = (page - 1) * this.state.search.resultsPerPage; // 0
    const end = page * this.state.search.resultsPerPage; // 9

    return this.state.search.results.slice(start, end);
  }

  updateServings(newServings) {
    this.state.recipe.ingredients.forEach(ing => {
      ing.quantity = (ing.quantity * newServings) / this.state.recipe.servings;
      // newQt = oldQt * newServings / oldServings // 2 * 8 / 4 = 4
    });

    this.state.recipe.servings = newServings;
  }

  #persistBookmarks() {
    localStorage.setItem('bookmarks', JSON.stringify(this.state.bookmarks));
  }

  addBookmark(recipe) {
    // Add bookmark
    this.state.bookmarks.push(recipe);

    // Mark current recipe as bookmarked
    if (recipe.id === this.state.recipe.id) this.state.recipe.bookmarked = true;

    this.#persistBookmarks();
  }

  deleteBookmark(id) {
    // Delete bookmark
    const index = this.state.bookmarks.findIndex(el => el.id === id);
    this.state.bookmarks.splice(index, 1);

    // Mark current recipe as NOT bookmarked
    if (id === this.state.recipe.id) this.state.recipe.bookmarked = false;

    this.#persistBookmarks();
  }

  #loadBookmarks() {
    const storage = localStorage.getItem('bookmarks');
    if (storage) this.state.bookmarks = JSON.parse(storage);
  }

  clearBookmarks() {
    localStorage.clear('bookmarks');
  }

  async uploadRecipe(newRecipe) {
    try {
      const ingredients = Object.entries(newRecipe)
        .filter(entry => entry[0].startsWith('ingredient') && entry[1] !== '')
        .map(ing => {
          const ingArr = ing[1].split(',').map(el => el.trim());
          // const ingArr = ing[1].replaceAll(' ', '').split(',');
          if (ingArr.length !== 3)
            throw new Error(
              'Wrong ingredient fromat! Please use the correct format :)'
            );

          const [quantity, unit, description] = ingArr;

          return { quantity: quantity ? +quantity : null, unit, description };
        });

      const recipe = {
        title: newRecipe.title,
        source_url: newRecipe.sourceUrl,
        image_url: newRecipe.image,
        publisher: newRecipe.publisher,
        cooking_time: +newRecipe.cookingTime,
        servings: +newRecipe.servings,
        ingredients,
      };

      const data = await AJAX(`${API_URL}?key=${KEY}`, recipe);
      this.state.recipe = this.#createRecipeObject(data);
      this.addBookmark(this.state.recipe);
    } catch (err) {
      throw err;
    }
  }
}

export default new Model();
