/**
 * Survey definition. This is the single source of truth for the questionnaire.
 * The `key` values are stored in the database and referenced by the dashboard,
 * so change labels and options freely but keep keys stable.
 *
 * `supabase/migrations/0001_init.sql` seeds the same questions into the
 * `questions` table; keep the two in sync if you edit this file.
 */

export type QuestionType = "single" | "multi" | "text";

export interface Question {
  key: string;
  prompt: string;
  help?: string;
  type: QuestionType;
  options?: string[];
  /** When true, an "Other" free-text entry is offered for single/multi. */
  allowOther?: boolean;
  required: boolean;
  maxLength?: number;
}

export const QUESTIONS: Question[] = [
  {
    key: "role",
    prompt: "What is your current role?",
    type: "single",
    options: [
      "Business owner / founder",
      "Executive / manager",
      "Operations",
      "Sales / marketing",
      "Finance / accounting",
      "Software developer / IT",
      "Designer / creative",
      "HR / admin",
      "Educator / trainer",
      "Student",
    ],
    allowOther: true,
    required: true,
  },
  {
    key: "industry",
    prompt: "What industry do you work in?",
    type: "single",
    options: [
      "E-commerce / retail",
      "Technology / software",
      "Finance / banking",
      "Marketing / agency",
      "Education",
      "Healthcare",
      "Manufacturing / logistics",
      "Real estate",
      "Government / NGO",
      "BPO / outsourcing",
    ],
    allowOther: true,
    required: true,
  },
  {
    key: "frequency",
    prompt: "How frequently do you use AI?",
    type: "single",
    options: ["Daily", "A few times a week", "A few times a month", "Rarely", "Never"],
    required: true,
  },
  {
    key: "proficiency",
    prompt: "How would you describe your AI proficiency?",
    type: "single",
    options: [
      "Beginner — I'm just getting started",
      "Intermediate — I use it for everyday tasks",
      "Advanced — I build workflows with it",
      "Expert — I build products or systems with it",
    ],
    required: true,
  },
  {
    key: "tools",
    prompt: "Which AI tools have you used?",
    help: "Select all that apply.",
    type: "multi",
    options: [
      "ChatGPT",
      "Claude",
      "Gemini",
      "Microsoft Copilot",
      "GitHub Copilot / Cursor",
      "Midjourney / image generators",
      "Canva AI",
      "Notion AI",
      "n8n / Make / Zapier AI",
      "None yet",
    ],
    allowOther: true,
    required: true,
  },
  {
    key: "usage",
    prompt: "How do you currently use AI?",
    help: "Select all that apply.",
    type: "multi",
    options: [
      "Writing and editing",
      "Research and summarizing",
      "Brainstorming ideas",
      "Data analysis and spreadsheets",
      "Coding or scripting",
      "Customer support replies",
      "Content and social media",
      "Automating workflows",
      "Learning new topics",
      "I don't use AI yet",
    ],
    required: true,
  },
  {
    key: "integrated",
    prompt: "Have you integrated AI into your actual work processes?",
    type: "single",
    options: [
      "Yes, it's part of a regular workflow",
      "Partially — I use it ad hoc",
      "Not yet, but planning to",
      "No",
    ],
    required: true,
  },
  {
    key: "limitation",
    prompt: "What is your biggest limitation when using AI?",
    type: "single",
    options: [
      "Not sure how to write good prompts",
      "Don't trust the accuracy",
      "Don't know which tool to use",
      "Hard to connect it to my existing tools",
      "Data privacy and security concerns",
      "Cost",
      "No time to learn",
      "Nothing — it works well for me",
    ],
    allowOther: true,
    required: true,
  },
  {
    key: "capability",
    prompt: "Which AI capability do you most want to master?",
    type: "single",
    options: [
      "Prompting and getting reliable outputs",
      "Workflow automation and agents",
      "Data analysis and reporting",
      "Building apps with AI (vibe coding)",
      "Content generation at scale",
      "Customer-facing chatbots",
      "Document processing and extraction",
    ],
    allowOther: true,
    required: true,
  },
  {
    key: "repetitive_task",
    prompt: "What repetitive task would you like AI to handle?",
    help: "A sentence or two is enough.",
    type: "text",
    required: true,
    maxLength: 400,
  },
  {
    key: "vibe_coding",
    prompt: "Have you tried building an application using AI?",
    type: "single",
    options: [
      "Yes, and I shipped something",
      "Yes, as an experiment",
      "No, but I want to",
      "No, and it's not for me",
    ],
    required: true,
  },
  {
    key: "six_month_goal",
    prompt: "What would you like to accomplish using AI in the next six months?",
    help: "Be specific — this shapes what we cover today.",
    type: "text",
    required: true,
    maxLength: 600,
  },
];

export const QUESTION_MAP: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.key, q]),
);

export const OTHER_PREFIX = "Other: ";

/** Numeric score used for the average-proficiency metric. */
export const PROFICIENCY_SCORE: Record<string, number> = {
  "Beginner — I'm just getting started": 1,
  "Intermediate — I use it for everyday tasks": 2,
  "Advanced — I build workflows with it": 3,
  "Expert — I build products or systems with it": 4,
};

export const PROFICIENCY_SHORT: Record<string, string> = {
  "Beginner — I'm just getting started": "Beginner",
  "Intermediate — I use it for everyday tasks": "Intermediate",
  "Advanced — I build workflows with it": "Advanced",
  "Expert — I build products or systems with it": "Expert",
};

/** Answers that count a participant as "interested in automation". */
export const AUTOMATION_CAPABILITY = "Workflow automation and agents";
export const AUTOMATION_USAGE = "Automating workflows";
