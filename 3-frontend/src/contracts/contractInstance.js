import { ethers } from "ethers";

// USE YOUR DEPLOYED ADDRESS FROM PHASE 1
const CONTRACT_ADDRESS = "0xc9F715D0F34Bb5D9EC6674Be33a567F75643f058";

const ABI = [
  "function addCertificate(bytes32 _certHash) public",
  "function isVerified(bytes32 _certHash) public view returns (bool)"
];

export const getContract = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
};