'use cache';

export type WorkspaceIntent = {
  id: string;
  label: string;
  description: string;
  agentHint?: string;
};

export type WorkspaceInitialState = {
  intents: WorkspaceIntent[];
};

export function getWorkspaceInitialState(): WorkspaceInitialState {
  return {
    intents: [
      {
        id: 'q1_performance',
        label: 'Analyze my Q1 performance',
        description: 'Summarize revenue, costs, and trends from your latest data.',
        agentHint: 'analyst',
      },
      {
        id: 'competitor_map',
        label: 'Map my competitors',
        description: 'Generate a landscape map for Nexora vs Perplexity, Genspark, and more.',
        agentHint: 'researcher',
      },
      {
        id: 'launch_email',
        label: 'Draft a launch email',
        description: 'Turn research into a polished product launch email.',
        agentHint: 'writer',
      },
      {
        id: 'tech_stack_review',
        label: 'Review my tech stack',
        description: 'Assess performance, cost, and risk across your current stack.',
        agentHint: 'researcher',
      },
    ],
  };
}

