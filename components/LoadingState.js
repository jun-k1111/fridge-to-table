// WHAT: Mark this as a client component so it can receive props that update live
// HOW: "use client" directive tells Next.js this file renders in the browser
// OUTCOME: The loading state renders correctly and responds to prop changes
"use client";

// WHAT: Array of loading messages for normal (non-chef) mode
// HOW: Messages are indexed randomly so the spinner feels fresh each time
// OUTCOME: Users see a reassuring, food-themed message while waiting for Claude
const NORMAL_MESSAGES = [
  "Checking your fridge...",
  "Consulting the culinary universe...",
  "Crafting your perfect recipe...",
  "Cross-referencing with culinary sources...",
  "Almost ready — good things take time...",
];

// WHAT: Array of intense loading messages for Marco Fuoco Chef Mode
// HOW: Same random index logic, but voiced as Marco Fuoco would speak
// OUTCOME: Chef Mode has a different personality even during the loading state
const CHEF_MESSAGES = [
  "Marco is furious you didn't season first...",
  "Consulting every Nonna in Napoli...",
  "Absolute silence — Marco is thinking...",
  "Searching the culinary soul of Italia...",
  "Marco refuses to rush greatness...",
];

// WHAT: LoadingState component — displayed while the Claude API call is in flight
// HOW: Accepts chefMode boolean to switch between normal and dramatic messaging
// OUTCOME: User always sees clear feedback that the app is working, not frozen
export default function LoadingState({ chefMode }) {
  // WHAT: Pick a random message from the appropriate array each render
  // HOW: Math.random() * array.length gives a float; Math.floor() converts to index
  // OUTCOME: A different message appears on each recipe generation, keeping it fresh
  const messages = chefMode ? CHEF_MESSAGES : NORMAL_MESSAGES;
  const message = messages[Math.floor(Math.random() * messages.length)];

  return (
    // WHAT: Full-width loading card centered on the page below the form
    // HOW: Flexbox column with centered alignment and padding creates a clean card
    // OUTCOME: Loading state is visually distinct and easy to spot
    <div
      className={`rounded-2xl border p-10 flex flex-col items-center gap-6 mt-8 ${
        // WHAT: Conditionally switch background color based on Chef Mode
        // HOW: Template literal evaluates chefMode boolean to select a class
        // OUTCOME: Chef Mode shows orange-tinted background; normal shows green-tinted
        chefMode
          ? "bg-[#fff0eb] border-[#e76f51]"
          : "bg-[#d8f3dc] border-[#2d6a4f]"
      }`}
    >
      {/* WHAT: Spinning emoji as the loading indicator
          HOW: The .spin CSS class applies the spin-smooth keyframe animation
          OUTCOME: A cheerful, food-relevant icon animates to signal activity */}
      <span className="text-5xl spin" role="img" aria-label="loading">
        {chefMode ? "🔥" : "🍳"}
      </span>

      {/* WHAT: Display the randomly chosen loading message
          HOW: Interpolated variable renders the string from the chosen message array
          OUTCOME: User reads an entertaining message while Claude processes */}
      <p
        className={`text-lg font-semibold text-center ${
          chefMode ? "text-[#c0392b]" : "text-[#1b4332]"
        }`}
      >
        {message}
      </p>

      {/* WHAT: Secondary message explaining what Claude is doing technically
          HOW: Static text below the dynamic message provides factual reassurance
          OUTCOME: Users understand web validation is happening, not just AI generation */}
      <p className="text-sm text-[#6b7280] text-center max-w-xs">
        {chefMode
          ? "Marco is cross-referencing with Italian culinary tradition. Do not interrupt him."
          : "Claude is generating your recipe and validating it against real culinary sources. This takes 10–20 seconds."}
      </p>

      {/* WHAT: Three pulsing dots for a classic loading indicator below the text
          HOW: Each span has a different animation-delay so they pulse in sequence
          OUTCOME: Classic three-dot bounce pattern feels familiar and natural */}
      <div className="flex gap-2 mt-2">
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${
              chefMode ? "bg-[#e76f51]" : "bg-[#2d6a4f]"
            }`}
            style={{
              // WHAT: Stagger the animation delay so dots pulse sequentially
              // HOW: inline style applies the delay because Tailwind can't use dynamic values here
              // OUTCOME: Left-to-right wave animation on the loading dots
              animation: `spin-smooth 1s ease-in-out ${delay}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
