// WHAT: Import the Anthropic SDK client for making Claude API calls
// HOW: Default import from the official @anthropic-ai/sdk package
// OUTCOME: An Anthropic instance is available to create message requests
import Anthropic from "@anthropic-ai/sdk";

// WHAT: Define the Claude model to use for recipe generation
// HOW: Stored as a constant at the top so it's easy to update in one place
// OUTCOME: Every API call in this file uses this model ID consistently
const MODEL = "claude-sonnet-4-6";

// WHAT: Maximum token limit for the Claude response
// HOW: Set high enough for a full recipe with all fields; lower would truncate
// OUTCOME: Even verbose recipes from Marco Fuoco mode fit within this limit
const MAX_TOKENS = 4096;

// WHAT: Client is initialized per-request inside the POST handler (not here at module level)
// HOW: Moved inside POST so process.env is read at request time, not cold-start time
// OUTCOME: Vercel environment variables are always available when the handler runs

// WHAT: Build the system prompt that defines Claude's persona and output rules
// HOW: Returns different text based on whether Chef Mode (Marco Fuoco) is active
// OUTCOME: Claude either responds as a professional culinary assistant or as Marco Fuoco
function buildSystemPrompt(chefMode) {
  if (chefMode) {
    // WHAT: Marco Fuoco persona — intense, passionate, brutally honest Italian chef
    // HOW: Detailed character description that Claude uses to shape every sentence
    // OUTCOME: Recipe instructions and tips read like a real dramatic Italian chef wrote them
    return `You are Marco Fuoco — an intense, brutally honest Italian chef with three Michelin stars and zero patience for mediocrity. You are passionate about quality ingredients, proper technique, and teaching people to cook with soul. Your voice is theatrical, occasionally dramatic, and filled with love for the craft. You speak in short, punchy sentences. You may sprinkle in occasional Italian exclamations (Mamma mia!, Basta!, Andiamo!). You genuinely want people to succeed in the kitchen, but you will not coddle them. You must still return a valid JSON recipe — your personality comes through in the instruction text and chef tip fields, not in the JSON structure itself.`;
  }

  // WHAT: Default professional culinary assistant persona
  // HOW: Calm, encouraging, educational tone focused on clear instructions
  // OUTCOME: Recipes are approachable and well-explained for home cooks of any skill level
  return `You are a professional culinary assistant with deep knowledge of world cuisines, nutrition, and cooking technique. You are encouraging, precise, and educational. You focus on making every home cook feel capable and confident. Your instructions are clear, step-by-step, and include helpful technique tips within each step.`;
}

