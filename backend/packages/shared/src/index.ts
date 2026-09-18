export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export * from './rabbitmq';

export interface SubmissionCompletedEvent {
  submissionId: string;
  userId: string;
  questionId: string;
  status: string;
  executionTime: number;
}

export interface QuestionCreatedEvent {
  questionId: string;
  title: string;
}

export interface ChallengePublishedEvent {
  challengeId: string;
  questionId: string;
  date: string;
}
export * from './logger';
export * from './middleware';
