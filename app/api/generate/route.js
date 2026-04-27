// WHAT: Import Google's Generative AI SDK for making Gemini API calls
// HOW: Default import from the official @google/generative-ai package
// OUTCOME: GoogleGenerativeAI class is available to create model instances
import { GoogleGenerativeAI } from "@google/generative-ai";

// WHAT: Define the Gemini model — 2.0-flash is confirmed available on the v1beta endpoint
// HOW: Stored as a constant so it's easy to swap in one place
// OUTCOME: Every API call uses this model; rate limits are handled by the fallback logic
const MODEL = "gemini-2.0-flash";

// WHAT: Build the system instruction that defines the AI's persona and rules
// HOW: Returns different text based on whether Chef Mode (Marco Fuoco) is active
// OUTCOME: Gemini either responds as a professional culinary assistant or as Marco Fuoco
function buildSystemPrompt(chefMode) {
  if (chefMode) {
    // WHAT: Marco Fuoco persona — intense, passionate, brutally honest Italian chef
    // HOW: Detailed character description shapes every sentence Gemini writes
    // OUTCOME: Recipe instructions and tips read like a real dramatic Italian chef wrote them
    return `You are Marco Fuoco — an intense, brutally honest Italian chef with three Michelin stars and zero patience for mediocrity. You are passionate about quality ingredients, proper technique, and teaching people to cook with soul. Your voice is theatrical, occasionally dramatic, and filled with love for the craft. You speak in short, punchy sentences. You may sprinkle in occasional Italian exclamations (Mamma mia!, Basta!, Andiamo!). You genuinely want people to succeed in the kitchen, but you will not coddle them. You must still return a valid JSON recipe — your personality comes through in the instruction text and chef tip fields, not in the JSON structure itself.`;
  }

  // WHAT: Default professional culinary assistant persona
  // HOW: Calm, encouraging, educational tone focused on clear instructions
  // OUTCOME: Recipes are approachable and well-explained for home cooks of any level
  return `You are a professional culinary assistant with deep knowledge of world cuisines, nutrition, and cooking technique. You are encouraging, precise, and educational. You focus on making every home cook feel capable and confident. Your instructions are clear, step-by-step, and include helpful technique tips within each step.`;
}