// WHAT: Build the user message prompt with all ingredients and filter preferences
// HOW: Constructs a detailed, structured prompt string that Claude will follow exactly
// OUTCOME: Claude receives all context needed to generate a complete, correct recipe
function buildUserPrompt(ingredients, filters, chefMode) {
  // WHAT: Format the ingredient list as a readable comma-separated string
  // HOW: Array.join(", ") concatenates all ingredient strings
  // OUTCOME: "chicken, garlic, lemon, rosemary" is clearer to Claude than an array
  const ingredientList = ingredients.join(", ");

  // WHAT: Construct the filter description lines for dietary and skill requirements
  // HOW: Template literals embed filter values directly into descriptive sentences
  // OUTCOME: Claude sees explicit instructions like "This recipe MUST be Vegan"
  const dietaryLine =
    filters.dietary === "none"
      ? "No dietary restrictions apply."
      : `This recipe MUST comply with the following dietary restriction: ${filters.dietary}. Do not include any ingredients that violate this restriction.`;

  const skillLine = `The cooking instructions should be appropriate for a ${filters.skill} cook. ${
    filters.skill === "beginner"
      ? "Explain every technique clearly — assume no prior knowledge."
      : filters.skill === "intermediate"
      ? "Include technique tips but assume basic kitchen skills."
      : "You may use advanced techniques, specialized equipment, and assume high culinary knowledge."
  }`;

  const servingsLine = `Scale the recipe to serve ${filters.servings} ${
    filters.servings === "1" ? "person" : "people"
  }.`;

  return `${chefMode ? "Marco, create a recipe" : "Create a recipe"} using ONLY these available ingredients: ${ingredientList}

${dietaryLine}
${skillLine}
${servingsLine}

IMPORTANT RULES:
1. Use ONLY the listed ingredients. You may add a maximum of 3 common pantry staples (salt, black pepper, and/or cooking oil) ONLY if absolutely necessary for the dish to work.
2. Do not add any other ingredients — the user has only what is listed.
3. Use the web_search tool to find a similar established recipe online using the same primary ingredients. Cross-reference your cook times, temperatures, and techniques against that real-world source. If your values differ from the validated source, correct them.
4. The chefTip field MUST begin with "Culinary best practice:" and cite a technique or fact you confirmed through web search. If web search returned no useful results, start the chefTip with "Culinary best practice (AI knowledge):" instead.
5. If web search validation was inconclusive, set validationNote to: "Recipe based on AI culinary knowledge — always taste and adjust as you cook"

Return your response as a single JSON object with EXACTLY this structure — no markdown, no extra text, only the JSON object:

{
  "dishName": "Name of the dish",
  "cookTime": "e.g. 35 minutes",
  "difficulty": "Beginner" | "Intermediate" | "Advanced Chef",
  "servings": <number>,
  "requiredIngredients": [
    { "item": "ingredient name", "amount": "measurement e.g. 2 cups" }
  ],
  "instructions": [
    "Step 1: Full instruction text...",
    "Step 2: Full instruction text..."
  ],
  "platingTip": "How to plate and present this dish attractively.",
  "chefTip": "Culinary best practice: ...",
  "webValidated": true,
  "validationNote": null
}`;
}

// WHAT: Extract the final text content from a Claude API response
// HOW: Finds the first content block with type "text" and returns its text property
// OUTCOME: Returns the raw text string regardless of other block types in the response
function extractTextFromResponse(response) {
  // WHAT: Filter response content blocks to find text-type blocks
  // HOW: Array.find() returns the first match; content array may include tool_use blocks
  // OUTCOME: We skip tool_use blocks and only extract the text Claude wrote
  const textBlock = response.content.find((block) => block.type === "text");

  // WHAT: Guard against a response with no text block
  // HOW: Return null if find() returns undefined
  // OUTCOME: Caller can detect this case and throw an appropriate error
  if (!textBlock) return null;

  return textBlock.text;
}

// WHAT: Parse a JSON recipe object out of Claude's text response
// HOW: Uses a regex to locate the outermost { } JSON block and JSON.parse() it
// OUTCOME: Returns a plain JavaScript object representing the recipe
function parseRecipeFromText(text) {
  // WHAT: Match the outermost JSON object in the response string
  // HOW: Regex /{[\s\S]*}/ matches from the first { to the last } including newlines
  // OUTCOME: Works even if Claude accidentally adds a sentence before or after the JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // WHAT: Throw a descriptive error if no JSON is found
    // HOW: throw causes execution to jump to the catch block in the POST handler
    // OUTCOME: The error is caught and returned as a user-friendly 500 response
    throw new Error("Claude did not return a valid recipe format. Please try again.");
  }

  // WHAT: Parse the matched JSON string into a JavaScript object
  // HOW: JSON.parse() converts the string; throws SyntaxError if malformed
  // OUTCOME: Returns a typed recipe object or throws so the catch block handles it
  return JSON.parse(jsonMatch[0]);
}

