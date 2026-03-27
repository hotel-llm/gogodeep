// Type definitions and helpers — no hardcoded mock data

export interface ErrorLog {
  id: string;
  subject: string;
  topic: string;
  specific_error_tag: string;
  error_category: string;
  created_at: string;
}

export interface TopicMastery {
  topic: string;
  subject: string;
  score: number; // 0-100
  errorCount: number;
}

export interface DiagnosisResult {
  error_category: string;
  error_tag: string;
  explanation: string;
  practice_problems: {
    id: number;
    question: string;
    answer: string;
  }[];
  input_status?: "ok" | "blurry" | "not_stem";
}

export function getMasteryColor(score: number): "red" | "yellow" | "green" {
  if (score < 40) return "red";
  if (score < 70) return "yellow";
  return "green";
}
