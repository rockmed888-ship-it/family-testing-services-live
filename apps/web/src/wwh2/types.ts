export interface GuideStep {
  target: string;
  title: string;
  message: string;
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  audience: string;
  estimatedMinutes: number;
  steps: GuideStep[];
}

export interface ActiveGuide {
  playbook: Playbook;
  stepIndex: number;
}

export interface GuideFeedbackPayload {
  playbookId: string;
  playbookTitle: string;
  rating: number;
  helpful: boolean;
  comment?: string;
  completedSteps: number;
  totalSteps: number;
}
