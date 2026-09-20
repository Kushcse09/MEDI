const hre = require("hardhat");

async function main() {
  const Contract = await hre.ethers.getContractFactory("MediChainAccessControl");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("MediChainAccessControl deployed to:", address);
  console.log("Add this to your server/.env as CONTRACT_ADDRESS=" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
