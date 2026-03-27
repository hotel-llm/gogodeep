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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert STEM tutor specializing in diagnosing errors in student work (math, physics, chemistry).

Analyze the uploaded image of a student's incorrect working. Identify the EXACT point where the logic breaks down.

If the image is NOT a photo of STEM student working (e.g. a cat, a meme, scenery) OR it is too blurry to read, you MUST still return structured output, but set input_status accordingly and make the explanation a clear instruction to re-upload a readable photo of the student's work.

You MUST respond using the following tool.`;

    const userPrompt = `Analyze this student's work. Find the specific error, categorize it, explain what went wrong in 2-3 sentences, and generate 3 targeted practice problems that test exactly that weakness.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/png"};base64,${image}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "diagnose_error",
              description: "Return a structured diagnosis of the student's error with practice problems.",
              parameters: {
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
                required: ["error_category", "error_tag", "explanation", "practice_problems"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "diagnose_error" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const diagnosis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(diagnosis), {
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
