import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} />
          
          {/* The main entry point checks auth and redirects to /login if needed */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Catch-all route to redirect invalid URLs back to the root check */}
          <Route path="*" element={<Navigate to="/" replace />} /> 
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
