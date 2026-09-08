import { apiClient } from './client';
import type { HealthResponse, ReadinessResponse } from '../types/masterdb';

/** GET /health – returns liveness status */
export const getHealth = async (): Promise<HealthResponse> =>
  apiClient.request<HealthResponse>('/health');

/** GET /ready – returns readiness checks */
export const getReadiness = async (): Promise<ReadinessResponse> =>
  apiClient.request<ReadinessResponse>('/ready');
