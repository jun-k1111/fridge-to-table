// WHAT: Mark as client component — this component manages local input state and events
// HOW: "use client" enables useState and event handlers in the browser
// OUTCOME: The ingredient text field and chip list update interactively
"use client";

// WHAT: Import React's useState hook to manage the text field value locally
// HOW: Destructured from 'react' — only the hook we need
// OUTCOME: Input value is controlled locally; the full ingredient list lives in parent
import { useState } from "react";

// WHAT: IngredientInput component — lets users build a list of ingredients
// HOW: Receives the parent's ingredients array and add/remove callbacks via props
// OUTCOME: Each ingredient appears as a chip; new ones are added via input + button
export default function IngredientInput({
  ingredients,  // Current list of ingredient strings from parent state
  onAdd,        // Callback: called with the new ingredient string to add
  onRemove,     // Callback: called with the index to remove from the list
  chefMode,     // Boolean: switches styling to Chef Mode palette when true
}) {
  // WHAT: Local state for the text field value before it becomes an ingredient
  // HOW: useState("") initializes to empty string; setInputValue updates on change
  // OUTCOME: The text field is a controlled input — React owns the value
  const [inputValue, setInputValue] = useState("");

  // WHAT: Handle the Add Ingredient action from button click or Enter key
  // HOW: Trims whitespace, checks for empty/duplicate, calls onAdd, then clears field
  // OUTCOME: Only valid, non-duplicate ingredients get added; field resets after
  const handleAdd = () => {
    // WHAT: Sanitize the input by removing leading/trailing whitespace
    // HOW: String.trim() returns a new string with no surrounding whitespace
    // OUTCOME: "  chicken  " is treated the same as "chicken"
    const trimmed = inputValue.trim();

    // WHAT: Guard against empty submissions
    // HOW: Early return if trimmed string has no characters
    // OUTCOME: Pressing Add on an empty field does nothing — no blank chips appear
    if (!trimmed) return;

    // WHAT: Guard against duplicate ingredients (case-insensitive)
    // HOW: Array.some() checks if any existing ingredient matches after lowercasing both
    // OUTCOME: "Chicken" and "chicken" are treated as the same ingredient — no duplicates
    const isDuplicate = ingredients.some(
      (ing) => ing.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) return;

    // WHAT: Pass the new ingredient up to the parent's state
    // HOW: Call the onAdd prop function with the validated, trimmed ingredient string
    // OUTCOME: Parent adds the ingredient to its array, triggering a re-render of the chip list
    onAdd(trimmed);

    // WHAT: Clear the text field after a successful add
    // HOW: Reset the controlled input value to an empty string
    // OUTCOME: Field is ready for the next ingredient without manual clearing
    setInputValue("");
  };

  // WHAT: Handle the Enter key press as a shortcut to add ingredients
  // HOW: Check event.key against "Enter" and call handleAdd if matched
  // OUTCOME: Power users can add multiple ingredients rapidly without touching the mouse
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      // WHAT: Prevent the Enter key from submitting any parent form
      // HOW: e.preventDefault() stops the default form submission behavior
      // OUTCOME: The Enter key only adds an ingredient, it does not trigger recipe generation
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    // WHAT: Ingredient input card with consistent border and padding
    // HOW: rounded-2xl gives modern rounded corners; padding creates breathing room
    // OUTCOME: Input section feels like a distinct card, not floating elements
    <div
      className={`rounded-2xl border p-6 space-y-4 ${
        chefMode
          ? "border-[#e76f51] bg-[#fff0eb]"
          : "border-[#e5e7eb] bg-white"
      }`}
    >
      {/* WHAT: Section header with icon and heading
          HOW: Flexbox row aligns icon and text; icon adds visual personality
          OUTCOME: User immediately knows this section is for entering ingredients */}
      <div className="flex items-center gap-2">
        <span className="text-xl" role="img" aria-label="ingredients">🥦</span>
        <h2
          className={`text-base font-semibold ${
            chefMode ? "text-[#c0392b]" : "text-[#1b4332]"
          }`}
        >
          Your Ingredients
        </h2>
        {/* WHAT: Live count badge showing how many ingredients have been added
            HOW: ingredients.length is interpolated into the badge text
            OUTCOME: User always knows how many items are in their current list */}
        {ingredients.length > 0 && (
          <span
            className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
              chefMode
                ? "bg-[#e76f51] text-white"
                : "bg-[#1b4332] text-white"
            }`}
          >
            {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Text Input + Add Button Row ──────────────────────── */}
      {/* WHAT: Input and button sit side by side in a flex row
          HOW: flex + gap creates a single horizontal unit
          OUTCOME: The Add button is always visually paired with the text field */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          // WHAT: Update local state as the user types each character
          // HOW: onChange fires on every keystroke; e.target.value carries the new value
          // OUTCOME: The input is fully controlled — the displayed value always matches state
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chefMode ? "Name your ingredient, if you dare..." : "e.g. chicken, garlic, lemon..."}
          // WHAT: cap the ingredient at 60 characters to keep chip labels readable
          // HOW: maxLength HTML attribute enforces the limit at the browser level
          // OUTCOME: No ingredient chip ever overflows its container due to a very long label
          maxLength={60}
          className={`
            flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-all
            placeholder:text-[#9ca3af]
            ${chefMode
              ? "border-[#e76f51] focus:border-[#c0392b] focus:ring-2 focus:ring-[#e76f51]/30 bg-white"
              : "border-[#d1d5db] focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20 bg-white"
            }
          `}
          // WHAT: Announce the current ingredient count to screen readers
          // HOW: aria-label provides context that a visual count badge cannot convey
          // OUTCOME: Accessible for users relying on screen readers
          aria-label="Type an ingredient and press Enter or click Add"
        />
        <button
          type="button"
          onClick={handleAdd}
          // WHAT: Disable the button when the input is empty to prevent blank chips
          // HOW: disabled attribute set when trimmed inputValue is falsy
          // OUTCOME: Add button is visually dimmed and non-interactive on empty input
          disabled={!inputValue.trim()}
          className={`
            px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            ${chefMode
              ? "bg-[#e76f51] hover:bg-[#c0392b] active:scale-95"
              : "bg-[#1b4332] hover:bg-[#2d6a4f] active:scale-95"
            }
          `}
        >
          + Add
        </button>
      </div>

      {/* ── Ingredient Chips ─────────────────────────────────── */}
      {/* WHAT: Render a chip for every ingredient in the list
          HOW: Conditional render hides this section when the list is empty
          OUTCOME: The chip area only appears once the user adds the first ingredient */}
      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {ingredients.map((ingredient, index) => (
            // WHAT: Individual ingredient chip with a remove button
            // HOW: index is used as the React key and passed to onRemove
            // OUTCOME: Each chip is uniquely keyed; clicking × removes only that ingredient
            <div key={index} className="ingredient-chip">
              <span>{ingredient}</span>
              <button
                type="button"
                // WHAT: Remove this specific ingredient from the parent list
                // HOW: Call onRemove with this chip's index so parent can splice it out
                // OUTCOME: Only the clicked ingredient disappears; the rest remain intact
                onClick={() => onRemove(index)}
                className="ml-1 text-[#1b4332] hover:text-red-600 transition-colors font-bold leading-none"
                // WHAT: Accessible label so screen readers describe the remove action
                // HOW: aria-label interpolates the ingredient name into a descriptive string
                // OUTCOME: Screen reader announces "Remove chicken" instead of just "button"
                aria-label={`Remove ${ingredient}`}
              >
                ×
              </button>
            </div>
          ))}

          {/* WHAT: "Clear All" button to wipe the entire ingredient list at once
              HOW: Calls onRemove with -1 as a sentinel value; parent handles this case
              OUTCOME: Users can start fresh without clicking × on every chip individually */}
          {ingredients.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(-1)}
              className="text-xs text-[#9ca3af] hover:text-red-500 underline underline-offset-2 transition-colors self-center ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* WHAT: Helper text telling users they need at least one ingredient
          HOW: Shown only when the list is empty; uses a small italic style
          OUTCOME: New users get a hint; experienced users don't see clutter */}
      {ingredients.length === 0 && (
        <p className="text-xs text-[#9ca3af] italic">
          Add at least one ingredient to generate a recipe.
        </p>
      )}
    </div>
  );
}
