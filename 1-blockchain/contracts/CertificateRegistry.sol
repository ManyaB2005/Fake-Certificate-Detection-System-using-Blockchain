// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CertificateRegistry {
    // Defines the Institute structure for the consortium
    struct Institute {
        bool isTrusted;
        uint256 voteCount;
    }

    // Tracks all trusted and candidate universities [cite: 298]
    mapping(address => Institute) public institutes;
    
    // Prevents double-voting: maps candidate -> existing validator -> hasVoted
    mapping(address => mapping(address => bool)) public hasVoted;
    
    // Tracks the total number of trusted nodes to calculate the 100% threshold
    uint256 public totalValidators;
    
    // Stores only the fixed-size 32-byte cryptographic hashes to minimize gas [cite: 302]
    mapping(bytes32 => bool) public certificateHashes;

    event InstituteAdded(address indexed institute);
    event CertificateAnchored(bytes32 indexed certHash);

    // Firewall modifier: Only consortium-approved addresses can execute [cite: 304, 310]
    modifier onlyTrusted() {
        require(institutes[msg.sender].isTrusted, "Access Denied: Not a trusted institute");
        _;
    }

    constructor() {
        // The deployer is automatically granted the first trusted validator status
        institutes[msg.sender].isTrusted = true;
        totalValidators = 1;
        emit InstituteAdded(msg.sender);
    }

    // Existing validators vote for a new candidate [cite: 299]
    function voteForInstitute(address candidate) public onlyTrusted {
        require(!institutes[candidate].isTrusted, "Candidate is already trusted");
        require(!hasVoted[candidate][msg.sender], "You have already voted for this candidate");

        hasVoted[candidate][msg.sender] = true;
        institutes[candidate].voteCount += 1;

        // 100% consensus threshold required to grant issuing rights [cite: 204, 300]
        if (institutes[candidate].voteCount == totalValidators) {
            institutes[candidate].isTrusted = true;
            totalValidators += 1;
            emit InstituteAdded(candidate);
        }
    }

    // Appends the SHA-256 document hash to the ledger [cite: 302]
    function addCertificate(bytes32 _certHash) public onlyTrusted {
        require(!certificateHashes[_certHash], "Certificate hash already exists");
        
        certificateHashes[_certHash] = true;
        emit CertificateAnchored(_certHash);
    }

    // Public read-only function to verify if a hash exists on-chain
    function isVerified(bytes32 _certHash) public view returns (bool) {
        return certificateHashes[_certHash];
    }
}