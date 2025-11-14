import model from './model.js';
import { MODAL_CLOSE_SEC } from './config.js';
import recipeView from './views/recipeView.js';
import searchView from './views/searchView.js';
import resultsView from './views/resultsView.js';
import paginationView from './views/paginationView.js';
import bookmarksView from './views/bookmarksView.js';
import addRecipeView from './views/addRecipeView.js';

import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { async } from 'regenerator-runtime';

class Controller {
  constructor(appModel) {
    this.model = appModel;
    this.#init();
  }

  controlRecipes = async () => {
    try {
      const id = window.location.hash.slice(1);

      if (!id) return;
      recipeView.renderSpinner();

      // 0) Update results view to mark selected search result
      resultsView.update(this.model.getSearchResultsPage());

      // 1) Updating bookmarks view
      bookmarksView.update(this.model.state.bookmarks);

      // 2) Loading recipe
      await this.model.loadRecipe(id);

      // 3) Rendering recipe
      recipeView.render(this.model.state.recipe);
    } catch (err) {
      recipeView.renderError();
      console.error(err);
    }
  };

  controlSearchResults = async () => {
    try {
      resultsView.renderSpinner();

      // 1) Get search query
      const query = searchView.getQuery();
      if (!query) return;

      // 2) Load search results
      await this.model.loadSearchResults(query);

      // 3) Render results
      resultsView.render(this.model.getSearchResultsPage());

      // 4) Render initial pagination buttons
      paginationView.render(this.model.state.search);
    } catch (err) {
      console.log(err);
    }
  };

  controlPagination = goToPage => {
    // 1) Render NEW results
    resultsView.render(this.model.getSearchResultsPage(goToPage));

    // 2) Render NEW pagination buttons
    paginationView.render(this.model.state.search);
  };

  controlServings = newServings => {
    // Update the recipe servings (in state)
    this.model.updateServings(newServings);

    // Update the recipe view
    recipeView.update(this.model.state.recipe);
  };

  controlAddBookmark = () => {
    // 1) Add/remove bookmark
    if (!this.model.state.recipe.bookmarked)
      this.model.addBookmark(this.model.state.recipe);
    else this.model.deleteBookmark(this.model.state.recipe.id);

    // 2) Update recipe view
    recipeView.update(this.model.state.recipe);

    // 3) Render bookmarks
    bookmarksView.render(this.model.state.bookmarks);
  };

  controlBookmarks = () => {
    bookmarksView.render(this.model.state.bookmarks);
  };

  controlAddRecipe = async newRecipe => {
    try {
      // Show loading spinner
      addRecipeView.renderSpinner();

      // Upload the new recipe data
      await this.model.uploadRecipe(newRecipe);
      console.log(this.model.state.recipe);

      // Render recipe
      recipeView.render(this.model.state.recipe);

      // Success message
      addRecipeView.renderMessage();

      // Render bookmark view
      bookmarksView.render(this.model.state.bookmarks);

      // Change ID in URL
      window.history.pushState(null, '', `#${this.model.state.recipe.id}`);

      // Close form window
      setTimeout(function () {
        addRecipeView.toggleWindow();
      }, MODAL_CLOSE_SEC * 1000);
    } catch (err) {
      console.error('💥', err);
      addRecipeView.renderError(err.message);
    }
  };

  #init() {
    bookmarksView.addHandlerRender(this.controlBookmarks);
    recipeView.addHandlerRender(this.controlRecipes);
    recipeView.addHandlerUpdateServings(this.controlServings);
    recipeView.addHandlerAddBookmark(this.controlAddBookmark);
    searchView.addHandlerSearch(this.controlSearchResults);
    paginationView.addHandlerClick(this.controlPagination);
    addRecipeView.addHandlerUpload(this.controlAddRecipe);
  }
}

new Controller(model);
