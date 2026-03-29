const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("diagnose-image invoked");
    const { image, mimeType, mode = "identify" } = await req.json();
    console.log("parsed body, mimeType:", mimeType, "mode:", mode);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("API key present:", !!ANTHROPIC_API_KEY);
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isGuide = mode === "guide";

    const systemPrompt = isGuide
      ? `You are an expert STEM tutor. A student has uploaded a question they need help understanding. Break down the solution step by step so they can follow along.

If the image is NOT a STEM question (e.g. a cat, a meme, scenery) OR it is too blurry to read, you MUST still use the tool, but set input_status accordingly and make the underlying_concept field a clear instruction to re-upload a readable photo of the question.

You MUST respond using the guide_question tool.`
      : `You are an expert STEM tutor specializing in diagnosing errors in student work (math, physics, chemistry).

Analyze the uploaded image of a student's incorrect working. Identify the EXACT point where the logic breaks down.

If the image is NOT a photo of STEM student working (e.g. a cat, a meme, scenery) OR it is too blurry to read, you MUST still use the tool, but set input_status accordingly and make the explanation a clear instruction to re-upload a readable photo of the student's work.

You MUST respond using the diagnose_error tool.`;

    const tools = isGuide
      ? [
          {
            name: "guide_question",
            description: "Return a structured step-by-step guide for the student's question with practice problems.",
            input_schema: {
              type: "object",
              properties: {
                question_summary: {
                  type: "string",
                  description: "A one-sentence description of what the question is asking",
                },
                underlying_concept: {
                  type: "string",
                  description: "The key mathematical or scientific concept being tested, explained in 2-3 sentences",
                },
                steps: {
                  type: "array",
                  items: { type: "string" },
                  description: "Clear step-by-step solution, each step as a single complete instruction",
                },
                practice_problems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["id", "question", "answer"],
                  },
                  description: "Exactly 5 practice problems at a similar difficulty level",
                },
                input_status: {
                  type: "string",
                  enum: ["ok", "blurry", "not_stem"],
                  description: "Set to 'ok' for readable STEM question; otherwise indicate why the input cannot be processed.",
                },
              },
              required: ["question_summary", "underlying_concept", "steps", "practice_problems", "input_status"],
            },
          },
        ]
      : [
          {
            name: "diagnose_error",
            description: "Return a structured diagnosis of the student's error with practice problems.",
            input_schema: {
              type: "object",
              properties: {
                error_category: {
                  type: "string",
                  enum: ["Conceptual", "Procedural", "Computational", "Notational"],
                  description: "The broad category of the error",
                },
                error_tag: {
                  type: "string",
                  description: "A specific short label for the error, e.g. 'Unit Conversion', 'Sign Error', 'Formula Rearrangement'",
                },
                explanation: {
                  type: "string",
                  description: "A clear 2-3 sentence explanation of exactly where and why the logic broke down",
                },
                underlying_concept: {
                  type: "string",
                  description: "The key mathematical or scientific concept being tested, explained in 2-3 sentences",
                },
                practice_problems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["id", "question", "answer"],
                  },
                  description: "Exactly 5 practice problems targeting this specific weakness",
                },
                input_status: {
                  type: "string",
                  enum: ["ok", "blurry", "not_stem"],
                  description: "Set to 'ok' for readable STEM work; otherwise indicate why the input cannot be diagnosed.",
                },
              },
              required: ["error_category", "error_tag", "explanation", "underlying_concept", "practice_problems", "input_status"],
            },
          },
        ];

    const toolName = isGuide ? "guide_question" : "diagnose_error";
    const userText = isGuide
      ? "Walk me through this question step by step. Identify the underlying concept, provide a clear step-by-step solution, and generate 5 practice problems at a similar difficulty."
      : "Analyze this student's work. Find the specific error, categorize it, explain what went wrong in 2-3 sentences, explain the underlying concept, and generate 5 targeted practice problems that test exactly that weakness.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType || "image/png",
                  data: image,
                },
              },
              { type: "text", text: userText },
            ],
          },
        ],
        tools,
        tool_choice: { type: "tool", name: toolName },
      }),
    });

    console.log("Anthropic response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolUse = data.content?.find((block: any) => block.type === "tool_use");

    if (!toolUse) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ...toolUse.input, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnose-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
