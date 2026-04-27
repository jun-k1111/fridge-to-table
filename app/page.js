// WHAT: Declare this as a client component so it can hold state and handle events
// HOW: "use client" must be the very first line (before any imports) to take effect
// OUTCOME: useState, event handlers, and async fetch calls all work in this file
"use client";

// WHAT: Import React state hook to manage ingredients, recipe, and UI state
// HOW: Destructured import — only useState is needed from react
// OUTCOME: Component has six independent state slices managed cleanly
import { useState } from "react";

// WHAT: Import all custom components that make up the application UI
// HOW: Named default imports from the components directory
// OUTCOME: page.js is the composition root — it assembles and orchestrates all pieces
import IngredientInput from "../components/IngredientInput";
import FilterPanel     from "../components/FilterPanel";
import RecipeDisplay   from "../components/RecipeDisplay";
import LoadingState    from "../components/LoadingState";

// WHAT: Default filter values used when the page first loads
// HOW: Object constant defined outside the component so it never changes between renders
// OUTCOME: FilterPanel always starts with "No restriction / Beginner / 2 people" selected
const DEFAULT_FILTERS = {
  dietary:  "none",
  skill:    "beginner",
  servings: "2",
};

// WHAT: Home page component — the main application view
// HOW: Returns JSX that renders the header, input form, and recipe output
// OUTCOME: User lands here, adds ingredients, hits Generate, and sees the recipe
export default function Home() {
  // WHAT: List of ingredient strings the user has added
  // HOW: useState initializes to an empty array; components call onAdd/onRemove to update
  // OUTCOME: IngredientInput reads this array to render chips and update it via callbacks
  const [ingredients, setIngredients] = useState([]);

  // WHAT: Current filter selections (dietary, skill, servings)
  // HOW: useState with the DEFAULT_FILTERS object; FilterPanel calls onFilterChange to update
  // OUTCOME: Always reflects the user's current preference selections
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // WHAT: The recipe object returned by the Claude API — null until generation completes
  // HOW: Set to the parsed recipe object on success; reset to null on each new generation
  // OUTCOME: RecipeDisplay only renders when recipe is non-null
  const [recipe, setRecipe] = useState(null);

  // WHAT: Boolean flag — true while the API call is in flight
  // HOW: Set to true before fetch, back to false in the finally block
  // OUTCOME: Loading spinner shows during API call; form and button are disabled
  const [isLoading, setIsLoading] = useState(false);

  // WHAT: Error message string — null when there's no error
  // HOW: Set to an error string in catch blocks; cleared before each new generation
  // OUTCOME: Error banner shows when something goes wrong; hides when the user retries
  const [error, setError] = useState(null);

  // WHAT: Chef Mode toggle — activates Marco Fuoco persona and orange UI theme
  // HOW: Boolean toggled by the Chef Mode button; propagated to all components
  // OUTCOME: When true, all components switch to orange styling and Marco's voice
  const [chefMode, setChefMode] = useState(false);

  // ── Ingredient Callbacks ─────────────────────────────────────
  // WHAT: Add a new ingredient to the list
  // HOW: Spread existing array and append the new ingredient string
  // OUTCOME: Ingredient chips update immediately without mutating state directly
  const handleAddIngredient = (ingredient) => {
    setIngredients((prev) => [...prev, ingredient]);
  };

  // WHAT: Remove an ingredient by index, OR clear all if index is -1
  // HOW: filter() creates a new array excluding the item at the given index
  // OUTCOME: Clicking × on a chip removes only that chip; "Clear all" empties the list
  const handleRemoveIngredient = (index) => {
    if (index === -1) {
      // WHAT: Clear all ingredients when "Clear all" is clicked
      // HOW: Set state to an empty array
      // OUTCOME: All chips disappear and the user can start fresh
      setIngredients([]);
    } else {
      // WHAT: Remove the ingredient at the specified index
      // HOW: filter() keeps all items except the one where the index matches
      // OUTCOME: Exactly the clicked chip is removed; all others remain
      setIngredients((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // ── Recipe Generation ────────────────────────────────────────
  // WHAT: Trigger a recipe generation request to the Claude API
  // HOW: Validates input, sends POST fetch, parses response, updates state
  // OUTCOME: On success, sets recipe state and shows RecipeDisplay; errors show banner
  const handleGenerate = async () => {
    // WHAT: Prevent submission if no ingredients have been added
    // HOW: Early return with an error message if the array is empty
    // OUTCOME: User sees a friendly reminder instead of an API call that would fail
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient before generating a recipe.");
      return;
    }

    // WHAT: Reset previous results and errors before each new generation
    // HOW: Clear recipe and error state so stale data doesn't persist
    // OUTCOME: A clean slate — no old recipe or error is visible during the new request
    setRecipe(null);
    setError(null);
    setIsLoading(true);

    try {
      // WHAT: Send the ingredient list and filters to the Claude API route
      // HOW: POST fetch with JSON body; api/generate/route.js handles the Claude call
      // OUTCOME: Claude receives all context and returns a structured recipe
      console.log("INGREDIENT LIST SENT TO API:", ingredients);
      console.log("FILTERS SENT TO API:", filters);
      console.log("CHEF MODE:", chefMode);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // WHAT: Serialize ingredients, filters, and chefMode into the request body
        // HOW: JSON.stringify converts the JavaScript object to a JSON string
        // OUTCOME: API route can call request.json() to parse these values back
        body: JSON.stringify({ ingredients, filters, chefMode }),
      });

      // WHAT: Parse the API response body as JSON regardless of success or failure
      // HOW: response.json() reads the body stream and parses it — always call this once
      // OUTCOME: data contains either { recipe } on success or { error } on failure
      const data = await response.json();

      // WHAT: Check if the HTTP response indicates an error
      // HOW: response.ok is false for 4xx and 5xx status codes
      // OUTCOME: Error responses are caught and displayed as user-facing messages
      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong generating your recipe. Please try again."
        );
      }

      // WHAT: Verify the expected recipe field exists in the successful response
      // HOW: Explicit check before setting state prevents rendering a broken recipe
      // OUTCOME: A malformed API response is caught here rather than crashing RecipeDisplay
      if (!data.recipe) {
        throw new Error(
          "Received an unexpected response from the server. Please try again."
        );
      }

      // WHAT: Update state with the validated recipe object from Claude
      // HOW: setRecipe triggers a re-render that shows the RecipeDisplay component
      // OUTCOME: The recipe card appears below the form with the generated content
      setRecipe(data.recipe);
      console.log("RECIPE RECEIVED:", data.recipe.dishName);

    } catch (err) {
      // WHAT: Catch any fetch error, network error, or thrown Error from above
      // HOW: Set the error state string so the error banner renders
      // OUTCOME: User sees a clear error message; the app does not crash or go silent
      console.error("RECIPE GENERATION ERROR:", err);
      setError(
        err.message || "An unexpected error occurred. Please check your connection and try again."
      );
    } finally {
      // WHAT: Always turn off the loading state when the request ends (success or failure)
      // HOW: finally block runs regardless of whether try or catch executed
      // OUTCOME: The loading spinner always disappears — never stuck in a loading loop
      setIsLoading(false);
    }
  };

  // WHAT: Determine whether the generate button should be interactive
  // HOW: Disabled when loading is in progress OR when no ingredients have been added
  // OUTCOME: Button is always grey and non-clickable in invalid states
  const isButtonDisabled = isLoading || ingredients.length === 0;

  return (
    // WHAT: Page wrapper with the warm off-white background and minimum full height
    // HOW: min-h-screen ensures the background fills the entire viewport
    // OUTCOME: No white flash below the fold on short pages
    <div className={`min-h-screen ${chefMode ? "bg-[#fff0eb]" : "bg-[#fef9ef]"} transition-colors duration-500`}>

      {/* ── Header ──────────────────────────────────────────── */}
      {/* WHAT: Full-width app header with name, tagline, and Chef Mode toggle
          HOW: Dark green background with centered content and responsive padding
          OUTCOME: User immediately understands what the app does and can activate Chef Mode */}
      <header
        className={`w-full py-8 px-4 transition-colors duration-500 ${
          chefMode ? "bg-[#c0392b]" : "bg-[#1b4332]"
        }`}
      >
        <div className="max-w-2xl mx-auto">
          {/* App name and description */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {/* WHAT: App name as the primary H1 — one per page for SEO and accessibility
                  HOW: Large white bold text; emoji adds food personality
                  OUTCOME: The app brand is immediately recognizable */}
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {chefMode ? "🔥 Fridge-to-Table" : "🍽️ Fridge-to-Table"}
              </h1>
              {/* WHAT: One-sentence description of what the app does
                  HOW: Smaller font below the title; high opacity for readability on dark bg
                  OUTCOME: Users understand the app's purpose in under 5 seconds */}
              <p className="text-white/80 text-sm mt-1">
                {chefMode
                  ? "Marco Fuoco demands you cook with passion. No excuses."
                  : "Turn your available ingredients into a personalized, AI-validated recipe."}
              </p>
            </div>

            {/* WHAT: Chef Mode toggle button — activates Marco Fuoco persona
                HOW: Toggles chefMode boolean; all child components receive the new value
                OUTCOME: Entire app switches to orange theme and Marco's voice on click */}
            <button
              type="button"
              onClick={() => setChefMode((prev) => !prev)}
              className={`
                flex-shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300
                ${chefMode
                  ? "bg-white text-[#c0392b] shadow-lg hover:bg-[#fef9ef]"
                  : "bg-[#2d6a4f] text-white hover:bg-[#52b788] border border-white/20"
                }
              `}
              // WHAT: Announce the toggle action to screen readers
              // HOW: aria-pressed reflects the current boolean state
              // OUTCOME: Accessible to users who cannot see the visual color change
              aria-pressed={chefMode}
            >
              {chefMode ? "😤 Exit Chef Mode" : "Chef Mode 🔥"}
            </button>
          </div>

          {/* ── How to Use section ─────────────────────────── */}
          {/* WHAT: Quick start guide visible on every page load
              HOW: Three numbered steps in a flex row that wraps on mobile
              OUTCOME: New users understand the flow in under 10 seconds */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: "1", label: "Add Ingredients", desc: "Type what's in your fridge" },
              { n: "2", label: "Set Preferences", desc: "Dietary needs, skill & servings" },
              { n: "3", label: "Generate Recipe", desc: "Claude validates it against real sources" },
            ].map(({ n, label, desc }) => (
              <div key={n} className="flex gap-3 items-start">
                {/* WHAT: Step number circle for visual hierarchy
                    HOW: Small circle with step number in brand color
                    OUTCOME: Users scan the 1-2-3 flow instantly */}
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    chefMode ? "bg-[#e76f51] text-white" : "bg-[#52b788] text-white"
                  }`}
                >
                  {n}
                </span>
                <div>
                  <p className="text-white text-xs font-semibold">{label}</p>
                  <p className="text-white/60 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      {/* WHAT: Central content column with max width for readability on wide screens
          HOW: max-w-2xl mx-auto centers the content; px-4 adds side padding on mobile
          OUTCOME: Content never stretches uncomfortably wide on large monitors */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* ── Ingredient Input ──────────────────────────────── */}
        {/* WHAT: Render the ingredient input component with current state and callbacks
            HOW: Pass down ingredients array and the two handler functions as props
            OUTCOME: IngredientInput can read the list and notify the parent of changes */}
        <IngredientInput
          ingredients={ingredients}
          onAdd={handleAddIngredient}
          onRemove={handleRemoveIngredient}
          chefMode={chefMode}
        />

        {/* ── Filter Panel ──────────────────────────────────── */}
        {/* WHAT: Render the filter selection panel with current filter values
            HOW: Pass filters object and the setter function; FilterPanel calls it on change
            OUTCOME: Selected dietary/skill/serving filters are always in sync with state */}
        <FilterPanel
          filters={filters}
          onFilterChange={setFilters}
          chefMode={chefMode}
        />

        {/* ── Generate Button ───────────────────────────────── */}
        {/* WHAT: Primary action button to trigger recipe generation
            HOW: onClick calls handleGenerate; disabled state prevents double submissions
            OUTCOME: Users have one clear call-to-action; it's impossible to submit twice */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isButtonDisabled}
          className={`
            w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            ${chefMode
              ? "bg-[#e76f51] hover:bg-[#c0392b] active:scale-[0.98]"
              : "bg-[#1b4332] hover:bg-[#2d6a4f] active:scale-[0.98]"
            }
            ${!isButtonDisabled ? "shadow-lg" : ""}
          `}
        >
          {/* WHAT: Dynamic button label that reflects the current app state
              HOW: Ternary chain checks isLoading first, then chefMode for the label
              OUTCOME: Button always describes what it will do / what it's doing */}
          {isLoading
            ? "Generating..."
            : chefMode
            ? "🔥 Generate Recipe, Per Marco's Standards"
            : "✨ Generate Recipe"}
        </button>

        {/* ── Error Banner ──────────────────────────────────── */}
        {/* WHAT: Display error messages when API calls or validation fails
            HOW: Conditional render — only shows when error state is non-null
            OUTCOME: Users see a clear, friendly error message; no silent failures */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <span className="text-red-500 text-xl flex-shrink-0" role="img" aria-label="error">⚠️</span>
            <div>
              <p className="font-semibold text-red-700 text-sm">Something went wrong</p>
              <p className="text-red-600 text-sm mt-0.5">{error}</p>
            </div>
            {/* WHAT: Dismiss button to clear the error and hide the banner
                HOW: Sets error state back to null; banner conditionally disappears
                OUTCOME: User can dismiss the error without refreshing the page */}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600 font-bold text-lg leading-none flex-shrink-0"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Loading State ─────────────────────────────────── */}
        {/* WHAT: Show the animated loading component while the API call is in flight
            HOW: Conditional render based on isLoading boolean
            OUTCOME: User always has visual feedback during the 10-20 second API call */}
        {isLoading && <LoadingState chefMode={chefMode} />}

        {/* ── Recipe Display ────────────────────────────────── */}
        {/* WHAT: Render the full recipe card when a recipe is available
            HOW: Conditional render — RecipeDisplay only appears after a successful API call
            OUTCOME: Recipe appears below the form once generated; form stays accessible above */}
        {!isLoading && recipe && (
          <RecipeDisplay recipe={recipe} chefMode={chefMode} />
        )}

        {/* ── Generate Again CTA ────────────────────────────── */}
        {/* WHAT: Show a secondary "generate again" prompt after the recipe is displayed
            HOW: Render only when recipe exists; clicking scrolls user back to focus on form
            OUTCOME: Encourages experimentation — "what if I remove the chicken?" */}
        {!isLoading && recipe && (
          <div className="text-center py-4">
            <p className="text-sm text-[#6b7280]">
              Want to try different ingredients or filters?
            </p>
            <button
              onClick={() => {
                // WHAT: Reset the recipe so the user focuses on the input form again
                // HOW: Clear recipe state; ingredients and filters stay the same
                // OUTCOME: User can tweak their input without losing what they already added
                setRecipe(null);
                setError(null);
                // WHAT: Scroll the page back to the top for the next generation attempt
                // HOW: window.scrollTo with behavior smooth animates the scroll
                // OUTCOME: User's viewport returns to the ingredient input without jarring jump
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`
                mt-2 text-sm font-semibold underline underline-offset-2 transition-colors
                ${chefMode ? "text-[#e76f51] hover:text-[#c0392b]" : "text-[#2d6a4f] hover:text-[#1b4332]"}
              `}
            >
              Adjust and generate again
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      {/* WHAT: Minimal footer with attribution
          HOW: Centered small text at the bottom of the page content
          OUTCOME: Clean finish to the page without visual clutter */}
      <footer className="text-center py-8 text-xs text-[#9ca3af]">
        Powered by{" "}
        <span className={`font-semibold ${chefMode ? "text-[#e76f51]" : "text-[#2d6a4f]"}`}>
          Claude AI
        </span>{" "}
        · Web-validated recipes · Fridge-to-Table
      </footer>
    </div>
  );
}