// WHAT: Build the user message prompt with all ingredients and filter preferences
// HOW: Constructs a detailed structured prompt string that Gemini will follow exactly
// OUTCOME: Gemini receives all context needed to generate a complete, correct recipe
function buildUserPrompt(ingredients, filters, chefMode) {
  // WHAT: Format the ingredient list as a readable comma-separated string
  // HOW: Array.join(", ") concatenates all ingredient strings
  // OUTCOME: "chicken, garlic, lemon" is clearer to the model than a raw array
  const ingredientList = ingredients.join(", ");

  // WHAT: Construct dietary restriction instruction
  // HOW: Template literal embeds filter value into a descriptive sentence
  // OUTCOME: Gemini sees an explicit instruction like "This recipe MUST be Vegan"
  const dietaryLine =
    filters.dietary === "none"
      ? "No dietary restrictions apply."
      : `This recipe MUST comply with the following dietary restriction: ${filters.dietary}. Do not include any ingredients that violate this restriction.`;

  // WHAT: Construct skill level instruction with appropriate detail level
  // HOW: Ternary chain maps skill string to an explanatory sentence
  // OUTCOME: Beginner recipes explain every step; advanced recipes assume kitchen knowledge
  const skillLine = `The cooking instructions should be appropriate for a ${filters.skill} cook. ${
    filters.skill === "beginner"
      ? "Explain every technique clearly — assume no prior knowledge."
      : filters.skill === "intermediate"
      ? "Include technique tips but assume basic kitchen skills."
      : "You may use advanced techniques and assume high culinary knowledge."
  }`;

  // WHAT: Construct serving size instruction
  // HOW: Template literal embeds the servings value with correct singular/plural
  // OUTCOME: Gemini scales ingredient amounts to match the desired yield exactly
  const servingsLine = `Scale the recipe to serve ${filters.servings} ${
    filters.servings === "1" ? "person" : "people"
  }.`;

  return `${chefMode ? "Marco, create a recipe" : "Create a recipe"} using ONLY these available ingredients: ${ingredientList}

${dietaryLine}
${skillLine}
${servingsLine}

IMPORTANT RULES:
1. Use ONLY the listed ingredients. You may add a maximum of 3 common pantry staples (salt, black pepper, and/or cooking oil) ONLY if absolutely necessary.
2. Do not add any other ingredients — the user only has what is listed.
3. Use Google Search to find a similar established recipe online and cross-reference your cook times, temperatures, and techniques. If your values differ from real-world sources, correct them before responding.
4. The chefTip field MUST begin with "Culinary best practice:" and cite a technique or fact validated through search. If search returned no results, begin with "Culinary best practice (AI knowledge):" instead.
5. If search validation was inconclusive, set validationNote to: "Recipe based on AI culinary knowledge — always taste and adjust as you cook"

Return your response as a single JSON object with EXACTLY this structure — no markdown fences, no extra text, only the raw JSON object:

{
  "dishName": "Name of the dish",
  "cookTime": "e.g. 35 minutes",
  "difficulty": "Beginner" or "Intermediate" or "Advanced Chef",
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

// WHAT: Parse a JSON recipe object out of Gemini's text response
// HOW: Uses a regex to locate the outermost { } JSON block and JSON.parse() it
// OUTCOME: Returns a plain JavaScript object representing the recipe
function parseRecipeFromText(text) {
  // WHAT: Strip markdown code fences if Gemini wrapped the JSON in ```json ... ```
  // HOW: Regex removes the opening ```json or ``` and closing ``` lines
  // OUTCOME: Raw JSON string is left even if the model added markdown formatting
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // WHAT: Match the outermost JSON object in the response string
  // HOW: Regex /{[\s\S]*}/ matches from the first { to the last } including newlines
  // OUTCOME: Works even if Gemini adds a sentence before or after the JSON
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // WHAT: Throw a descriptive error if no JSON is found
    // HOW: throw causes execution to jump to the catch block in the POST handler
    // OUTCOME: Error is caught and returned as a user-friendly 500 response
    throw new Error(
      "The AI did not return a valid recipe format. Please try again."
    );
  }

  // WHAT: Parse the matched JSON string into a JavaScript object
  // HOW: JSON.parse() converts the string; throws SyntaxError if malformed
  // OUTCOME: Returns a typed recipe object or throws for the catch block to handle
  return JSON.parse(jsonMatch[0]);
}

