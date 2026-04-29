const express = require('express');
const cors = require('cors');
const fs = require('fs'); // Added the File System module to read your key securely
require('dotenv').config();

const CryptoEngine = require('./utils/cryptoEngine');
const bloomFilter = require('./utils/bloomFilter');

const app = express();
app.use(cors());
app.use(express.json());

// ROUTE 1: Issue Certificate (Secure Enterprise Architecture)
app.post('/api/issue', (req, res) => {
    try {
        // Notice we only accept studentData from the frontend now
        const { studentData } = req.body;

        console.log("--- New Issuance Request ---");
        console.log("Student:", studentData.name);

        // Securely load the Private Key from the backend server
        let privateKey;
        try {
            privateKey = fs.readFileSync('./private.pem', 'utf8');
        } catch (err) {
            console.error("CRITICAL ERROR: private.pem file is missing!");
            return res.status(500).json({ 
                success: false, 
                error: "Server configuration error: private.pem not found." 
            });
        }

        // 1. Generate SHA-256 Hash
        const hash = CryptoEngine.hashData(studentData);

        // 2. Sign with RSA Private Key
        const signature = CryptoEngine.signHash(hash, privateKey);

        // 3. Update Bloom Filter (Optimization)
        bloomFilter.add(hash);

        console.log(`[SUCCESS] Hash generated: ${hash}`);
        
        res.json({ success: true, hash, signature });
    } catch (error) {
        console.error("BACKEND CRASH:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ROUTE 2: Verify Certificate (Phase 1 Bloom Filter Check)
app.post('/api/verify', (req, res) => {
    try {
        const { hash, publicKey, signature } = req.body;
        
        if (!bloomFilter.check(hash)) {
            return res.status(404).json({ success: false, message: "Bloom Filter Rejection: Fake Hash." });
        }
        
        const isLegit = CryptoEngine.verifySignature(hash, signature, publicKey);
        res.json({ success: isLegit, message: isLegit ? "Verified!" : "Signature Mismatch!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CredenChain Backend Engine running on port ${PORT}`));