// WHAT: Run the full agentic loop with Claude, handling tool use if it occurs
// HOW: Calls the API in a loop; if stop_reason is "tool_use" (web search), continues
// OUTCOME: Always returns the final Claude response after all tool use is resolved
async function runAgenticLoop(systemPrompt, userPrompt, client) {
  // WHAT: Initialize the message history with the user's recipe request
  // HOW: Messages array follows Anthropic's alternating user/assistant format
  // OUTCOME: Claude has full context of the request from the first call
  const messages = [{ role: "user", content: userPrompt }];

  // WHAT: Cap the number of agentic loop iterations to prevent infinite loops
  // HOW: Counter incremented each loop; breaks if it exceeds MAX_LOOPS
  // OUTCOME: Even if something unexpected happens, the API route always terminates
  const MAX_LOOPS = 6;
  let loopCount = 0;
  let response;

  while (loopCount < MAX_LOOPS) {
    // WHAT: Send the current message history to Claude with web search enabled
    // HOW: tools array includes the built-in web_search_20250305 tool definition
    // OUTCOME: Claude may call web_search to validate the recipe before responding
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      // WHAT: Enable Anthropic's built-in web search tool (up to 3 searches per call)
      // HOW: tool definition uses the type "web_search_20250305" — Anthropic executes it
      // OUTCOME: Claude can search the web to validate recipe accuracy before finalizing
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          // WHAT: Limit to 3 web searches per recipe generation
          // HOW: max_uses is an Anthropic built-in tool property that caps search count
          // OUTCOME: API cost is bounded; Claude still gets enough context to validate
          max_uses: 3,
        },
      ],
      messages,
    });

    // WHAT: Log the stop reason to help debug unexpected API behavior
    // HOW: console.log writes to the Next.js server log (visible in terminal)
    // OUTCOME: Developer can trace the agentic loop flow during development
    console.log(`[RECIPE API] Loop ${loopCount + 1} — stop_reason: ${response.stop_reason}`);

    // WHAT: If Claude has finished (no more tool use), break out of the loop
    // HOW: "end_turn" means Claude provided its final answer
    // OUTCOME: The loop exits and we proceed to parse the response
    if (response.stop_reason !== "tool_use") break;

    // WHAT: Handle tool_use responses by building the next round of messages
    // HOW: Append Claude's response as an assistant turn, then add tool_result blocks
    // OUTCOME: Claude receives the tool results and continues generating the recipe
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

    // WHAT: Append Claude's full response (including tool_use blocks) as an assistant turn
    // HOW: Spread response.content directly — Anthropic requires the full content array
    // OUTCOME: Message history is valid and Claude can reference its own tool calls
    messages.push({ role: "assistant", content: response.content });

    // WHAT: Build tool_result blocks to send back to Claude
    // HOW: For each tool_use block, create a corresponding tool_result
    // OUTCOME: Claude receives confirmation that the tool ran (Anthropic handles web search execution)
    const toolResults = toolUseBlocks.map((block) => ({
      type: "tool_result",
      tool_use_id: block.id,
      // WHAT: Content is left empty because Anthropic executes web_search server-side
      // HOW: For built-in tools, the API fills in real search results automatically
      // OUTCOME: Claude receives actual web search results without us manually scraping
      content: "",
    }));

    // WHAT: Add the tool results as a user turn to continue the conversation
    // HOW: Anthropic API requires tool_result content in a user-role message
    // OUTCOME: The next iteration of the loop sends Claude the search results
    messages.push({ role: "user", content: toolResults });

    loopCount++;
  }

  return response;
}

