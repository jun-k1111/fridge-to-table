// WHAT: Mark as client component — cooking mode and step navigation require state
// HOW: "use client" directive enables useState in this component
// OUTCOME: Cooking Mode button and Next/Previous navigation work interactively
"use client";

// WHAT: Import useState to manage cooking mode toggle and current step index
// HOW: Destructured from 'react' — minimal import keeps bundle small
// OUTCOME: Component has two internal state values with no external store needed
import { useState } from "react";

// WHAT: Helper to render a difficulty rating as colored dots
// HOW: Maps the string "Beginner"/"Intermediate"/"Advanced Chef" to a dot count
// OUTCOME: Visual rating is immediately readable without parsing text
function DifficultyDots({ difficulty }) {
  // WHAT: Map difficulty text to a number of filled dots (1–3)
  // HOW: Object lookup with fallback to 1 if the value doesn't match any key
  // OUTCOME: "Beginner" → 1 filled dot; "Advanced Chef" → 3 filled dots
  const map = { beginner: 1, intermediate: 2, "advanced chef": 3, advanced: 3 };
  const count = map[difficulty?.toLowerCase()] ?? 1;

  return (
    <span className="flex gap-1">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`w-3 h-3 rounded-full ${
            n <= count ? "bg-[#2d6a4f]" : "bg-[#e5e7eb]"
          }`}
        />
      ))}
    </span>
  );
}

// WHAT: Section header component reused for each recipe card section
// HOW: Accepts a title and optional emoji; renders a styled divider line
// OUTCOME: Each section (Ingredients, Instructions, etc.) has a consistent look
function SectionHeader({ title, emoji, chefMode }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-[#e5e7eb]">
      {emoji && <span className="text-lg" role="img" aria-hidden="true">{emoji}</span>}
      <h3
        className={`text-sm font-semibold uppercase tracking-wide ${
          chefMode ? "text-[#c0392b]" : "text-[#1b4332]"
        }`}
      >
        {title}
      </h3>
    </div>
  );
}

