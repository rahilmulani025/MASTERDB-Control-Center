import { apiClient } from './client';
import type { ValidationRequest, ValidationResponse, ValidationStatusResponse, ValidationReportResponse } from '../types/masterdb';

/** Trigger validation for a dataset/package */
export async function validateDataset(request: ValidationRequest): Promise<ValidationResponse> {
  return apiClient.request<ValidationResponse>('/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

/** Retrieve compact validation status for a dataset */
export async function getValidationStatus(datasetId: string): Promise<ValidationStatusResponse> {
  return apiClient.request<ValidationStatusResponse>(`/status/${encodeURIComponent(datasetId)}`);
}

/** Retrieve full validation report for a dataset */
export async function getValidationReport(datasetId: string): Promise<ValidationReportResponse> {
  return apiClient.request<ValidationReportResponse>(`/report/${encodeURIComponent(datasetId)}`);
}

