import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import {
  Dashboard,
  DatasetDetails,
  Datasets,
  Ingestion,
  Jobs,
  NotFound,
  Observability,
  Admin,
} from '../pages/Pages';
import {
  GovernanceOverview,
  ValidationView,
  CertificationView,
  RetrievalReadinessView,
  LineageView,
  AuditView,
  SharedDataAdminView,
} from '../pages/GovernancePages';

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
      { path: 'governance', element: <GovernanceOverview /> },
      { path: 'governance/validation', element: <ValidationView /> },
      { path: 'governance/certification', element: <CertificationView /> },
      { path: 'governance/retrieval', element: <RetrievalReadinessView /> },
      { path: 'lineage', element: <LineageView /> },
      { path: 'audit', element: <AuditView /> },
      { path: 'observability', element: <Observability /> },
      { path: 'admin', element: <Admin /> },
      { path: 'admin/shared-data', element: <SharedDataAdminView /> },
      { path: 'admin/system', element: <Admin /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
