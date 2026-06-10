import type { Currency } from './common';

export type HSKLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';
export type JobStatus = 'active' | 'closed' | 'filled' | 'archived';
export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'interview';

export interface JobListingDto {
  id: string;
  sellerId: string;
  titleRu: string;
  titleEn: string;
  titleZh: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: Currency;
  type: JobType;
  hskLevel?: HSKLevel;
  status: JobStatus;
  expiresAt: string;
  location?: string;
  remote?: boolean;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobListingRequest {
  titleRu: string;
  titleEn: string;
  titleZh: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: Currency;
  type: JobType;
  hskLevel?: HSKLevel;
  location?: string;
  remote?: boolean;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  expiresAt: string;
}

export interface UpdateJobListingRequest {
  titleRu?: string;
  titleEn?: string;
  titleZh?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  salaryMin?: number;
  salaryMax?: number;
  status?: JobStatus;
  expiresAt?: string;
}

export interface JobApplicationDto {
  id: string;
  listingId: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  status: ApplicationStatus;
  resumeUrl?: string;
  coverLetter?: string;
  appliedAt: string;
  reviewedAt?: string;
}

export interface SubmitApplicationRequest {
  listingId: string;
  resumeUrl?: string;
  coverLetter?: string;
}

export interface JobResumeDto {
  id: string;
  userId: string;
  titleRu?: string;
  titleEn?: string;
  titleZh?: string;
  experience?: number;
  hskLevel?: HSKLevel;
  skills?: string[];
  languages?: string[];
  fileUrl?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateResumeRequest {
  titleRu?: string;
  titleEn?: string;
  titleZh?: string;
  experience?: number;
  hskLevel?: HSKLevel;
  skills?: string[];
  languages?: string[];
  fileUrl?: string;
  isPublic?: boolean;
}
