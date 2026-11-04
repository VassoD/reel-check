import { z } from "zod";

const MIN_APP_TOKEN_LENGTH = 24;

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  APP_TOKEN: z
    .string()
    .min(MIN_APP_TOKEN_LENGTH, `APP_TOKEN must be at least ${MIN_APP_TOKEN_LENGTH} characters`),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  GLADIA_API_KEY: z.string().min(1, "GLADIA_API_KEY is required"),
  RESEARCH_MODEL: z.string().default("gpt-6.1-sol"),
  REPORT_LANGUAGE: z.string().default("English"),
  DATA_DIR: z.string().default("./data"),
  YTDLP_COOKIES_FROM_BROWSER: z.string().optional(),
  MAX_CLAIMS_TO_INVESTIGATE: z.coerce.number().int().min(1).max(10).default(5),
  MAX_ANALYSES_PER_HOUR: z.coerce.number().int().positive().default(20),
  MAX_CONCURRENT_ANALYSES: z.coerce.number().int().positive().default(2),
});

export type AppConfig = z.infer<typeof EnvSchema>;

function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}\nSee .env.example.`);
  }
  return parsed.data;
}

export const config: AppConfig = loadConfig();
