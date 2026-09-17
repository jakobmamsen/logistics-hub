import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './utils/supabaseClient'

// Import components
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import Dashboard from './components/Dashboard'
import QuotesList from './components/QuotesList'
import RequestsList from './components/RequestsList'
import RequestNew from './components/RequestNew'
import QuoteBuilder from './components/QuoteBuilder'
import QuoteNew from './components/QuoteNew'
import QuoteDetailPage from './components/QuoteDetailPage'
import JobsList from './components/JobsList'
import JobDetailPage from './components/JobDetailPage'
import ExceptionTracker from './components/ExceptionTracker'
import TaskManager from './components/TaskManager'
import PreAlertManager from './components/PreAlertManager'
import DocumentManager from './components/DocumentManager'
import AdminPanel from './components/AdminPanel'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
        <Route
          path="/"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/requests"
          element={user ? <RequestsList /> : <Navigate to="/login" />}
        />
        <Route
          path="/requests/new"
          element={user ? <RequestNew /> : <Navigate to="/login" />}
        />
        <Route
          path="/quotes"
          element={user ? <QuotesList /> : <Navigate to="/login" />}
        />
        <Route
          path="/quotes/new"
          element={user ? <QuoteNew /> : <Navigate to="/login" />}
        />
        <Route
          path="/quotes/:id"
          element={user ? <QuoteDetailPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/jobs"
          element={user ? <JobsList /> : <Navigate to="/login" />}
        />
        <Route
          path="/exceptions"
          element={user ? <ExceptionTracker /> : <Navigate to="/login" />}
        />
        <Route
          path="/jobs/:id"
          element={user ? <JobDetailPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/tasks"
          element={user ? <TaskManager /> : <Navigate to="/login" />}
        />
        <Route
          path="/alerts"
          element={user ? <PreAlertManager /> : <Navigate to="/login" />}
        />
        <Route
          path="/documents"
          element={user ? <DocumentManager /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={user ? <AdminPanel /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}
