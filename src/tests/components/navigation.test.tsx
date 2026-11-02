import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import * as healthApi from '../../api/health';

describe('Navigation & AppShell Component Tests', () => {
  it('renders MASTERDB Control Center brand and navigation sidebar', async () => {
    vi.spyOn(healthApi, 'getHealth').mockResolvedValue({ status: 'ok' });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell />
      </MemoryRouter>
    );

    // Verify brand
    expect(screen.getAllByText(/MASTERDB/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Control Center')).toBeInTheDocument();

    // Verify groups
    expect(screen.getByText('CONTROL PLANE')).toBeInTheDocument();
    expect(screen.getByText('DATASET GOVERNANCE')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM OPERATIONS')).toBeInTheDocument();

    // Verify primary links
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dataset Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Observability' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'System & Admin' })).toBeInTheDocument();

    // Verify Governance sub-routes
    expect(screen.getByRole('link', { name: 'Governance Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Validation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Certification' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lineage & Provenance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retrieval Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit & Replay' })).toBeInTheDocument();

    // Verify System Operations includes both Controlled Ingestion AND Ingestion Jobs
    expect(screen.getByRole('link', { name: 'Controlled Ingestion' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ingestion Jobs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shared Data' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Connected/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders breadcrumbs dynamically based on current route', async () => {
    vi.spyOn(healthApi, 'getHealth').mockResolvedValue({ status: 'ok' });

    render(
      <MemoryRouter initialEntries={['/ingestion/jobs']}>
        <AppShell />
      </MemoryRouter>
    );

    const breadcrumbsNav = screen.getByLabelText('Breadcrumbs');
    expect(breadcrumbsNav).toHaveTextContent('Controlled Ingestion');
    expect(breadcrumbsNav).toHaveTextContent('Ingestion Jobs');

    await waitFor(() => {
      expect(screen.getAllByText(/Connected/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