// WHAT: RecipeDisplay component — renders the full recipe returned by Claude
// HOW: Accepts the recipe object and chefMode flag; manages cooking mode internally
// OUTCOME: A complete, readable recipe card with an optional step-by-step cooking view
export default function RecipeDisplay({ recipe, chefMode }) {
  // WHAT: Track whether the user is in focused Cooking Mode (step-by-step view)
  // HOW: Boolean state toggles between the full recipe card and one-step-at-a-time view
  // OUTCOME: Users actively cooking see a simplified, distraction-free interface
  const [cookingMode, setCookingMode] = useState(false);

  // WHAT: Track which instruction step is currently shown in Cooking Mode
  // HOW: Integer index into the recipe.instructions array; starts at 0 (step 1)
  // OUTCOME: Next/Previous buttons increment/decrement this index
  const [currentStep, setCurrentStep] = useState(0);

  // WHAT: Safety check — if no recipe is provided, render nothing
  // HOW: Early return with null prevents a crash when recipe is still loading
  // OUTCOME: Component never tries to access properties on undefined
  if (!recipe) return null;

  // WHAT: Destructure recipe fields for cleaner template references
  // HOW: ES6 destructuring with fallback defaults prevents undefined rendering
  // OUTCOME: Even a partially populated recipe object renders without crashing
  const {
    dishName        = "Recipe",
    cookTime        = "—",
    difficulty      = "Beginner",
    servings        = 2,
    requiredIngredients = [],
    instructions    = [],
    platingTip      = "",
    chefTip         = "",
    webValidated    = false,
    validationNote  = null,
  } = recipe;

  // ── Cooking Mode View ──────────────────────────────────────────
  if (cookingMode) {
    // WHAT: Determine if the user is on the first or last step
    // HOW: Compare currentStep against 0 and instructions.length - 1
    // OUTCOME: Previous button is disabled on step 1; Next is disabled on the last step
    const isFirst = currentStep === 0;
    const isLast  = currentStep === instructions.length - 1;

    return (
      // WHAT: Full-screen-ish cooking mode overlay card
      // HOW: Large padded card with the step prominently in the center
      // OUTCOME: One step fills the screen — optimized for cooking at a counter
      <div
        className={`rounded-2xl border-2 p-6 mt-8 space-y-6 fade-up ${
          chefMode
            ? "border-[#e76f51] bg-[#fff0eb] chef-mode-active"
            : "border-[#2d6a4f] bg-white"
        }`}
      >
        {/* Header Row with dish name and exit button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">
              Cooking Mode
            </p>
            <h2
              className={`text-xl font-bold ${
                chefMode ? "text-[#c0392b]" : "text-[#1b4332]"
              }`}
            >
              {dishName}
            </h2>
          </div>
          {/* WHAT: Exit Cooking Mode button to return to the full recipe view
              HOW: Sets cookingMode to false and resets step index to 0
              OUTCOME: User can leave Cooking Mode and review the full recipe again */}
          <button
            onClick={() => { setCookingMode(false); setCurrentStep(0); }}
            className="text-sm text-[#6b7280] hover:text-red-500 underline underline-offset-2 transition-colors"
          >
            Exit Cooking Mode
          </button>
        </div>

        {/* WHAT: Step progress indicator showing "Step 3 of 7"
            HOW: currentStep + 1 converts 0-based index to human-readable number
            OUTCOME: User always knows where they are in the recipe */}
        <div className="text-center">
          <p className="text-xs text-[#6b7280] font-medium mb-2">
            Step {currentStep + 1} of {instructions.length}
          </p>
          {/* WHAT: Visual progress bar showing how far through the recipe the user is
              HOW: width percentage calculated as (currentStep+1)/total * 100
              OUTCOME: A thin bar at the top of the step card shows completion visually */}
          <div className="w-full bg-[#e5e7eb] rounded-full h-1.5 mb-6">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                chefMode ? "bg-[#e76f51]" : "bg-[#2d6a4f]"
              }`}
              style={{
                width: `${((currentStep + 1) / instructions.length) * 100}%`,
              }}
            />
          </div>

          {/* WHAT: The current instruction step, displayed large and readable
              HOW: instructions[currentStep] accesses the correct string
              OUTCOME: Text is large enough to read from arm's length at a stove */}
          <p className="cooking-step text-[#1a1a1a] font-medium">
            {instructions[currentStep]}
          </p>
        </div>

        {/* WHAT: Navigation button row — Previous on the left, Next on the right
            HOW: justify-between pushes them to opposite ends of the flex row
            OUTCOME: Tapping Next/Previous always moves exactly one step */}
        <div className="flex justify-between gap-4">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isFirst}
            className={`
              flex-1 py-3 rounded-xl font-semibold text-sm border transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              ${chefMode
                ? "border-[#e76f51] text-[#e76f51] hover:bg-[#e76f51] hover:text-white"
                : "border-[#1b4332] text-[#1b4332] hover:bg-[#1b4332] hover:text-white"
              }
            `}
          >
            ← Previous
          </button>
          {/* WHAT: "Next" button advances to the next step OR signals recipe completion
              HOW: isLast check switches label and action based on position
              OUTCOME: On the final step, the button says "Done! 🎉" instead of Next */}
          {isLast ? (
            <button
              onClick={() => { setCookingMode(false); setCurrentStep(0); }}
              className={`
                flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all
                ${chefMode ? "bg-[#e76f51] hover:bg-[#c0392b]" : "bg-[#1b4332] hover:bg-[#2d6a4f]"}
              `}
            >
              Done! 🎉
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              className={`
                flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all
                ${chefMode ? "bg-[#e76f51] hover:bg-[#c0392b]" : "bg-[#1b4332] hover:bg-[#2d6a4f]"}
              `}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Full Recipe View ───────────────────────────────────────────
  return (
    // WHAT: Outer recipe card with fade-up entrance animation
    // HOW: .fade-up CSS class triggers the keyframe animation on mount
    // OUTCOME: Recipe appears smoothly rather than popping in abruptly
    <div
      className={`rounded-2xl border p-6 mt-8 space-y-6 fade-up ${
        chefMode
          ? "border-[#e76f51] bg-[#fff0eb] chef-mode-active"
          : "border-[#e5e7eb] bg-white"
      }`}
    >
      {/* ── Dish Name & Meta Header ─────────────────────────── */}
      <div className="space-y-3">
        {/* WHAT: Web validation badge — shown when Claude confirmed with real sources
            HOW: Conditional render checks webValidated boolean from the recipe object
            OUTCOME: Users know the recipe has been cross-referenced against culinary sources */}
        {webValidated && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#d8f3dc] text-[#1b4332] px-3 py-1 rounded-full">
            <span>✓</span> Validated against culinary sources
          </div>
        )}

        {/* WHAT: Display the fallback note when web search was inconclusive
            HOW: validationNote is only present in the response when search failed
            OUTCOME: Users know to taste and adjust when the recipe wasn't web-validated */}
        {validationNote && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#fef9c3] text-[#713f12] px-3 py-1 rounded-full">
            <span>⚠️</span> {validationNote}
          </div>
        )}

        {/* WHAT: Dish name as the primary heading of the recipe card
            HOW: Large bold text with brand color; font size scales on desktop
            OUTCOME: The recipe name is the first thing the user sees */}
        <h2
          className={`text-2xl sm:text-3xl font-bold leading-tight ${
            chefMode ? "text-[#c0392b]" : "text-[#1b4332]"
          }`}
        >
          {chefMode ? `🔥 ${dishName}` : dishName}
        </h2>

        {/* WHAT: Quick-glance metadata row — cook time, difficulty, servings
            HOW: Three flex children each show an icon + text pair
            OUTCOME: User sees at a glance whether the recipe fits their time and skill */}
        <div className="flex flex-wrap gap-4 text-sm text-[#6b7280]">
          <div className="flex items-center gap-1.5">
            <span role="img" aria-label="clock">⏱️</span>
            <span>{cookTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DifficultyDots difficulty={difficulty} />
            <span>{difficulty}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span role="img" aria-label="servings">🍽️</span>
            <span>Serves {servings}</span>
          </div>
        </div>
      </div>

      {/* ── Enter Cooking Mode Button ───────────────────────── */}
      {/* WHAT: Prominent button to enter step-by-step Cooking Mode
          HOW: Sets cookingMode to true, which switches the return branch above
          OUTCOME: User gets a distraction-free single-step view for active cooking */}
      <button
        onClick={() => { setCookingMode(true); setCurrentStep(0); }}
        className={`
          w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95
          ${chefMode
            ? "bg-[#e76f51] hover:bg-[#c0392b]"
            : "bg-[#1b4332] hover:bg-[#2d6a4f]"
          }
        `}
      >
        {chefMode ? "🔥 Enter Cooking Mode" : "🍳 Enter Cooking Mode"}
      </button>

      {/* ── Ingredients List ────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader title="Ingredients" emoji="🛒" chefMode={chefMode} />
        <ul className="space-y-1.5">
          {requiredIngredients.map((item, i) => (
            // WHAT: Render each ingredient as a bulleted list item
            // HOW: Object can be { item, amount } or a plain string — handle both
            // OUTCOME: Ingredient list renders correctly regardless of response format
            <li key={i} className="flex items-baseline gap-2 text-sm text-[#374151]">
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  chefMode ? "bg-[#e76f51]" : "bg-[#2d6a4f]"
                }`}
              />
              {/* WHAT: Support both object format { item, amount } and plain string
                  HOW: Ternary checks if item is an object with .item property
                  OUTCOME: Recipe renders correctly whether Claude returns objects or strings */}
              {typeof item === "object" && item.item
                ? `${item.amount ? item.amount + " " : ""}${item.item}`
                : String(item)
              }
            </li>
          ))}
        </ul>
      </div>

      {/* ── Instructions ────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader title="Instructions" emoji="📋" chefMode={chefMode} />
        <ol className="space-y-3">
          {instructions.map((step, i) => (
            // WHAT: Numbered instruction step with the step number highlighted
            // HOW: Flex row with a styled number circle and the instruction text
            // OUTCOME: Each step is easy to scan and follow sequentially
            <li key={i} className="flex gap-3 text-sm text-[#374151] leading-relaxed">
              <span
                className={`
                  flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                  text-xs font-bold text-white mt-0.5
                  ${chefMode ? "bg-[#e76f51]" : "bg-[#1b4332]"}
                `}
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Plating Suggestion ──────────────────────────────── */}
      {platingTip && (
        <div className="space-y-3">
          <SectionHeader title="Plating Suggestion" emoji="🎨" chefMode={chefMode} />
          <p className="text-sm text-[#374151] leading-relaxed italic">{platingTip}</p>
        </div>
      )}

      {/* ── Chef's Tip ──────────────────────────────────────── */}
      {chefTip && (
        <div
          className={`rounded-xl p-4 space-y-1 ${
            chefMode ? "bg-[#c0392b]/10 border border-[#e76f51]/40" : "bg-[#d8f3dc] border border-[#52b788]/40"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              chefMode ? "text-[#c0392b]" : "text-[#1b4332]"
            }`}
          >
            {chefMode ? "🔥 Marco Says:" : "💡 Chef's Tip"}
          </p>
          {/* WHAT: Render the chef tip text, which may include "Culinary best practice:"
              HOW: Plain text rendering; the attribution prefix is part of the AI's response
              OUTCOME: Users see the tip exactly as Claude (or Marco Fuoco) wrote it */}
          <p className="text-sm text-[#374151] leading-relaxed">{chefTip}</p>
        </div>
      )}
    </div>
  );
}
