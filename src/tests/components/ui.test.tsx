import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
  EmptyState,
  SearchInput,
  DataTable,
  LoadingState,
  ErrorState,
} from '../../components/ui';

describe('UI Primitives and Common Components', () => {
  it('renders PageHeader with title, description, action and eyebrow', () => {
    render(
      <PageHeader
        title="Test Page Title"
        description="A test page description"
        eyebrow="SYSTEM TEST"
        action={<button>Action Button</button>}
      />
    );

    expect(screen.getByText('Test Page Title')).toBeInTheDocument();
    expect(screen.getByText('A test page description')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM TEST')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });

  it('renders SectionHeader with number, eyebrow, detail and action', () => {
    render(
      <SectionHeader
        title="Verification Gate"
        number="01"
        eyebrow="GATEWAY"
        detail="Perform full structural audit"
        action={<button>Audit</button>}
      />
    );

    expect(screen.getByText('Verification Gate')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('GATEWAY')).toBeInTheDocument();
    expect(screen.getByText('Perform full structural audit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Audit' })).toBeInTheDocument();
  });

  it('renders StatusBadge with varied kinds', () => {
    const { rerender } = render(<StatusBadge kind="success">Passed Badge</StatusBadge>);
    expect(screen.getByText('Passed Badge')).toBeInTheDocument();

    rerender(<StatusBadge kind="danger">Failed Badge</StatusBadge>);
    expect(screen.getByText('Failed Badge')).toBeInTheDocument();

    rerender(<StatusBadge kind="warning">Warning Badge</StatusBadge>);
    expect(screen.getByText('Warning Badge')).toBeInTheDocument();
  });

  it('renders EmptyState, LoadingState, and ErrorState', () => {
    const { rerender } = render(
      <EmptyState title="Nothing Found">
        Try adjusting your filter parameters.
      </EmptyState>
    );
    expect(screen.getByText('Nothing Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filter parameters.')).toBeInTheDocument();

    rerender(<LoadingState message="Fetching data from sovereign core…" />);
    expect(screen.getByText('Fetching data from sovereign core…')).toBeInTheDocument();

    rerender(<ErrorState message="Sovereign cluster unreachable." />);
    expect(screen.getByText('Sovereign cluster unreachable.')).toBeInTheDocument();
  });

  it('renders SearchInput and fires change events', () => {
    const handleChange = vi.fn();
    render(<SearchInput value="test query" onChange={handleChange} placeholder="Filter items" />);

    const input = screen.getByPlaceholderText('Filter items');
    expect(input).toHaveValue('test query');

    fireEvent.change(input, { target: { value: 'new query' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders DataTable with columns and object rows, including code-val styling', () => {
    const columns = ['Dataset ID', 'Target Engine', 'Checksum Hash', 'Status'];
    const rows = [
      {
        'Dataset ID': 'DS-900',
        'Target Engine': 'RelationalDB',
        'Checksum Hash': 'abcdef123456',
        Status: 'Active',
      },
      {
        'Dataset ID': '-',
        'Target Engine': 'DocStore',
        'Checksum Hash': '-',
        Status: 'Inactive',
      },
    ];

    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText('DS-900')).toBeInTheDocument();
    expect(screen.getByText('RelationalDB')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders DataTable empty state when rows is empty or when headers prop is used', () => {
    render(<DataTable columns={['Col A', 'Col B']} rows={[]} empty="No records located" />);
    expect(screen.getByText('No records located')).toBeInTheDocument();

    // With headers prop instead of columns
    const { rerender } = render(<DataTable headers={['Hdr 1', 'Hdr 2']} rows={[['Val 1', 'Val 2']]} />);
    expect(screen.getByText('Hdr 1')).toBeInTheDocument();
    expect(screen.getByText('Val 1')).toBeInTheDocument();

    // With no columns or headers specified and empty rows
    rerender(<DataTable rows={[]} empty="Completely empty" />);
    expect(screen.getByText('Completely empty')).toBeInTheDocument();
  });

  it('renders DataTable with array rows', () => {
    const rows = [
      ['Cell 1', 'Cell 2'],
      ['Cell 3', 'Cell 4'],
    ];
    render(<DataTable columns={['H1', 'H2']} rows={rows} />);
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 4')).toBeInTheDocument();
  });
});
