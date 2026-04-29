import React, { useState } from 'react';
import './App.css';
import IssuerDashboard from './IssuerDashboard';
import VerifierPortal from './VerifierPortal';

function App() {
  const [view, setView] = useState('issuer'); // Toggle between 'issuer' and 'verifier'

  return (
    <div className="App">
      <nav className="navbar">
        <h2 className="logo">V-CERT / <span style={{color: '#fff'}}>CSE</span></h2>
        <div className="nav-links">
          <button 
            className={view === 'issuer' ? 'nav-btn active' : 'nav-btn'} 
            onClick={() => setView('issuer')}
          >
            Issuer Portal
          </button>
          <button 
            className={view === 'verifier' ? 'nav-btn active' : 'nav-btn'} 
            onClick={() => setView('verifier')}
          >
            Public Verifier
          </button>
        </div>
      </nav>

      {view === 'issuer' ? <IssuerDashboard /> : <VerifierPortal />}
    </div>
  );
}

export default App;