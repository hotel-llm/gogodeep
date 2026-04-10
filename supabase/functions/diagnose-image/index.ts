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
    const { image, mimeType, mode = "identify", text } = await req.json();
    console.log("parsed body, mimeType:", mimeType, "mode:", mode, "text input:", !!text);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("API key present:", !!ANTHROPIC_API_KEY);
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isGuide = mode === "guide";

    const mathInstruction = `

MATHEMATICAL NOTATION: In every string field you return, express all mathematical content using LaTeX delimiters — inline math as $...$ and display/centred equations as $$...$$. For example: "Differentiate $f(x) = x^2$ to get $$f'(x) = 2x$$". Use LaTeX for all variables, fractions (\\frac{}{}), integrals (\\int), exponents, Greek letters, subscripts, square roots (\\sqrt{}), etc. Never write raw LaTeX commands outside of these delimiters, and never write maths in plain text (e.g. never write "x^2", always write "$x^2$").`;

    const systemPrompt = isGuide
      ? `You are an expert STEM tutor. A student has uploaded a question they need help understanding. Break down the solution step by step so they can follow along.

If the image is NOT a STEM question (e.g. a cat, a meme, scenery) OR it is too blurry to read, you MUST still use the tool, but set input_status accordingly and make the underlying_concept field a clear instruction to re-upload a readable photo of the question.

You MUST respond using the guide_question tool.${mathInstruction}`
      : `You are an expert STEM tutor specializing in diagnosing errors in student work (math, physics, chemistry).

Analyze the uploaded image of a student's incorrect working. Identify the EXACT point where the logic breaks down.

If the image is NOT a photo of STEM student working (e.g. a cat, a meme, scenery) OR it is too blurry to read, you MUST still use the tool, but set input_status accordingly and make the explanation a clear instruction to re-upload a readable photo of the student's work.

You MUST respond using the diagnose_error tool.${mathInstruction}`;

    const tools = isGuide
      ? [
          {
            name: "guide_question",
            description: "Return a structured step-by-step guide for the student's question with practice problems.",
            input_schema: {
              type: "object",
              properties: {
                concept_label: {
                  type: "string",
                  description: "A 2-3 word label for the concept being tested, e.g. 'Quadratic Formula', 'Newton Second Law', 'Mole Ratios'",
                },
                question_summary: {
                  type: "string",
                  description: "A one-sentence description of what the question is asking",
                },
                what_happened: {
                  type: "string",
                  description: "2-3 sentences about this specific problem: what the student was solving (or what the question demands), exactly where things went wrong or what the question requires, and what the consequence of that is. Be specific — reference the actual numbers, expressions, or steps visible in the image.",
                },
                core_concept: {
                  type: "string",
                  description: "3-5 sentences explaining the underlying concept in purely general terms — zero reference to this specific problem. Explain the 'why' behind how it works, not just what it is. Address the most common misconception students have. Write as if teaching a student the night before an exam who needs to understand it deeply, not just recall a formula.",
                },
                recognition_cue: {
                  type: "string",
                  description: "2-3 sentences of actionable advice for the next time the student encounters this question type. Begin with 'When you see...' or 'If the question asks...'. State exactly what to look for and what to do first. End with a concrete tip that prevents the most common mistake on this type of problem.",
                },
                steps: {
                  type: "array",
                  items: { type: "string" },
                  description: "Clear step-by-step solution, each step as a single complete instruction. Express all mathematical expressions using LaTeX notation: wrap inline math in single dollar signs ($...$) and display/centred equations in double dollar signs ($$...$$). For example: 'Differentiate $f(x) = x^2$ to get $$f'(x) = 2x$$'. Use LaTeX for all variables, fractions (\\frac{}{}), integrals (\\int), exponents, Greek letters, etc.",
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
                  description: "Exactly 5 practice problems at a similar difficulty level. Use $...$ LaTeX for all maths in question and answer fields. Each answer must be a whole number, a simple fraction, or a short text phrase — never a bare irrational number or square root. If a problem would naturally produce an irrational answer (e.g. x = √5), rephrase it so the answer is clean (e.g. ask for x² instead of x).",
                },
                input_status: {
                  type: "string",
                  enum: ["ok", "blurry", "not_stem"],
                  description: "Set to 'ok' for readable STEM question; otherwise indicate why the input cannot be processed.",
                },
              },
              required: ["concept_label", "question_summary", "what_happened", "core_concept", "recognition_cue", "steps", "practice_problems", "input_status"],
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
                  enum: ["Conceptual", "Procedural", "Computational", "Notational", "Correct"],
                  description: "The broad category of the error. Use 'Correct' if the student's work is fully correct.",
                },
                error_tag: {
                  type: "string",
                  description: "A specific short label for the error, e.g. 'Unit Conversion', 'Sign Error', 'Formula Rearrangement'. Use 'All correct' if the work is fully correct.",
                },
                explanation: {
                  type: "string",
                  description: "A clear 2-3 sentence explanation of exactly where and why the logic broke down. If the work is correct, say so briefly.",
                },
                what_happened: {
                  type: "string",
                  description: "2-3 sentences about this specific problem: what the student was solving (or what the question demands), exactly where things went wrong or what the question requires, and what the consequence of that is. Be specific — reference the actual numbers, expressions, or steps visible in the image.",
                },
                core_concept: {
                  type: "string",
                  description: "3-5 sentences explaining the underlying concept in purely general terms — zero reference to this specific problem. Explain the 'why' behind how it works, not just what it is. Address the most common misconception students have. Write as if teaching a student the night before an exam who needs to understand it deeply, not just recall a formula.",
                },
                recognition_cue: {
                  type: "string",
                  description: "2-3 sentences of actionable advice for the next time the student encounters this question type. Begin with 'When you see...' or 'If the question asks...'. State exactly what to look for and what to do first. End with a concrete tip that prevents the most common mistake on this type of problem.",
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
                  description: "Exactly 5 practice problems targeting this specific weakness. Use $...$ LaTeX for all maths in question and answer fields. Each answer must be a whole number, a simple fraction, or a short text phrase — never a bare irrational number or square root. If a problem would naturally produce an irrational answer, rephrase it so the answer is clean.",
                },
                input_status: {
                  type: "string",
                  enum: ["ok", "blurry", "not_stem"],
                  description: "Set to 'ok' for readable STEM work; otherwise indicate why the input cannot be diagnosed.",
                },
              },
              required: ["error_category", "error_tag", "explanation", "what_happened", "core_concept", "recognition_cue", "practice_problems", "input_status"],
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
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: text
              ? [{ type: "text", text: `${userText}\n\nQuestion: ${text}` }]
              : [
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
