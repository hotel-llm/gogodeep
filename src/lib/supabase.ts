import { supabase } from "@/integrations/supabase/client";

export const SCAN_LIMITS: Record<string, number | null> = {
  free: 3,
  intermediate: 10,
  deep: null,
};

export type ScanCreditState = {
  allowed: boolean;
  credits: number | null;
};

export async function checkScanCredits(): Promise<ScanCreditState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: true, credits: null };
  }

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("daily_scan_count, scan_reset_date, plan, bonus_scans")
    .eq("id", user.id)
    .single();

  if (error) {
    return { allowed: true, credits: null };
  }

  const plan = (data as any)?.plan ?? "free";
  const limit = SCAN_LIMITS[plan] ?? SCAN_LIMITS.free;

  if (limit === null) return { allowed: true, credits: null };

  const today = new Date().toISOString().split("T")[0];
  const resetDate = (data as any)?.scan_reset_date ?? "";
  const isNewDay = resetDate < today;

  if (isNewDay) {
    await (supabase as any)
      .from("profiles")
      .update({ daily_scan_count: 0, scan_reset_date: today })
      .eq("id", user.id);
  }

  const used = isNewDay ? 0 : ((data as any)?.daily_scan_count ?? 0);
  const bonusScans = (data as any)?.bonus_scans ?? 0;
  const remaining = Math.max(0, limit - used) + bonusScans;
  return { allowed: remaining > 0, credits: remaining };
}
