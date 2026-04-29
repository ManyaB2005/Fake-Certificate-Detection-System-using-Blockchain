import React, { useState, useRef } from 'react';
import axios from 'axios';
import { getContract } from './contracts/contractInstance';
import { motion } from 'framer-motion';
import { Shield, Database, Send, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

const IssuerDashboard = () => {
  const [data, setData] = useState({ name: '', course: '' });
  const [status, setStatus] = useState('Idle');
  const [issuedCert, setIssuedCert] = useState(null); 
  
  const certificateRef = useRef(null);

  const issueCertificate = async () => {
    if (!data.name || !data.course) {
        setStatus("Error: Please enter the Student Name and Course.");
        return;
    }

    try {
      setStatus('Hashing securely on backend...');
      setIssuedCert(null);
      
      // 1. Capture the exact timestamp of issuance
      const issueDate = new Date().toLocaleDateString();
      
      // 2. Bind the date to the student data to create a Time-Stamped Payload
      const securePayload = {
          name: data.name,
          course: data.course,
          issueDate: issueDate
      };
      
      // 3. Send the enhanced payload to the backend to be hashed
      const res = await axios.post('http://localhost:5000/api/issue', { 
        studentData: securePayload 
      });
      
      setStatus('Awaiting MetaMask Approval...');
      const contract = await getContract();
      const tx = await contract.addCertificate(`0x${res.data.hash}`);
      
      setStatus('Transaction Pending on Sepolia...');
      await tx.wait();
      
      setStatus(`Success! Certificate securely anchored.`);
      
      // 4. Render the UI using the exact same data that was hashed
      setIssuedCert({
          ...securePayload,
          hash: res.data.hash,
          verifyUrl: `http://localhost:3000/?verify=${res.data.hash}` 
      });

    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setStatus('Error: ' + errorMsg);
    }
  };

  const downloadPDF = () => {
    const input = certificateRef.current;
    
    html2canvas(input, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // 1. Add the visual picture of the certificate
      pdf.addImage(imgData, 'PNG', 10, 20, pdfWidth - 20, pdfHeight - 40);

      // 2. THE FIX: Inject the raw hash as invisible text for the Verifier to read
      pdf.setTextColor(255, 255, 255); // White text (invisible on white background)
      pdf.setFontSize(1); // Smallest possible font
      pdf.text(issuedCert.hash, 5, 5); // Hide it in the top left corner margin
      
      pdf.save(`${issuedCert.name}_CredenChain_Certificate.pdf`);
    });
  };

  return (
    <div>
      <div className="bento-grid">
        <motion.div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <h2><Shield color="#38bdf8" /> CredenChain Issuance Portal</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Student Full Name" onChange={e => setData({...data, name: e.target.value})} />
              <input type="text" placeholder="Course of Completion" onChange={e => setData({...data, course: e.target.value})} />
              
              <button onClick={issueCertificate} className="btn-primary" style={{ marginTop: '10px' }}>
                  <Send size={18} /> Generate & Anchor Certificate
              </button>
          </div>
        </motion.div>
        
        <div className="glass-card">
          <h3><Database /> System Status</h3>
          <p style={{ 
              color: status.includes('Error') ? '#ef4444' : '#38bdf8',
              fontFamily: 'monospace',
              wordBreak: 'break-all'
          }}>
              {status}
          </p>
        </div>
      </div>

      {issuedCert && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="certificate-wrapper"
            style={{ flexDirection: 'column', alignItems: 'center' }}
          >
              <div className="certificate-board" ref={certificateRef}>
                  <div className="cert-header">Certificate of Completion</div>
                  <div className="cert-sub">This is to officially certify that</div>
                  
                  <div className="cert-name">{issuedCert.name}</div>
                  
                  <div className="cert-sub">has successfully fulfilled the requirements for</div>
                  <div className="cert-course">{issuedCert.course}</div>
                  
                  <div className="cert-footer">
                      <div className="cert-hash-box">
                          <strong>Blockchain Anchor Hash:</strong><br/>
                          {issuedCert.hash}
                      </div>
                      
                      {/* Dynamic QR Code Generation */}
                      <div className="cert-qr-container">
                          <QRCodeSVG value={issuedCert.verifyUrl} size={80} level="H" />
                          <span>Scan to Verify</span>
                      </div>

                      <div className="cert-seal">
                          VALID<br/>{issuedCert.issueDate}
                      </div>
                  </div>
              </div>

              <button 
                onClick={downloadPDF} 
                className="btn-primary" 
                style={{ marginTop: '20px', width: 'auto', background: '#10b981', borderColor: '#10b981' }}
              >
                  <Download size={18} /> Download Official PDF
              </button>
          </motion.div>
      )}
    </div>
  );
};

export default IssuerDashboard;