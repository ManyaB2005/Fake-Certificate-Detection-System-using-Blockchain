import React, { useState, useEffect, useRef } from 'react';
import { getContract } from './contracts/contractInstance';
import { motion } from 'framer-motion';
import { Search, CheckCircle, XCircle, Activity, Camera, FileText, UploadCloud } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as pdfjsLib from 'pdfjs-dist';

// Securely load the PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const VerifierPortal = () => {
  const [activeTab, setActiveTab] = useState('manual'); 
  const [hash, setHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Reference to keep track of the active camera stream
  const scannerRef = useRef(null);

  // --- URL AUTO-VERIFICATION ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlHash = params.get('verify');
    if (urlHash) {
      setHash(urlHash);
      setTimeout(() => verify(urlHash), 500);
    }
  }, []);

  // --- DIRECT CAMERA STREAM LOGIC ---
  useEffect(() => {
    if (activeTab === 'scan') {
      const startCamera = async () => {
        try {
          // Initialize the core scanner
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;

          // Force the camera to start immediately (prefers back camera on mobile)
          await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              // On Success: Stop the camera to freeze the frame, then verify
              html5QrCode.stop().then(() => {
                let scannedHash = decodedText;
                if (decodedText.includes('?verify=')) {
                    scannedHash = new URLSearchParams(decodedText.split('?')[1]).get('verify');
                }
                setHash(scannedHash);
                verify(scannedHash);
              }).catch(err => console.error("Camera stop failed", err));
            },
            (error) => { /* Silently ignore scanning frames until a code is found */ }
          );
        } catch (err) {
          console.error("Camera initialization failed:", err);
          setResult({ status: 'error', message: 'Camera Access Denied. Please check browser permissions.' });
        }
      };

      // Add a tiny delay to ensure the #reader div is rendered in the DOM first
      setTimeout(startCamera, 100);
    }

    // Cleanup function: Turn off the camera if the user clicks a different tab
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error("Scanner cleanup failed", e));
      }
    };
  }, [activeTab]);

  // --- PDF UPLOAD & EXTRACT LOGIC ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }

      const hexRegex = /[0-9a-fA-F]{64}/;
      const match = fullText.match(hexRegex);

      if (match) {
        setHash(match[0]);
        verify(match[0]); 
      } else {
        setResult({ status: 'error', message: 'Extraction Failed: No valid cryptographic hash found in this PDF.' });
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setResult({ status: 'error', message: 'File Error: Could not read the PDF document.' });
      setLoading(false);
    }
  };

  // --- MASTER VERIFICATION LOGIC ---
  // --- MASTER VERIFICATION LOGIC ---
  const verify = async (targetHash) => {
    const hashToCheck = typeof targetHash === 'string' ? targetHash : hash;
    if (!hashToCheck) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const cleanHash = hashToCheck.replace(/^0x/, ''); 
      const hexRegex = /^[0-9a-fA-F]{64}$/;

      if (!hexRegex.test(cleanHash)) {
          // UPDATED: New aggressive security warning
          setResult({ status: 'error', message: 'Fault Detected: Invalid cryptographic hash format.' });
          setLoading(false);
          return;
      }

      const contract = await getContract();
      const formattedHash = `0x${cleanHash}`;
      const isOnBlockchain = await contract.isVerified(formattedHash);

      if (isOnBlockchain) {
        setResult({ status: 'verified', message: 'Authentic Document: Hash permanently verified on the Sepolia Network.' });
      } else {
        setResult({ status: 'error', message: 'Fraud Detected: This hash does not exist on the blockchain ledger.' });
      }
    } catch (err) {
      console.error(err);
      setResult({ status: 'error', message: 'System Error: Ensure MetaMask is connected and on Sepolia.' });
    }
    setLoading(false);
  };

  return (
    <div className="bento-grid">
      <motion.div className="glass-card" style={{ gridColumn: 'span 2' }}>
        <h2><Search color="#38bdf8" /> Omni-Verification Portal</h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Select your preferred verification method below.</p>

        {/* --- UI TAB NAVIGATION --- */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
            <button onClick={() => setActiveTab('manual')} className="btn-primary" style={{ background: activeTab === 'manual' ? '#38bdf8' : '#1e293b' }}>
                <FileText size={16} /> Manual
            </button>
            <button onClick={() => setActiveTab('scan')} className="btn-primary" style={{ background: activeTab === 'scan' ? '#38bdf8' : '#1e293b' }}>
                <Camera size={16} /> Scan QR
            </button>
            <button onClick={() => setActiveTab('upload')} className="btn-primary" style={{ background: activeTab === 'upload' ? '#38bdf8' : '#1e293b' }}>
                <UploadCloud size={16} /> Upload PDF
            </button>
        </div>

        {/* --- TAB CONTENT: MANUAL --- */}
        {activeTab === 'manual' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" value={hash} placeholder="Paste SHA-256 Hash here..." style={{ flex: 1 }} onChange={(e) => setHash(e.target.value.trim())} />
              <button onClick={verify} className="btn-primary" disabled={loading}>
                {loading ? 'Querying...' : 'Verify Hash'}
              </button>
            </div>
        )}

        {/* --- TAB CONTENT: SCANNER --- */}
        {activeTab === 'scan' && (
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                <p style={{ color: '#e2e8f0', marginBottom: '15px' }}>Align the QR code within the targeting frame</p>
                
                <div className="scanner-wrapper">
                    {/* The camera feed injects here */}
                    <div id="reader" style={{ width: '100%' }}></div>
                    
                    {/* Custom High-Tech Overlay */}
                    <div className="scanner-target">
                        <span></span>
                        <div className="laser-line"></div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB CONTENT: UPLOAD --- */}
        {activeTab === 'upload' && (
            <div style={{ border: '2px dashed #38bdf8', padding: '2rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer' }}>
                <UploadCloud size={40} color="#38bdf8" style={{ marginBottom: '10px' }} />
                <p>Drag & Drop the Official PDF Certificate here</p>
                <input type="file" accept="application/pdf" onChange={handleFileUpload} style={{ marginTop: '1rem', color: '#fff' }} />
            </div>
        )}

      </motion.div>

      <div className={`glass-card ${result ? 'active-result' : ''}`}>
        <h3><Activity size={20} /> Cryptographic Proof</h3>
        {!result && <p style={{ color: '#64748b' }}>Awaiting input...</p>}
        {result?.status === 'verified' && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <CheckCircle color="#10b981" size={48} />
            <p style={{ color: '#10b981', fontWeight: 'bold', marginTop: '10px' }}>{result.message}</p>
          </motion.div>
        )}
        {result?.status === 'error' && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <XCircle color="#ef4444" size={48} />
            <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '10px' }}>{result.message}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VerifierPortal;