import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mimeType } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        system: `You are an expert STEM tutor specializing in diagnosing errors in student work (math, physics, chemistry).

Analyze the uploaded image of a student's incorrect working. Identify the EXACT point where the logic breaks down.

If the image is NOT a photo of STEM student working (e.g. a cat, a meme, scenery) OR it is too blurry to read, you MUST still use the tool, but set input_status accordingly and make the explanation a clear instruction to re-upload a readable photo of the student's work.

You MUST respond using the diagnose_error tool.`,
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
              {
                type: "text",
                text: "Analyze this student's work. Find the specific error, categorize it, explain what went wrong in 2-3 sentences, and generate 3 targeted practice problems that test exactly that weakness.",
              },
            ],
          },
        ],
        tools: [
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
                  description: "Exactly 3 practice problems targeting this specific weakness",
                },
                input_status: {
                  type: "string",
                  enum: ["ok", "blurry", "not_stem"],
                  description: "Set to 'ok' for readable STEM work; otherwise indicate why the input cannot be diagnosed.",
                },
              },
              required: ["error_category", "error_tag", "explanation", "practice_problems", "input_status"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "diagnose_error" },
      }),
    });

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

    return new Response(JSON.stringify(toolUse.input), {
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
