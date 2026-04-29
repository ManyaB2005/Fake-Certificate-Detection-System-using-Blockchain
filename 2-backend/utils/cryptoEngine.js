const crypto = require('crypto');

class CryptoEngine {
    // 1. Key Pair Generation (RSA-2048)
    static generateKeys() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { publicKey, privateKey };
    }

    // 2. Deterministic Hashing (SHA-256)
    static hashData(studentData) {
        // Serializes the raw student JSON data into a deterministic string
        const dataString = JSON.stringify(studentData);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    // 3. Digital Signatures 
    static signHash(hash, privateKey) {
        // Format sanitization to prevent ERR_OSSL_UNSUPPORTED HTTP transfer errors
        const sanitizedKey = privateKey.replace(/\\n/g, '\n').trim();
        
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(hash);
        return signer.sign(sanitizedKey, 'hex'); // Returns the encrypted hash
    }

    // 4. Signature Verification
    static verifySignature(hash, signature, publicKey) {
        const sanitizedKey = publicKey.replace(/\\n/g, '\n').trim();
        
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(hash);
        return verifier.verify(sanitizedKey, signature, 'hex'); // Returns boolean true/false
    }
}

module.exports = CryptoEngine;