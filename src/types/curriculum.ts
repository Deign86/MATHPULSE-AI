export type CurriculumSubject = 'general_math' | 'business_math' | 'stat_prob' | 'org_management';
export type CurriculumDomain = 'NA' | 'MG' | 'DP';

export interface CurriculumSource {
  subject: string;
  quarter: number;
  sourceFile: string;
  page: number;
  score: number;
  content?: string;
  contentDomain?: string;
  chunkType?: string;
}

export interface CurriculumGroundedLessonResponse {
  explanation: string;
  retrievalConfidence?: number;
  retrievalBand?: 'high' | 'medium' | 'low';
  retrievalQuery?: string;
  needsReview?: boolean;
  sources: CurriculumSource[];
}

export interface CurriculumGroundedProblemResponse {
  problem: string;
  solution: string;
  competencyReference: string;
  sources: CurriculumSource[];
}