// WHAT: POST handler — the entry point for all recipe generation API calls
// HOW: Next.js App Router calls this when POST /api/generate is hit
// OUTCOME: Returns { recipe } on success or { error } on failure as JSON
export async function POST(request) {
  try {
    // WHAT: Read and validate the Gemini API key at request time
    // HOW: process.env is read inside the handler so Vercel's runtime env is available
    // OUTCOME: Missing key returns a clear 500 before any model call is made
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("[RECIPE API] Gemini key present:", !!apiKey, "| length:", apiKey?.length ?? 0);

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Server configuration error: GEMINI_API_KEY is not set. Add it in your Vercel environment variables and redeploy.",
        },
        { status: 500 }
      );
    }

    // WHAT: Parse the JSON body sent by the frontend
    // HOW: request.json() reads and parses the request body stream
    // OUTCOME: ingredients, filters, and chefMode are available as JS values
    const body = await request.json();
    const { ingredients, filters, chefMode } = body;

    // WHAT: Log incoming request details for debugging in Vercel logs
    // HOW: console.log writes to the serverless function log output
    // OUTCOME: Developer can trace every request without adding UI instrumentation
    console.log("[RECIPE API] Ingredients:", ingredients);
    console.log("[RECIPE API] Filters:", filters);
    console.log("[RECIPE API] Chef Mode:", chefMode);

    // ── Input Validation ────────────────────────────────────
    // WHAT: Reject requests with no ingredients
    // HOW: Check array exists, is an array, and has at least one item
    // OUTCOME: Returns 400 with a clear message before hitting the Gemini API
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return Response.json(
        { error: "Please add at least one ingredient before generating a recipe." },
        { status: 400 }
      );
    }

    // WHAT: Guard against too many ingredients bloating the prompt
    // HOW: Length check with a generous limit of 30
    // OUTCOME: Keeps API costs reasonable and prompts clean
    if (ingredients.length > 30) {
      return Response.json(
        { error: "Too many ingredients — please keep your list to 30 or fewer." },
        { status: 400 }
      );
    }

    // WHAT: Sanitize each ingredient string
    // HOW: Trim whitespace, cap at 60 chars, filter empty strings
    // OUTCOME: Malformed ingredient names cannot corrupt the prompt
    const cleanIngredients = ingredients
      .map((ing) => String(ing).trim().slice(0, 60))
      .filter((ing) => ing.length > 0);

    // WHAT: Apply safe defaults for any missing filter fields
    // HOW: Destructure with fallbacks in case the frontend omits a field
    // OUTCOME: API never crashes on missing filter values
    const safeFilters = {
      dietary:  filters?.dietary  || "none",
      skill:    filters?.skill    || "beginner",
      servings: filters?.servings || "2",
    };

    // WHAT: Initialize the Google Generative AI client with the API key
    // HOW: GoogleGenerativeAI constructor accepts the key as its only argument
    // OUTCOME: Authenticated client ready to create model instances
    const genAI = new GoogleGenerativeAI(apiKey);

    // WHAT: Build the full user prompt with ingredients and all filter preferences
    // HOW: Calls the helper that formats everything into one detailed request string
    // OUTCOME: Gemini has all context in one clear message
    const userPrompt = buildUserPrompt(cleanIngredients, safeFilters, Boolean(chefMode));

    // WHAT: Shared contents array used for both the grounded and fallback requests
    // HOW: Defined once so both model instances can reuse it without duplication
    // OUTCOME: Prompt is identical whether grounding is used or not
    const contents = [
      {
        role: "user",
        // WHAT: Wrap the prompt string in a parts array as required by the Gemini API
        // HOW: parts is an array of content objects; text type holds the prompt string
        // OUTCOME: Gemini receives the full recipe request in the correct message format
        parts: [{ text: userPrompt }],
      },
    ];

    // WHAT: Shared system instruction used for both model instances
    // HOW: Built once from chefMode flag and reused to avoid duplication
    // OUTCOME: Persona is consistent whether grounding succeeds or falls back
    const systemInstruction = buildSystemPrompt(Boolean(chefMode));

    // WHAT: Attempt recipe generation with Google Search grounding first
    // HOW: Try/catch wraps the grounded call; 429 rate limit triggers the fallback
    // OUTCOME: Grounding is used when available; recipe still generates when rate-limited
    let geminiResponse;
    let usedSearch = false;

    try {
      // WHAT: Create a model instance with Google Search grounding enabled
      // HOW: tools: [{ googleSearch: {} }] enables Gemini to search the web
      // OUTCOME: Cook times, temperatures, and techniques are cross-referenced against real sources
      console.log("[RECIPE API] Attempting request with Google Search grounding...");
      const groundedModel = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction,
        tools: [{ googleSearch: {} }],
      });

      const groundedResult = await groundedModel.generateContent({ contents });
      geminiResponse = groundedResult.response;

      // WHAT: Detect whether Gemini actually used Google Search grounding
      // HOW: groundingMetadata.webSearchQueries is populated only when search ran
      // OUTCOME: usedSearch accurately reflects whether real sources were consulted
      const groundingMeta = geminiResponse.candidates?.[0]?.groundingMetadata;
      usedSearch = !!(
        groundingMeta?.webSearchQueries?.length ||
        groundingMeta?.groundingChunks?.length
      );
      console.log("[RECIPE API] Grounded request succeeded. Web search used:", usedSearch);

    } catch (groundingError) {
      // WHAT: Catch rate limit (429) or quota errors from the grounding call
      // HOW: Check error status or message to confirm it's a rate/quota issue
      // OUTCOME: Falls back to a plain (no grounding) Gemini call so the recipe still generates
      const isRateLimit =
        groundingError.status === 429 ||
        groundingError.message?.includes("429") ||
        groundingError.message?.toLowerCase().includes("quota") ||
        groundingError.message?.toLowerCase().includes("rate");

      if (isRateLimit) {
        // WHAT: Log that grounding was skipped due to rate limiting
        // HOW: console.warn shows in Vercel logs as a warning rather than an error
        // OUTCOME: Developer knows the fallback triggered; user sees a working recipe
        console.warn("[RECIPE API] Grounding rate-limited — falling back to model-only generation.");

        // WHAT: Create a second model instance without the Google Search tool
        // HOW: Omit the tools array so Gemini uses its trained knowledge only
        // OUTCOME: Recipe is generated from Gemini's culinary knowledge; webValidated stays false
        const plainModel = genAI.getGenerativeModel({
          model: MODEL,
          systemInstruction,
        });

        const plainResult = await plainModel.generateContent({ contents });
        geminiResponse = plainResult.response;
        usedSearch = false;

      } else {
        // WHAT: Re-throw any non-rate-limit errors so the outer catch handles them
        // HOW: throw passes the original error up to the catch block below
        // OUTCOME: Auth errors, network errors, etc. are still caught and returned correctly
        throw groundingError;
      }
    }

    // WHAT: Extract the plain text from whichever Gemini response was used
    // HOW: .text() joins all text parts from the first candidate
    // OUTCOME: rawText is the string containing the JSON recipe object
    const rawText = geminiResponse.text();
    console.log("[RECIPE API] Raw Gemini response (first 500 chars):", rawText.slice(0, 500));

    // WHAT: Guard against an empty response
    // HOW: Check that rawText has content before parsing
    // OUTCOME: Throws a descriptive error that the catch block returns to the user
    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Gemini returned an empty response. Please try again.");
    }

    // WHAT: Parse the JSON recipe object out of Gemini's text response
    // HOW: Calls the helper that strips markdown fences and uses JSON.parse
    // OUTCOME: recipe is a plain JavaScript object ready to return to the frontend
    const recipe = parseRecipeFromText(rawText);

    // WHAT: Set webValidated based on whether grounding actually ran
    // HOW: usedSearch was set in the try/catch block above
    // OUTCOME: webValidated is always accurate — not just what the model claimed
    recipe.webValidated = usedSearch;

    // WHAT: Set fallback validation note if no search was used
    // HOW: Only set if not already present in Gemini's response
    // OUTCOME: User always knows the recipe's confidence level
    if (!usedSearch && !recipe.validationNote) {
      recipe.validationNote =
        "Recipe based on AI culinary knowledge — always taste and adjust as you cook";
    }

    console.log("[RECIPE API] Recipe generated:", recipe.dishName, "| Web validated:", usedSearch);

    // WHAT: Return the validated recipe object to the frontend
    // HOW: Response.json() serializes the object with Content-Type: application/json
    // OUTCOME: The frontend receives { recipe: {...} } and renders the RecipeDisplay
    return Response.json({ recipe });

  } catch (error) {
    // WHAT: Log the full error server-side for debugging
    // HOW: console.error sends to stderr, visible in Vercel function logs
    // OUTCOME: Developers see the complete error and stack trace in logs
    console.error("[RECIPE API] ERROR:", error);

    // WHAT: Detect API key / authentication errors from the Gemini SDK
    // HOW: Check HTTP status 400/401 or key-related error message strings
    // OUTCOME: User sees a targeted "check your API key" message
    if (
      error.status === 400 ||
      error.status === 401 ||
      error.message?.includes("API_KEY") ||
      error.message?.includes("api key") ||
      error.message?.includes("API key")
    ) {
      return Response.json(
        {
          error:
            "API key error — please check that your GEMINI_API_KEY is set correctly in Vercel environment variables.",
        },
        { status: 401 }
      );
    }

    // WHAT: Detect rate limit errors — catches 429 from the plain-model fallback call
    // HOW: Check status code AND error message string since Gemini SDK surfaces both
    // OUTCOME: User sees a clear "wait and retry" message instead of a raw SDK error
    const isRateLimit =
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.toLowerCase().includes("quota") ||
      error.message?.toLowerCase().includes("rate limit") ||
      error.message?.toLowerCase().includes("too many");

    if (isRateLimit) {
      return Response.json(
        {
          error:
            "Gemini free tier limit reached. Please wait 60 seconds and try again — the free quota resets every minute.",
        },
        { status: 429 }
      );
    }

    // WHAT: Return a generic error for all other failures
    // HOW: Use error.message if available, fall back to a safe generic string
    // OUTCOME: User always sees a human-readable error; no silent failures
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
