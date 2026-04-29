class BloomFilter {
    constructor() {
        // Initializes a 1 Megabyte memory space as specified in the report
        this.bufferSize = 1048576; // 1MB in bytes
        this.bitArray = Buffer.alloc(this.bufferSize); 
        
        // 1MB = exactly 8,388,608 bits
        this.totalBits = this.bufferSize * 8; 
    }

    // Mathematical mapping: FN = (CH) mod (TI)
    _getIndex(hashHex) {
        // Parses the first 12 characters of the SHA-256 hex into an integer
        const hashInt = parseInt(hashHex.substring(0, 12), 16);
        
        // Modulo operator against the total bit count (8,388,608)
        const bitIndex = hashInt % this.totalBits;
        
        // Calculate exact byte position and bit offset within that byte
        const byteIndex = Math.floor(bitIndex / 8);
        const bitOffset = bitIndex % 8;
        
        return { byteIndex, bitOffset };
    }

    // Flips the calculated bit from 0 to 1 upon certificate issuance
    add(hashHex) {
        const { byteIndex, bitOffset } = this._getIndex(hashHex);
        // Bitwise OR operation to turn the specific bit "ON"
        this.bitArray[byteIndex] |= (1 << bitOffset);
    }

    // Instantly checks if a hash exists without querying the blockchain
    check(hashHex) {
        const { byteIndex, bitOffset } = this._getIndex(hashHex);
        // Bitwise AND operation
        // If this evaluates to false (0), the system achieves a True Negative
        return (this.bitArray[byteIndex] & (1 << bitOffset)) !== 0;
    }
}

// We export a single instance so the whole backend shares the exact same memory buffer
module.exports = new BloomFilter();