// WHAT: POST handler — the entry point for all recipe generation API calls
// HOW: Next.js App Router calls this when POST /api/generate is hit
// OUTCOME: Returns a JSON response with { recipe } on success or { error } on failure
export async function POST(request) {
  try {
    // WHAT: Read and validate the API key at request time, not module load time
    // HOW: process.env is checked inside the handler so Vercel's runtime env is available
    // OUTCOME: Key is always fresh; missing key returns a clear 500 before hitting Claude
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("[RECIPE API] API key present:", !!apiKey, "| length:", apiKey?.length ?? 0);
    if (!apiKey) {
      return Response.json(
        { error: "Server configuration error: ANTHROPIC_API_KEY is not set. Please add it in your Vercel environment variables and redeploy." },
        { status: 500 }
      );
    }

    // WHAT: Initialize the Anthropic client with the key passed explicitly
    // HOW: Passing apiKey directly avoids relying on the SDK's auto-detection
    // OUTCOME: Client is guaranteed to use the correct key on every request
    const client = new Anthropic({ apiKey });

    // WHAT: Parse the JSON body sent by the frontend form
    // HOW: request.json() is a Next.js/Web API method that reads and parses the body
    // OUTCOME: ingredients, filters, and chefMode are available as plain JS values
    const body = await request.json();
    const { ingredients, filters, chefMode } = body;

    // WHAT: Log the incoming request for debugging
    // HOW: JSON.stringify formats the data readably in the terminal
    // OUTCOME: Developer can see exactly what the frontend sent on each request
    console.log("[RECIPE API] Ingredients received:", ingredients);
    console.log("[RECIPE API] Filters:", filters);
    console.log("[RECIPE API] Chef Mode:", chefMode);

    // ── Input Validation ────────────────────────────────────
    // WHAT: Reject requests with no ingredients — Claude needs at least one to work with
    // HOW: Check array exists, is an array, and has at least one item
    // OUTCOME: Returns a 400 Bad Request with a clear message before hitting Claude
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return Response.json(
        { error: "Please add at least one ingredient before generating a recipe." },
        { status: 400 }
      );
    }

    // WHAT: Guard against an absurd number of ingredients that would bloat the prompt
    // HOW: Length check with a generous limit of 30 ingredients
    // OUTCOME: Prevents prompt injection and keeps API costs reasonable
    if (ingredients.length > 30) {
      return Response.json(
        { error: "Too many ingredients — please keep your list to 30 or fewer." },
        { status: 400 }
      );
    }

    // WHAT: Sanitize each ingredient string to remove any potential injection content
    // HOW: Trim whitespace and slice to 60 chars; filter out empty strings
    // OUTCOME: Malformed or excessively long ingredient names cannot corrupt the prompt
    const cleanIngredients = ingredients
      .map((ing) => String(ing).trim().slice(0, 60))
      .filter((ing) => ing.length > 0);

    // WHAT: Ensure filters object has all required fields with safe defaults
    // HOW: Destructure with defaults in case the frontend omits a field
    // OUTCOME: API never crashes on missing filter values — sane defaults are used
    const safeFilters = {
      dietary:  filters?.dietary  || "none",
      skill:    filters?.skill    || "beginner",
      servings: filters?.servings || "2",
    };

    // WHAT: Build the persona and rule system prompt based on Chef Mode
    // HOW: Calls the helper function defined above
    // OUTCOME: Claude responds as a professional chef OR as Marco Fuoco
    const systemPrompt = buildSystemPrompt(Boolean(chefMode));

    // WHAT: Build the structured user message with all ingredients and preferences
    // HOW: Calls the helper function that formats everything into a detailed request
    // OUTCOME: Claude has all context in one clear message
    const userPrompt = buildUserPrompt(cleanIngredients, safeFilters, Boolean(chefMode));

    // WHAT: Run the Claude API call (with agentic web search loop)
    // HOW: Calls runAgenticLoop which handles tool_use responses automatically
    // OUTCOME: response contains Claude's final answer after any web validation
    // WHAT: Pass the per-request client into the loop so it uses the correct API key
    // HOW: client is now initialized inside POST and passed down as a parameter
    // OUTCOME: No module-level client; each request gets its own authenticated instance
    const response = await runAgenticLoop(systemPrompt, userPrompt, client);

    // WHAT: Extract the raw text string from Claude's response
    // HOW: Calls extractTextFromResponse which finds the text content block
    // OUTCOME: rawText is the string containing the JSON recipe object
    const rawText = extractTextFromResponse(response);

    // WHAT: Guard against a response with no text content
    // HOW: Throw an error that is caught below and returned as a 500
    // OUTCOME: User sees an error message instead of a blank or crashed page
    if (!rawText) {
      throw new Error("Claude returned an empty response. Please try again.");
    }

    // WHAT: Log the raw text to help debug JSON parsing issues during development
    // HOW: Only logs the first 500 characters to keep the terminal readable
    // OUTCOME: Developer can see if Claude returned valid JSON or extra text
    console.log("[RECIPE API] Raw Claude response (first 500 chars):", rawText.slice(0, 500));

    // WHAT: Parse the JSON recipe object from Claude's text response
    // HOW: Calls the helper that uses regex + JSON.parse
    // OUTCOME: recipe is a plain JavaScript object ready to return to the frontend
    const recipe = parseRecipeFromText(rawText);

    // WHAT: Check whether Claude used the web search tool during this request
    // HOW: Scan all response content blocks for any with type "tool_use"
    // OUTCOME: webValidated reflects whether real culinary sources were consulted
    const usedWebSearch = response.content.some(
      (block) => block.type === "tool_use" && block.name === "web_search"
    );

    // WHAT: Override the recipe's webValidated field with what actually happened
    // HOW: Direct property assignment overwrites whatever Claude put in the JSON
    // OUTCOME: webValidated is always accurate, not just what Claude claimed
    recipe.webValidated = usedWebSearch;

    // WHAT: If no web search was used, ensure a fallback validation note is set
    // HOW: Only set validationNote if it's not already present from Claude's response
    // OUTCOME: User always knows the recipe's confidence level
    if (!usedWebSearch && !recipe.validationNote) {
      recipe.validationNote =
        "Recipe based on AI culinary knowledge — always taste and adjust as you cook";
    }

    // WHAT: Log the final recipe name for easy request tracking in the terminal
    // HOW: Access dishName from the parsed recipe object
    // OUTCOME: Terminal shows which dish was generated without logging sensitive data
    console.log("[RECIPE API] Recipe generated:", recipe.dishName);

    // WHAT: Return the validated recipe object to the frontend
    // HOW: Response.json() serializes the object and sets Content-Type: application/json
    // OUTCOME: The frontend receives { recipe: {...} } and renders the RecipeDisplay
    return Response.json({ recipe });

  } catch (error) {
    // WHAT: Log the full error for server-side debugging
    // HOW: console.error sends to stderr so it stands out in the terminal
    // OUTCOME: Developers see the complete error including stack trace in the logs
    console.error("[RECIPE API] ERROR:", error);

    // WHAT: Detect Anthropic API authentication errors specifically
    // HOW: Check the error message for the word "authentication" or "api_key"
    // OUTCOME: User sees a targeted "check your API key" message instead of a generic error
    if (
      error.message?.includes("authentication") ||
      error.message?.includes("api_key") ||
      error.status === 401
    ) {
      return Response.json(
        {
          error:
            "API key error — please check that your ANTHROPIC_API_KEY is set correctly in .env.local",
        },
        { status: 401 }
      );
    }

    // WHAT: Detect rate limit errors from the Anthropic API
    // HOW: Check HTTP status 429 which Anthropic uses for rate limiting
    // OUTCOME: User sees a friendly "try again shortly" message instead of a crash
    if (error.status === 429) {
      return Response.json(
        {
          error:
            "Too many requests — Claude is busy right now. Please wait a few seconds and try again.",
        },
        { status: 429 }
      );
    }

    // WHAT: Return a generic error message for all other failure types
    // HOW: Use the error message if available, fall back to a generic string
    // OUTCOME: User always sees a human-readable error; the app never shows a blank failure
    return Response.json(
      {
        error:
          error.message ||
          "Failed to generate a recipe. Please check your ingredients and try again.",
      },
      { status: 500 }
    );
  }
}
