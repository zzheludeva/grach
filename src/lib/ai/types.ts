import type { AIScenario, IdeaCard, Locale } from "@/lib/types";

/** Provider-agnostic contract. The demo script and the live LLM route both implement it. */
export interface AITurnInput {
  scenario: AIScenario;
  locale: Locale;
  nodeId: string | null;
  history: { role: "user" | "assistant"; text: string }[];
  userText: string;
  optionNext?: string;
  postContext?: { title: string; body: string; category?: string };
}

export interface AITurnOutput {
  text: string;
  ideas?: IdeaCard[];
  options?: { label: string; next: string }[];
  nodeId: string | null;
}

export interface AIProvider {
  mode: "demo" | "live";
  reply(input: AITurnInput): Promise<AITurnOutput>;
}
