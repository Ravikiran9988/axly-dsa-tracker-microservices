import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import apiClient from './api';
import './App.css'; // Optional: Use a stylish default

const Home = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');

  useEffect(() => {
    apiClient.get('/health')
      .then(res => setHealthStatus(`Gateway Health: ${res.data.status}`))
      .catch(() => setHealthStatus('Gateway is unreachable'));
  }, []);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Axly DSA Tracker</h1>
      <p>Microservices Foundation - Phase 1</p>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        border: '1px solid #ccc',
        borderRadius: '8px',
        display: 'inline-block'
      }}>
        <strong>{healthStatus}</strong>
      </div>
    </div>
  );
};

const NotFound = () => <div style={{ textAlign: 'center', marginTop: '3rem' }}><h2>404 - Not Found</h2></div>;

function App() {
  return (
    <Router>
      <nav style={{ padding: '1rem', background: '#282c34', color: 'white', display: 'flex', gap: '1rem' }}>
        <Link to="/" style={{ color: '#61dafb', textDecoration: 'none' }}>Home</Link>
        <Link to="/about" style={{ color: '#61dafb', textDecoration: 'none' }}>About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
