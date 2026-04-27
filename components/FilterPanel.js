// WHAT: Mark as client component — button toggles update local state via props
// HOW: "use client" directive enables browser-side React interactivity
// OUTCOME: Filter buttons respond instantly to clicks without a page reload
"use client";

// WHAT: Define the available dietary restriction options
// HOW: Array of objects lets us map the list to buttons generically
// OUTCOME: Adding a new dietary option only requires adding one object here
const DIETARY_OPTIONS = [
  { id: "none",        label: "No Restriction" },
  { id: "vegan",       label: "Vegan"           },
  { id: "vegetarian",  label: "Vegetarian"       },
  { id: "gluten-free", label: "Gluten-Free"      },
  { id: "dairy-free",  label: "Dairy-Free"       },
  { id: "keto",        label: "Keto"             },
];

// WHAT: Define the available cooking skill levels
// HOW: Same pattern as dietary — an array of id/label pairs
// OUTCOME: Skill buttons are rendered and handled identically to dietary buttons
const SKILL_OPTIONS = [
  { id: "beginner",      label: "Beginner"       },
  { id: "intermediate",  label: "Intermediate"   },
  { id: "advanced",      label: "Advanced Chef"  },
];

// WHAT: Define the available serving count options
// HOW: Numeric strings so they can be directly inserted into prompts
// OUTCOME: Claude receives the exact serving count the user wants
const SERVING_OPTIONS = [
  { id: "1",  label: "1 person"  },
  { id: "2",  label: "2 people"  },
  { id: "4",  label: "4 people"  },
  { id: "6+", label: "6+ people" },
];

// WHAT: Reusable button group sub-component for a single filter category
// HOW: Maps over an options array and renders a styled button for each
// OUTCOME: Dietary, skill, and serving sections all use the same button logic
function ButtonGroup({ options, selected, onSelect, chefMode }) {
  return (
    // WHAT: Wrap buttons in a flex row that wraps on narrow screens
    // HOW: flex-wrap allows overflow to the next line on mobile viewports
    // OUTCOME: Filter buttons stay usable on small phone screens
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        // WHAT: Determine if this option is currently selected
        // HOW: Compare option.id against the selected value passed from parent
        // OUTCOME: Only the active filter button gets the filled-in visual style
        const isActive = selected === option.id;

        return (
          <button
            key={option.id}
            // WHAT: Notify the parent component that a filter value changed
            // HOW: Call onSelect with this option's id when the button is clicked
            // OUTCOME: Parent page.js updates its filter state and re-renders
            onClick={() => onSelect(option.id)}
            type="button"
            className={`
              px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150
              ${isActive
                ? chefMode
                  // WHAT: Active + Chef Mode = solid orange button
                  // HOW: Ternary chain selects from three style combinations
                  // OUTCOME: Chef Mode buttons use the orange brand color when active
                  ? "bg-[#e76f51] border-[#e76f51] text-white"
                  // WHAT: Active + normal mode = solid deep-green button
                  // OUTCOME: Selected filter is clearly highlighted in brand green
                  : "bg-[#1b4332] border-[#1b4332] text-white"
                : "bg-white border-[#d1d5db] text-[#374151] hover:border-[#2d6a4f] hover:text-[#2d6a4f]"
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// WHAT: FilterPanel component — collects dietary, skill, and serving preferences
// HOW: Receives filters object + onFilterChange callback from parent page.js
// OUTCOME: Any change to a filter immediately updates state in the parent component
export default function FilterPanel({ filters, onFilterChange, chefMode }) {
  // WHAT: Helper to update a single filter field without overwriting the others
  // HOW: Spreads the existing filters and overrides only the field that changed
  // OUTCOME: Parent always receives the full, correctly merged filter object
  const handleChange = (field) => (value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
    // WHAT: Filter panel card — visually separated from the ingredient input above
    // HOW: Rounded card with border and padding, conditionally styled for Chef Mode
    // OUTCOME: All three filter groups sit in one cohesive panel below ingredients
    <div
      className={`rounded-2xl border p-6 space-y-6 ${
        chefMode
          ? "border-[#e76f51] bg-[#fff0eb]"
          : "border-[#e5e7eb] bg-white"
      }`}
    >
      {/* WHAT: Panel title row with an icon for scannability
          HOW: Flexbox row aligns the emoji and heading text horizontally
          OUTCOME: User immediately understands this section controls output preferences */}
      <div className="flex items-center gap-2">
        <span className="text-xl" role="img" aria-label="filters">
          {chefMode ? "🎯" : "⚙️"}
        </span>
        <h2
          className={`text-base font-semibold ${
            chefMode ? "text-[#c0392b]" : "text-[#1b4332]"
          }`}
        >
          Recipe Preferences
        </h2>
      </div>

      {/* ── Dietary Restrictions ─────────────────────────────── */}
      {/* WHAT: Section for dietary restriction filter
          HOW: Label + ButtonGroup stacked vertically with a gap
          OUTCOME: User can pick one dietary restriction that Claude will respect */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#374151]">
          Dietary Restriction
        </label>
        <ButtonGroup
          options={DIETARY_OPTIONS}
          selected={filters.dietary}
          onSelect={handleChange("dietary")}
          chefMode={chefMode}
        />
      </div>

      {/* ── Cooking Skill Level ───────────────────────────────── */}
      {/* WHAT: Section for skill level filter
          HOW: Reuses ButtonGroup with SKILL_OPTIONS and the skill filter field
          OUTCOME: Claude adapts technique complexity to match the user's ability */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#374151]">
          Cooking Skill Level
        </label>
        <ButtonGroup
          options={SKILL_OPTIONS}
          selected={filters.skill}
          onSelect={handleChange("skill")}
          chefMode={chefMode}
        />
      </div>

      {/* ── Number of Servings ────────────────────────────────── */}
      {/* WHAT: Section for serving count filter
          HOW: Reuses ButtonGroup with SERVING_OPTIONS and the servings field
          OUTCOME: Claude scales ingredient amounts to match the desired yield */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#374151]">
          Number of Servings
        </label>
        <ButtonGroup
          options={SERVING_OPTIONS}
          selected={filters.servings}
          onSelect={handleChange("servings")}
          chefMode={chefMode}
        />
      </div>
    </div>
  );
}
