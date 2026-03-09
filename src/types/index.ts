export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
};

export type AIModel = {
  id: string;
  name: string;
  provider: string;
};

export type AIAgent = {
  id: string;
  name: string;
  icon: string;
};
