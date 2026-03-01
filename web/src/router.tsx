import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { RequireRole } from './components/auth/RequireRole';
import { Dashboard } from './pages/Dashboard';
import { ActivationsList } from './pages/ActivationsList';
import { ActivationWizard } from './pages/ActivationWizard';
import { CrisisList } from './pages/CrisisList';
import { CrisisDetail } from './pages/CrisisDetail';
import { ScenarioEngine } from './pages/ScenarioEngine';
import { SimulationDetail } from './pages/SimulationDetail';
import { ThreatAssessment } from './pages/ThreatAssessment';
import { ThreatDetail } from './pages/ThreatDetail';
import { DataSources } from './pages/DataSources';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ManualIngest } from './pages/ManualIngest';
import { AISettings } from './pages/settings/AISettings';
import { FlowBuilder } from './pages/FlowBuilder';
import { IntelligenceFeed } from './pages/IntelligenceFeed';
import { Login } from './pages/Login';
import { ActivationBriefing } from './pages/ActivationBriefing';
import { FlowsList } from './pages/FlowsList';
import { FlowExecutionHistory } from './pages/FlowExecutionHistory';
import { FlowOutputs } from './pages/FlowOutputs';
import { ServerHealth } from './pages/ServerHealth';

import { ActivationDetail } from './pages/ActivationDetail';
import { EntityWatchlist } from './pages/EntityWatchlist';
import { PublicReport } from './pages/PublicReport';
import MediaOutlets from './pages/MediaOutlets';
import { PublicDashboard } from './pages/PublicDashboard';

export const router = createBrowserRouter([
    {
        path: '/report/:token',
        element: <PublicReport />,
    },
    {
        path: '/dashboard/:token',
        element: <PublicDashboard />,
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/',
        element: (
            <RequireAuth>
                <MainLayout />
            </RequireAuth>
        ),
        children: [
            {
                index: true,
                element: <Dashboard />,
            },
            {
                path: 'feed',
                element: <IntelligenceFeed />,
            },
            {
                path: 'activations',
                element: <ActivationsList />,
            },
            {
                path: 'activations/new',
                element: (
                    <RequireRole roles={['admin', 'analyst']}>
                        <ActivationWizard />
                    </RequireRole>
                ),
            },
            {
                path: 'activations/:id',
                element: <ActivationDetail />,
            },
            {
                path: 'activations/:id/edit',
                element: (
                    <RequireRole roles={['admin', 'analyst']}>
                        <ActivationWizard />
                    </RequireRole>
                ),
            },
            {
                path: 'activations/:id/briefing',
                element: <ActivationBriefing />,
            },
            {
                path: 'crisis',
                element: <CrisisList />,
            },
            {
                path: 'crisis/:id',
                element: <CrisisDetail />,
            },
            {
                path: 'scenarios',
                element: (
                    <RequireRole roles={['admin', 'analyst']}>
                        <ScenarioEngine />
                    </RequireRole>
                ),
            },
            {
                path: 'scenarios/:id',
                element: (
                    <RequireRole roles={['admin', 'analyst']}>
                        <SimulationDetail />
                    </RequireRole>
                ),
            },
            {
                path: 'threats',
                element: <ThreatAssessment />,
            },
            {
                path: 'threats/:id',
                element: <ThreatDetail />,
            },
            {
                path: 'sources',
                element: (
                    <RequireRole roles={['admin', 'analyst']}>
                        <DataSources />
                    </RequireRole>
                ),
            },
            {
                path: 'reports',
                element: <Reports />,
            },
            {
                path: 'entities',
                element: (
                    <RequireRole roles={['admin', 'analyst']}>
                        <EntityWatchlist />
                    </RequireRole>
                ),
            },
            {
                path: 'media-outlets',
                element: (
                    <RequireRole roles={['admin']}>
                        <MediaOutlets />
                    </RequireRole>
                ),
            },
            {
                path: 'manual-ingest',
                element: (
                    <RequireRole roles={['admin', 'analyst', 'operator']}>
                        <ManualIngest />
                    </RequireRole>
                ),
            },
            {
                path: 'settings',
                element: (
                    <RequireRole roles={['admin']}>
                        <Settings />
                    </RequireRole>
                ),
            },
            {
                path: 'settings/ai',
                element: (
                    <RequireRole roles={['admin']}>
                        <AISettings />
                    </RequireRole>
                ),
            },
            {
                path: 'flows',
                element: (
                    <RequireRole roles={['admin', 'analyst', 'operator']}>
                        <FlowsList />
                    </RequireRole>
                ),
            },
            {
                path: 'flows/history',
                element: (
                    <RequireRole roles={['admin', 'analyst', 'operator']}>
                        <FlowExecutionHistory />
                    </RequireRole>
                ),
            },
            {
                path: 'flows/outputs',
                element: <FlowOutputs />,
            },
            {
                path: 'flows/builder',
                element: (
                    <RequireRole roles={['admin', 'analyst']}>
                        <FlowBuilder />
                    </RequireRole>
                ),
            },
            {
                path: 'server',
                element: (
                    <RequireRole roles={['admin']}>
                        <ServerHealth />
                    </RequireRole>
                ),
            },
        ],
    },
]);
