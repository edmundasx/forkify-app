import model from '../model.js';
import { API_URL, KEY, RES_PER_PAGE } from '../config.js';
import { AJAX } from '../helpers.js';

jest.mock('../helpers.js', () => ({
  AJAX: jest.fn(),
}));

describe('Model feature flows', () => {
  beforeEach(() => {
    model.state = {
      recipe: {},
      search: {
        query: '',
        results: [],
        page: 1,
        resultsPerPage: RES_PER_PAGE,
      },
      bookmarks: [],
    };
    localStorage.clear();
    jest.clearAllMocks();
  });

  // 01: Test search function by inputting keywords to the searchbar.
  it('loads search results for a keyword and stores them with the query', async () => {
    const recipeStub = {
      id: 'abc',
      title: 'Test Pasta',
      publisher: 'Chef Test',
      image_url: 'img.jpg',
      key: 'user-key',
    };

    AJAX.mockResolvedValue({ data: { recipes: [recipeStub] } });

    await model.loadSearchResults('pasta');

    expect(AJAX).toHaveBeenCalledWith(`${API_URL}?search=pasta&key=${KEY}`);
    expect(model.state.search.query).toBe('pasta');
    expect(model.state.search.results).toEqual([
      {
        id: 'abc',
        title: 'Test Pasta',
        publisher: 'Chef Test',
        image: 'img.jpg',
        key: 'user-key',
      },
    ]);
    expect(model.state.search.page).toBe(1);
  });

  // 05: Test if it is possible to navigate through search results.
  it('returns paginated search results for easy navigation', () => {
    model.state.search.results = Array.from({ length: 25 }, (_, index) => ({
      id: `id-${index}`,
      title: `Recipe ${index}`,
      publisher: 'Tester',
      image: `img-${index}.jpg`,
    }));

    const secondPage = model.getSearchResultsPage(2);
    const thirdPage = model.getSearchResultsPage(3);

    expect(secondPage).toHaveLength(RES_PER_PAGE);
    expect(secondPage[0].id).toBe('id-10');
    expect(secondPage[RES_PER_PAGE - 1].id).toBe('id-19');
    expect(thirdPage).toHaveLength(5);
    expect(model.state.search.page).toBe(3);
  });

  // 02: Test for recipe display, checking if it matches display criteria (e.g. ingredients, instructions, serving size).
  it('loads recipe details and flags bookmarked recipes', async () => {
    const recipeId = 'recipe-123';
    model.state.bookmarks.push({ id: recipeId, title: 'Saved', publisher: 'Chef' });

    AJAX.mockResolvedValue({
      data: {
        recipe: {
          id: recipeId,
          title: 'Loaded Recipe',
          publisher: 'Chef',
          source_url: 'http://example.com',
          image_url: 'img.png',
          servings: 4,
          cooking_time: 20,
          ingredients: [],
        },
      },
    });

    await model.loadRecipe(recipeId);

    expect(model.state.recipe).toMatchObject({
      id: recipeId,
      title: 'Loaded Recipe',
      publisher: 'Chef',
      sourceUrl: 'http://example.com',
      image: 'img.png',
      servings: 4,
      cookingTime: 20,
      ingredients: [],
      bookmarked: true,
    });
  });

  // 03: Test bookmarking function (adding and removing bookmarks).
  it('adds and removes bookmarks while syncing recipe bookmark flag', () => {
    model.state.recipe = {
      id: 'bookmark-1',
      title: 'Bookmark Me',
      servings: 2,
      ingredients: [],
    };

    model.addBookmark(model.state.recipe);
    expect(model.state.bookmarks).toHaveLength(1);
    expect(model.state.recipe.bookmarked).toBe(true);
    expect(localStorage.getItem('bookmarks')).toEqual(
      JSON.stringify([model.state.recipe])
    );

    model.deleteBookmark('bookmark-1');
    expect(model.state.bookmarks).toHaveLength(0);
    expect(model.state.recipe.bookmarked).toBe(false);
    expect(localStorage.getItem('bookmarks')).toEqual('[]');
  });

  // (Extra internal test – serving size recalculation, not mapped to a given ID.)
  it('updates serving sizes and resizes ingredient quantities', () => {
    model.state.recipe = {
      id: 'servings-1',
      title: 'Resizable',
      servings: 4,
      ingredients: [
        { quantity: 2, unit: 'kg', description: 'Flour' },
        { quantity: 1, unit: 'l', description: 'Water' },
      ],
    };

    model.updateServings(8);

    expect(model.state.recipe.servings).toBe(8);
    expect(model.state.recipe.ingredients).toEqual([
      { quantity: 4, unit: 'kg', description: 'Flour' },
      { quantity: 2, unit: 'l', description: 'Water' },
    ]);
  });

  // 04: Test this case by creating a recipe (user upload flow).
  it('uploads a user recipe and bookmarks it', async () => {
    const newRecipe = {
      title: 'User Recipe',
      sourceUrl: 'http://example.com',
      image: 'img-user.png',
      publisher: 'User',
      cookingTime: '15',
      servings: '2',
      ingredient1: '0.5,kg,Sugar',
      ingredient2: '1,,Flour',
      ingredient3: '',
    };

    AJAX.mockResolvedValue({
      data: {
        recipe: {
          id: 'user-1',
          title: 'User Recipe',
          publisher: 'User',
          source_url: 'http://example.com',
          image_url: 'img-user.png',
          servings: 2,
          cooking_time: 15,
          ingredients: [
            { quantity: 0.5, unit: 'kg', description: 'Sugar' },
            { quantity: 1, unit: '', description: 'Flour' },
          ],
        },
      },
    });

    await model.uploadRecipe(newRecipe);

    expect(AJAX).toHaveBeenCalledWith(`${API_URL}?key=${KEY}`, {
      title: 'User Recipe',
      source_url: 'http://example.com',
      image_url: 'img-user.png',
      publisher: 'User',
      cooking_time: 15,
      servings: 2,
      ingredients: [
        { quantity: 0.5, unit: 'kg', description: 'Sugar' },
        { quantity: 1, unit: '', description: 'Flour' },
      ],
    });

    expect(model.state.recipe).toMatchObject({
      id: 'user-1',
      title: 'User Recipe',
      publisher: 'User',
      servings: 2,
      cookingTime: 15,
      bookmarked: true,
    });
    expect(model.state.bookmarks[0].id).toBe('user-1');
  });

  // 06: Test responsive design. (NOTE: not covered here; should be implemented in a separate UI/component test suite, not in the model layer.)
});
