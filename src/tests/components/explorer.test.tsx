import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Datasets } from '../../pages/Pages';
import * as discoveryApi from '../../api/discovery';
import type { DiscoveredPackage } from '../../types/masterdb';

describe('Dataset Explorer Component Tests', () => {
  const samplePackages: DiscoveredPackage[] = [
    {
      package_id: 'pkg-alpha-001',
      dataset_id: 'dataset-alpha',
      dataset_version: '1.0.0',
      schema_version: '1.0.0',
      board: 'CBSE',
      medium: 'English',
      language: 'en',
      subject: 'Mathematics',
      grade: '10',
      owner: 'curriculum-team',
      status: 'VALIDATED',
    },
    {
      package_id: 'pkg-beta-002',
      dataset_id: 'dataset-beta',
      dataset_version: '2.0.0',
      schema_version: '1.1.0',
      board: 'ICSE',
      medium: 'English',
      language: 'en',
      subject: 'Science',
      grade: '9',
      owner: 'science-team',
      status: 'CERTIFIED',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially while fetching packages', async () => {
    vi.spyOn(discoveryApi, 'getDiscoveredPackages').mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Datasets />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading registered packages/i)).toBeInTheDocument();
  });

  it('renders discovered packages and allows searching/filtering', async () => {
    vi.spyOn(discoveryApi, 'getDiscoveredPackages').mockResolvedValue({ packages: samplePackages });

    render(
      <MemoryRouter>
        <Datasets />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('pkg-alpha-001')).toBeInTheDocument();
      expect(screen.getByText('pkg-beta-002')).toBeInTheDocument();
    });

    // Test filter input
    const filterInput = screen.getByPlaceholderText(/Filter loaded packages/i);
    fireEvent.change(filterInput, { target: { value: 'alpha' } });

    expect(screen.getByText('pkg-alpha-001')).toBeInTheDocument();
    expect(screen.queryByText('pkg-beta-002')).not.toBeInTheDocument();
  });

  it('renders empty state when no packages match the query or registry is empty', async () => {
    vi.spyOn(discoveryApi, 'getDiscoveredPackages').mockResolvedValue({ packages: [] });

    render(
      <MemoryRouter>
        <Datasets />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No packages registered in MASTERDB/i)).toBeInTheDocument();
    });
  });

  it('renders error state when package discovery API fails', async () => {
    vi.spyOn(discoveryApi, 'getDiscoveredPackages').mockRejectedValue(
      new Error('Failed to connect to Discovery Service')
    );

    render(
      <MemoryRouter>
        <Datasets />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to connect to Discovery Service/i)).toBeInTheDocument();
    });
  });
});
