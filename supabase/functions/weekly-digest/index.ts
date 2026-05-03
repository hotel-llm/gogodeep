// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://gogodeep.com";

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.email) { skipped++; continue; }

      // Only email users who scanned in the past 7 days
      const { data: recentLogs } = await supabase
        .from("error_logs")
        .select("topic, specific_error_tag, error_category")
        .eq("student_id", user.id)
        .gte("created_at", oneWeekAgo);

      if (!recentLogs?.length) { skipped++; continue; }

      // Top weak areas all-time (up to 3)
      const { data: allLogs } = await supabase
        .from("error_logs")
        .select("topic, specific_error_tag")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const topicCount: Record<string, number> = {};
      for (const log of allLogs ?? []) {
        const t = log.specific_error_tag ?? log.topic;
        if (t) topicCount[t] = (topicCount[t] ?? 0) + 1;
      }
      const topWeakAreas = Object.entries(topicCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([topic]) => topic);

      // Most scanned topic this week
      const weeklyTopicCount: Record<string, number> = {};
      for (const log of recentLogs) {
        const t = log.specific_error_tag ?? log.topic;
        if (t) weeklyTopicCount[t] = (weeklyTopicCount[t] ?? 0) + 1;
      }
      const topTopic = Object.entries(weeklyTopicCount).sort((a, b) => b[1] - a[1])[0]?.[0];
      const conceptualCount = recentLogs.filter(l => l.error_category?.toLowerCase() === "conceptual").length;

      const username = (user.user_metadata?.username as string) ?? user.email.split("@")[0];
      const scanCount = recentLogs.length;

      const weakAreasHtml = topWeakAreas.length
        ? topWeakAreas.map(t => `<li style="margin-bottom:6px;color:#cbd5e1;">${t}</li>`).join("")
        : `<li style="color:#64748b;">Keep scanning to identify patterns.</li>`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#09090b;margin:0;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <div style="max-width:500px;margin:0 auto;">

    <p style="color:#3b82f6;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 32px;">Gogodeep</p>

    <h1 style="color:#f8fafc;font-size:24px;font-weight:800;margin:0 0 8px;line-height:1.2;">Your week in review, ${username}</h1>
    <p style="color:#64748b;font-size:15px;margin:0 0 32px;line-height:1.5;">Here's what Gogodeep learned about your understanding this week.</p>

    <!-- Stats row -->
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;">
        <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">This week</p>
        <p style="color:#f8fafc;font-size:28px;font-weight:800;margin:0;line-height:1;">${scanCount}</p>
        <p style="color:#64748b;font-size:12px;margin:4px 0 0;">scan${scanCount === 1 ? "" : "s"}</p>
      </div>
      ${conceptualCount > 0 ? `
      <div style="flex:1;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;">
        <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Gaps found</p>
        <p style="color:#f8fafc;font-size:28px;font-weight:800;margin:0;line-height:1;">${conceptualCount}</p>
        <p style="color:#64748b;font-size:12px;margin:4px 0 0;">conceptual</p>
      </div>` : ""}
    </div>

    ${topTopic ? `
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;">Most scanned this week</p>
      <p style="color:#f8fafc;font-size:16px;font-weight:600;margin:0;">${topTopic}</p>
    </div>` : ""}

    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:28px;">
      <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Your recurring weak areas</p>
      <ul style="margin:0;padding:0 0 0 16px;">${weakAreasHtml}</ul>
    </div>

    <a href="${siteUrl}/workspace" style="display:block;background:#3b82f6;color:#ffffff;text-align:center;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:28px;">
      Scan something today →
    </a>

    <p style="color:#3f3f46;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      You're getting this because you have a Gogodeep account.<br>
      <a href="${siteUrl}" style="color:#3f3f46;text-decoration:underline;">Unsubscribe</a>
    </p>

  </div>
</body>
</html>`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Gogodeep <noreply@auth.gogodeep.com>",
          to: [user.email],
          subject: `${scanCount} scan${scanCount === 1 ? "" : "s"} this week${topTopic ? ` · focus: ${topTopic}` : ""}`,
          html,
        }),
      });

      if (emailRes.ok) sent++;
      else {
        const err = await emailRes.text();
        console.error(`Failed to send to ${user.email}:`, err);
      }
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("weekly-digest error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
