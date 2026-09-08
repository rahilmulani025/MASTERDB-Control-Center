import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { Dashboard, DatasetDetails, Datasets, Ingestion, Jobs, NotFound, Placeholder, Observability, Admin } from '../pages/Pages';

const page = (name: string, table?: string[]) => <Placeholder name={name} table={table} />;

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'datasets', element: <Datasets /> },
      { path: 'datasets/:datasetId', element: <DatasetDetails /> },
      { path: 'ingestion', element: <Ingestion /> },
      { path: 'ingestion/jobs', element: <Jobs /> },
      { path: 'governance', element: page('governance') },
      { path: 'governance/validation', element: page('validation') },
      { path: 'governance/certification', element: page('certification') },
      { path: 'governance/retrieval', element: page('retrieval') },
      { path: 'lineage', element: page('lineage') },
      { path: 'audit', element: page('audit', ['Timestamp', 'Actor', 'Action', 'Object', 'Status', 'Trace ID']) },
      { path: 'observability', element: <Observability /> },
      { path: 'admin', element: <Admin /> },
      { path: 'admin/shared-data', element: page('shared') },
      { path: 'admin/system', element: <Admin /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

