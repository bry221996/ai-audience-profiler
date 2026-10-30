export type AnswerValue = string | string[];

export type Answers = Record<string, AnswerValue>;

export interface SessionRow {
  id: string;
  client_session_id: string;
  status: "pending" | "completed";
  is_demo: boolean;
  user_agent: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ResponseRow {
  id: string;
  session_id: string;
  question_key: string;
  answer: AnswerValue;
  created_at: string;
}

/** One participant with all their answers, as consumed by the dashboard. */
export interface Submission {
  id: string;
  status: SessionRow["status"];
  is_demo: boolean;
  started_at: string;
  completed_at: string | null;
  answers: Answers;
}
