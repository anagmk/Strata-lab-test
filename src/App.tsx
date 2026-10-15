import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import { Projects, ProjectDetail } from './pages/Projects'
import Samples from './pages/Samples'
import Tests from './pages/Tests'
import RunDetail from './pages/RunDetail'
import Reports from './pages/Reports'
import ReportView from './pages/ReportView'
import Insights from './pages/Insights'
import Equipment from './pages/Equipment'
import Settings from './pages/Settings'
import { ErrorState } from './components/States'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="samples" element={<Samples />} />
        <Route path="tests" element={<Tests />} />
        <Route path="runs/:id" element={<RunDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:id" element={<ReportView />} />
        <Route path="ai" element={<Insights />} />
        <Route path="equipment" element={<Equipment />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<ErrorState title="Page not found" body="That address does not exist." />} />
      </Route>
    </Routes>
  )
}
