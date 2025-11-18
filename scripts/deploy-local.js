const { ethers } = require("hardhat");

/**
 * Local deployment script with test data
 * Use: npx hardhat run scripts/deploy-local.js --network localhost
 */
async function main() {
  console.log("Deploying to local network with test data...\n");

  const [deployer, governance, minter, decayExecutor, founder1, founder2, contributor1, contributor2, contributor3, project1, project2] =
    await ethers.getSigners();

  // Deploy all contracts
  const Constitution = await ethers.getContractFactory("Constitution");
  const constitution = await Constitution.deploy();
  await constitution.waitForDeployment();
  console.log(`Constitution: ${await constitution.getAddress()}`);

  const IMPACTToken = await ethers.getContractFactory("IMPACTToken");
  const impactToken = await IMPACTToken.deploy(await constitution.getAddress());
  await impactToken.waitForDeployment();
  console.log(`IMPACTToken: ${await impactToken.getAddress()}`);

  const TreasuryManagement = await ethers.getContractFactory("TreasuryManagement");
  const treasury = await TreasuryManagement.deploy(
    await constitution.getAddress(),
    await impactToken.getAddress(),
    governance.address,
    ethers.parseEther("10000000") // $10M
  );
  await treasury.waitForDeployment();
  console.log(`TreasuryManagement: ${await treasury.getAddress()}`);

  const QuadraticFunding = await ethers.getContractFactory("QuadraticFunding");
  const quadraticFunding = await QuadraticFunding.deploy(
    await constitution.getAddress(),
    await impactToken.getAddress(),
    governance.address
  );
  await quadraticFunding.waitForDeployment();
  console.log(`QuadraticFunding: ${await quadraticFunding.getAddress()}`);

  const ConflictRegistry = await ethers.getContractFactory("ConflictRegistry");
  const conflictRegistry = await ConflictRegistry.deploy(await constitution.getAddress());
  await conflictRegistry.waitForDeployment();
  console.log(`ConflictRegistry: ${await conflictRegistry.getAddress()}`);

  // Setup roles
  await impactToken.setMinter(minter.address);
  await impactToken.setDecayExecutor(decayExecutor.address);
  await conflictRegistry.setCitizensHouse(governance.address);

  console.log("\nSetting up test data...\n");

  // Mint initial IMPACT to founders (15% allocation = 150k each at 10% total)
  await impactToken.connect(minter).mint(founder1.address, 0, ethers.parseEther("75000"), "Founder 1");
  await impactToken.connect(minter).setFounderStatus(founder1.address, true);
  console.log(`Founder 1 (${founder1.address}): 75,000 IMPACT (with 2x = 150k)`);

  await impactToken.connect(minter).mint(founder2.address, 0, ethers.parseEther("75000"), "Founder 2");
  await impactToken.connect(minter).setFounderStatus(founder2.address, true);
  console.log(`Founder 2 (${founder2.address}): 75,000 IMPACT (with 2x = 150k)`);

  // Mint IMPACT to contributors
  await impactToken.connect(minter).mint(contributor1.address, 0, ethers.parseEther("50000"), "Builder");
  await impactToken.connect(minter).mint(contributor1.address, 1, ethers.parseEther("10000"), "Curator");
  console.log(`Contributor 1 (${contributor1.address}): 60,000 IMPACT`);

  await impactToken.connect(minter).mint(contributor2.address, 0, ethers.parseEther("30000"), "Builder");
  console.log(`Contributor 2 (${contributor2.address}): 30,000 IMPACT`);

  await impactToken.connect(minter).mint(contributor3.address, 2, ethers.parseEther("20000"), "Community");
  console.log(`Contributor 3 (${contributor3.address}): 20,000 IMPACT`);

  // Fund endowment
  await treasury.connect(governance).fundEndowment(ethers.parseEther("2000000"));
  console.log("\nFunded endowment: $2M");

  // Create QF round
  await quadraticFunding.connect(governance).createRound(ethers.parseEther("500000"), 30);
  await quadraticFunding.connect(governance).addProject(1, project1.address, "Public Good Alpha", "Infrastructure for Ethereum");
  await quadraticFunding.connect(governance).addProject(1, project2.address, "Open Source Beta", "Developer tooling");
  console.log("Created QF Round 1 with $500k matching pool");
  console.log(`  Project 1: ${project1.address}`);
  console.log(`  Project 2: ${project2.address}`);

  console.log("\n" + "=".repeat(60));
  console.log("LOCAL DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nTest accounts:");
  console.log(`  Deployer:     ${deployer.address}`);
  console.log(`  Governance:   ${governance.address}`);
  console.log(`  Minter:       ${minter.address}`);
  console.log(`  DecayExec:    ${decayExecutor.address}`);
  console.log(`  Founder 1:    ${founder1.address}`);
  console.log(`  Founder 2:    ${founder2.address}`);
  console.log(`  Contributor 1: ${contributor1.address}`);
  console.log(`  Contributor 2: ${contributor2.address}`);
  console.log(`  Contributor 3: ${contributor3.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
