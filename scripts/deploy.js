const { ethers, network } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("Public Goods DAO - Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("");

  // Configuration
  const config = {
    initialTreasury: process.env.INITIAL_TREASURY || ethers.parseEther("10000000"), // $10M
    governanceMultisig: process.env.GOVERNANCE_MULTISIG || deployer.address,
    minterAddress: deployer.address, // Initially deployer, transfer to ReputationRegistry later
    decayExecutorAddress: deployer.address, // Initially deployer, transfer to automation later
  };

  console.log("Configuration:");
  console.log(`  Initial Treasury: $${ethers.formatEther(config.initialTreasury)}`);
  console.log(`  Governance Multisig: ${config.governanceMultisig}`);
  console.log("");

  // Deploy contracts
  const deployedContracts = {};

  // 1. Deploy Constitution
  console.log("Deploying Constitution...");
  const Constitution = await ethers.getContractFactory("Constitution");
  const constitution = await Constitution.deploy();
  await constitution.waitForDeployment();
  deployedContracts.constitution = await constitution.getAddress();
  console.log(`  Constitution deployed: ${deployedContracts.constitution}`);

  // 2. Deploy IMPACTToken
  console.log("Deploying IMPACTToken...");
  const IMPACTToken = await ethers.getContractFactory("IMPACTToken");
  const impactToken = await IMPACTToken.deploy(deployedContracts.constitution);
  await impactToken.waitForDeployment();
  deployedContracts.impactToken = await impactToken.getAddress();
  console.log(`  IMPACTToken deployed: ${deployedContracts.impactToken}`);

  // 3. Deploy TreasuryManagement
  console.log("Deploying TreasuryManagement...");
  const TreasuryManagement = await ethers.getContractFactory("TreasuryManagement");
  const treasury = await TreasuryManagement.deploy(
    deployedContracts.constitution,
    deployedContracts.impactToken,
    config.governanceMultisig,
    config.initialTreasury
  );
  await treasury.waitForDeployment();
  deployedContracts.treasury = await treasury.getAddress();
  console.log(`  TreasuryManagement deployed: ${deployedContracts.treasury}`);

  // 4. Deploy QuadraticFunding
  console.log("Deploying QuadraticFunding...");
  const QuadraticFunding = await ethers.getContractFactory("QuadraticFunding");
  const quadraticFunding = await QuadraticFunding.deploy(
    deployedContracts.constitution,
    deployedContracts.impactToken,
    config.governanceMultisig
  );
  await quadraticFunding.waitForDeployment();
  deployedContracts.quadraticFunding = await quadraticFunding.getAddress();
  console.log(`  QuadraticFunding deployed: ${deployedContracts.quadraticFunding}`);

  // 5. Deploy ConflictRegistry
  console.log("Deploying ConflictRegistry...");
  const ConflictRegistry = await ethers.getContractFactory("ConflictRegistry");
  const conflictRegistry = await ConflictRegistry.deploy(deployedContracts.constitution);
  await conflictRegistry.waitForDeployment();
  deployedContracts.conflictRegistry = await conflictRegistry.getAddress();
  console.log(`  ConflictRegistry deployed: ${deployedContracts.conflictRegistry}`);

  console.log("");
  console.log("Setting up roles...");

  // Set up IMPACTToken roles
  console.log("  Setting IMPACTToken minter...");
  await impactToken.setMinter(config.minterAddress);

  console.log("  Setting IMPACTToken decay executor...");
  await impactToken.setDecayExecutor(config.decayExecutorAddress);

  // Set up ConflictRegistry citizens house
  console.log("  Setting ConflictRegistry citizens house...");
  await conflictRegistry.setCitizensHouse(config.governanceMultisig);

  console.log("");
  console.log("=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("Deployed Contracts:");
  console.log(JSON.stringify(deployedContracts, null, 2));
  console.log("");

  // Verification info
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("=".repeat(60));
    console.log("CONTRACT VERIFICATION");
    console.log("=".repeat(60));
    console.log("");
    console.log("Run the following commands to verify contracts:");
    console.log("");
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.constitution}`);
    console.log("");
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.impactToken} ${deployedContracts.constitution}`);
    console.log("");
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.treasury} ${deployedContracts.constitution} ${deployedContracts.impactToken} ${config.governanceMultisig} ${config.initialTreasury}`);
    console.log("");
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.quadraticFunding} ${deployedContracts.constitution} ${deployedContracts.impactToken} ${config.governanceMultisig}`);
    console.log("");
    console.log(`npx hardhat verify --network ${network.name} ${deployedContracts.conflictRegistry} ${deployedContracts.constitution}`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts,
    config: {
      initialTreasury: config.initialTreasury.toString(),
      governanceMultisig: config.governanceMultisig,
      minterAddress: config.minterAddress,
      decayExecutorAddress: config.decayExecutorAddress,
    },
  };

  console.log("");
  console.log("Deployment Info (save this for records):");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
