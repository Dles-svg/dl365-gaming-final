import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Streaming from './pages/Streaming';
import Wallet from './pages/Wallet';
import Marketplace from './pages/Marketplace';
import Downloads from './pages/Downloads';
import Admin from './pages/Admin';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="/streaming" element={<Streaming />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/compute" element={<Marketplace />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
