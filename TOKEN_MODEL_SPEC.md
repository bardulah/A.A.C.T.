# Public Goods Funding DAO: Non-Extractive Tokenomics Model
## Version 1.0 - Specification

---

## 1. DESIGN PHILOSOPHY & ETHOS

### Core Principles
1. **Impact = Rewards**: Funding allocation based on measurable contribution to public goods
2. **Anti-Plutocracy**: Governance power derives from contribution, not capital
3. **Non-Extractive**: All value flows recycle to public goods and contributors
4. **Sybil & Collusion Resistant**: Multi-dimensional reputation with decay mechanisms
5. **Sustainable**: Self-funding through platform fees, not token speculation

### Forbidden Mechanisms
- ❌ Proof-of-Stake voting (wealth-based governance)
- ❌ Token sales or ICOs for governance rights
- ❌ Profit extraction to private shareholders
- ❌ Tradeable governance tokens without restrictions
- ❌ Single-dimensional voting power

---

## 2. DUAL-TOKEN ARCHITECTURE

### 2.1 IMPACT Token (Non-Transferable Governance)

**Purpose**: Represents cumulative contribution to the ecosystem; grants governance rights

**Key Characteristics**:
- **Non-Transferable**: Cannot be sold, traded, or transferred (soulbound)
- **Earned, Not Bought**: Distributed only through verified contributions
- **Decay Mechanism**: Reputation decays over time to prevent historical power concentration
- **Multi-Dimensional**: Tracks different contribution types

**Supply Dynamics**:
- No fixed max supply
- Minted based on verified contributions
- Decays at 5% per quarter (19.4% annually) to incentivize ongoing participation

**Earning Mechanisms**:

| Contribution Type | IMPACT Earned | Verification Method |
|-------------------|---------------|---------------------|
| **Code Contributions** | 10-1000 per merged PR | GitHub verification + peer review score |
| **Grant Curation** | 5-50 per reviewed project | Community consensus on quality |
| **Community Building** | 1-20 per event/content | Attendance/engagement metrics |
| **Retroactive Impact** | 100-10,000 per round | Quadratic voting by Citizens' House |
| **Governance Participation** | 2 per vote cast | On-chain voting record |

**Reputation Dimensions**:
```
Total_Voting_Power = sqrt(
    Builder_Rep^2 +
    Curator_Rep^2 +
    Community_Rep^2
) * Time_Decay_Factor
```

Where:
- `Builder_Rep` = IMPACT from code/product contributions
- `Curator_Rep` = IMPACT from grant review & allocation work
- `Community_Rep` = IMPACT from education, events, content
- `Time_Decay_Factor` = 0.95^(quarters_since_contribution)

### 2.2 PGF Token (Funding Distribution)

**Purpose**: Represents allocation units for distributing treasury funds to projects

**Key Characteristics**:
- **Not a Cryptocurrency**: Internal accounting unit, not tradeable
- **Burned on Use**: PGF tokens are burned when allocated to projects
- **Quarterly Mint**: New PGF tokens minted each quarter based on treasury growth

**Supply Dynamics**:
```
Quarterly_PGF_Mint = (Treasury_Fees_Collected * 0.9) / Average_Grant_Size
```

**Distribution Process**:
1. **Prospective Rounds** (60% of PGF): Projects apply → quadratic voting by IMPACT holders → allocation
2. **Retroactive Rounds** (30% of PGF): Anyone can nominate past contributors → Citizens' House votes
3. **Emergency Reserve** (10% of PGF): Multi-sig controlled for critical infrastructure

---

## 3. GOVERNANCE STRUCTURE

### 3.1 Two-House System

#### A. Token House (IMPACT Holders)
**Responsibilities**:
- Vote on prospective grant allocations (quadratic)
- Propose and vote on protocol parameter changes
- Elect Citizens' House members

**Voting Power**:
```
Voting_Power = sqrt(Total_IMPACT_Balance) * (1 + 0.1 * Consecutive_Participation_Quarters)
```

**Quadratic Cost**:
```
Token_Cost_for_N_Votes = N^2
```
Example: 1 vote costs 1 IMPACT, 10 votes cost 100 IMPACT, 100 votes cost 10,000 IMPACT

#### B. Citizens' House (Elected Experts)
**Composition**: 50-100 elected members serving 6-month terms

**Selection**:
- Nominated by Token House members (requires 1000 IMPACT to nominate)
- Elected via ranked-choice voting weighted by IMPACT
- Must represent diverse contribution categories (min 30% builders, 30% curators, 20% community)

**Responsibilities**:
- Retroactive funding allocation (Impact = Rewards)
- Veto power on protocol changes that violate non-extractive ethos
- Treasury safety oversight

### 3.2 Governance Parameters (On-Chain, Voteable)

| Parameter | Initial Value | Update Threshold |
|-----------|---------------|------------------|
| IMPACT decay rate | 5% per quarter | 67% Token House approval |
| Citizens' House size | 50 members | Simple majority |
| Min IMPACT to propose | 10,000 | 67% approval |
| Quorum requirement | 10% of active IMPACT | 67% approval |
| Prospective/Retro split | 60%/30% | Simple majority |

---

## 4. TREASURY & FEE STRUCTURE

### 4.1 Revenue Sources (Non-Extractive)

1. **Platform Fees (Primary)**:
   - 2% fee on all grants distributed through the platform
   - Example: $100k grant → $2k to treasury, $98k to project
   - Justification: Covers infrastructure, curation, verification costs

2. **L2 Sequencer Revenue** (if applicable):
   - If DAO operates an L2, sequencer profits → treasury
   - 100% of MEV and transaction fees redirected to public goods

3. **Protocol-Owned Liquidity** (optional):
   - Treasury can provide liquidity to DeFi protocols
   - Yield → public goods funding
   - Never more than 20% of treasury in yield-bearing assets (risk management)

### 4.2 Treasury Allocation Formula

```
Total_Treasury = Fee_Revenue + Yield_Revenue + Donations

Allocation:
├─ 90% → PGF Token Mint (distributed to projects)
├─ 7% → Operations (salaries, infrastructure, audits)
└─ 3% → Emergency Reserve (multi-sig, 6-month runway minimum)
```

**Anti-Extractive Guarantee**:
- No dividends or buybacks for token holders
- No profit distribution to team/investors
- 100% of net revenue → public goods funding or operational sustainability

### 4.3 Transparency Mechanisms

- **Real-Time Dashboard**: All treasury movements visible on-chain
- **Quarterly Reports**: Breakdown of fee collection, grant distribution, operational costs
- **Accountability**: Multi-sig wallets with elected Citizens' House members as signers

---

## 5. ANTI-EXTRACTIVE SAFEGUARDS

### 5.1 Sybil Resistance

**Multi-Layer Verification**:
1. **BrightID** or **Proof of Humanity** for basic identity
2. **GitHub contribution history** for builder reputation
3. **On-chain voting history** for governance participation
4. **Peer attestations** (3+ existing members with 500+ IMPACT must vouch)

**Cost of Sybil Attack**:
- To gain 10% voting power via Sybils:
  - Requires creating 100+ fake identities (BrightID cost + time)
  - Each must earn 1000+ IMPACT through verified contributions (~6 months minimum)
  - Quadratic voting means diminishing returns even if successful
  - **Estimated cost**: >$500k in labor/time vs. negligible direct influence

### 5.2 Collusion Resistance

**Mechanisms**:
1. **Quadratic Voting**: Makes vote-buying economically irrational (N² cost for N votes)
2. **Retroactive Funding**: Can't collude on future impact (already happened)
3. **Multi-Dimensional Reputation**: Must collude across builder, curator, community categories
4. **Pairwise Coordination Subsidy** (advanced): Penalizes voting patterns that suggest collusion

```python
# Pairwise coordination detection
def detect_collusion(voter_patterns):
    """
    If voters A and B vote identically across >80% of proposals,
    their voting power is reduced by 20% for those proposals.
    """
    for pair in all_voter_pairs:
        similarity = calculate_vote_similarity(pair)
        if similarity > 0.8:
            apply_penalty(pair, reduction=0.2)
```

### 5.3 Whale Prevention

**Quadratic Mechanisms at Every Layer**:
- Voting costs N² IMPACT for N votes
- Grant matching uses quadratic funding formula
- Even a holder with 1M IMPACT cannot dominate (√1M = 1000 votes, same as 10 people with 10k each)

**Reputation Caps per Category**:
- Max 40% of total voting power from any single reputation dimension
- Forces diversification of contributions

**Time-Based Limits**:
- Max 25% of total IMPACT can be earned in a single quarter by one entity
- Prevents sudden influence spikes from large coordinated contributions

### 5.4 Governance Attack Resistance

**Vote Delegation Restrictions**:
- Can only delegate to 1 person per category (builder/curator/community)
- Delegates cannot re-delegate (no delegation chains)
- Delegators retain veto power over their delegate's votes

**Emergency Pause Mechanism**:
- Citizens' House can pause grant distributions with 67% vote if:
  - Sybil attack detected
  - Smart contract vulnerability found
  - Governance manipulation suspected
- Requires transparency report within 48 hours
- Max pause duration: 14 days

---

## 6. DISTRIBUTION MECHANICS

### 6.1 Prospective Grant Rounds (Quarterly)

**Process**:
1. **Application Phase** (2 weeks): Projects submit proposals with milestones
2. **Review Phase** (1 week): Curators with high Curator_Rep provide impact forecasts
3. **Voting Phase** (1 week): Token House votes using quadratic funding
4. **Allocation**: Matching pool distributed via QF formula

**Quadratic Funding Formula**:
```
For project P with contributions c₁, c₂, ..., cₙ:

Matching_Amount(P) = ( Σ √cᵢ )² - Σ cᵢ

Total_Funding(P) = Direct_Contributions + Matching_Amount(P)
```

**Example**:
- Project A: 100 contributors × $10 each = $1,000 direct
  - Matching: (100 × √10)² - 1,000 = (316.2)² - 1,000 = $99,000
  - **Total: $100,000**

- Project B: 1 contributor × $1,000 = $1,000 direct
  - Matching: (1 × √1000)² - 1,000 = (31.6)² - 1,000 = $0
  - **Total: $1,000**

### 6.2 Retroactive Funding (Bi-Annual)

**Process**:
1. **Nomination** (open to anyone): Submit evidence of past public good impact
2. **Citizens' House Vote**: Elected members allocate PGF tokens to nominees
3. **Distribution**: Top projects receive proportional funding

**Impact Measurement Framework**:
- **Open Source Software**: GitHub stars, forks, dependent repositories, security audits funded
- **Education**: Students reached, course completion rates, derivative educational content
- **Infrastructure**: Uptime, transactions processed, ecosystems supported
- **Research**: Citations, protocol implementations, standard adoptions

**Example Allocation** (30M PGF tokens, bi-annual):
```
Project            Impact Score    PGF Allocation    USD Value
-------------------------------------------------------------
Ethereum Client         9.5         8,000,000        $800,000
Security Toolkit        8.2         5,500,000        $550,000
Dev Bootcamp           7.8         4,200,000        $420,000
Documentation Hub      6.9         3,000,000        $300,000
(remaining projects)    ...             ...              ...
```

### 6.3 Continuous Contribution Rewards

**On-Chain Automatic Distribution** (for ongoing work):
- **GitHub Integrations**: Merged PRs trigger IMPACT mints based on:
  - Lines of code (normalized for language)
  - Review approval count
  - Issue complexity tags

- **Curation Work**: Each grant review earns base IMPACT + quality bonus
  - Quality determined by agreement with final funding outcome

- **Governance Participation**: Automatic 2 IMPACT per vote cast (encourages engagement)

---

## 7. LAUNCH & INITIAL DISTRIBUTION

### 7.1 Genesis IMPACT Distribution (Bootstrap)

**Total Genesis Supply**: 10,000,000 IMPACT (subject to decay)

| Allocation Category | % | Amount | Vesting |
|---------------------|---|--------|---------|
| Founding Contributors | 30% | 3,000,000 | 2-year linear unlock |
| Early Ecosystem Grants | 25% | 2,500,000 | Distributed in Year 1 via proposals |
| Retroactive Airdrop | 20% | 2,000,000 | One-time to verified OSS contributors |
| Citizens' House Initial | 15% | 1,500,000 | Distributed to first 50 elected citizens |
| Treasury Reserve | 10% | 1,000,000 | For emergency governance proposals |

**Anti-Concentration Rules**:
- No single entity receives >2% of genesis supply (200k IMPACT)
- Founding contributors must have verifiable history of public goods work
- Retroactive airdrop uses on-chain proof of OSS contribution (GitHub commits, past grants received)

### 7.2 Initial Treasury Funding

**Target**: $5,000,000 equivalent in stablecoins + ETH

**Sources**:
1. **Grants from aligned foundations** (70%): Protocol Guild, Ethereum Foundation, Gitcoin, etc.
2. **Donations from individuals** (20%): No IMPACT awarded, purely altruistic
3. **Protocol-owned liquidity** (10%): DAO deploys capital to low-risk yield strategies

**Use of Initial Funding**:
- 80% → First 2 quarters of grant distributions
- 15% → Core team salaries (max 6 months runway)
- 5% → Smart contract audits & security

---

## 8. ECONOMIC SUSTAINABILITY MODEL

### 8.1 Growth Projections (Conservative)

**Assumptions**:
- Year 1: $2M in grants distributed → $40k in fees (2%)
- Year 2: $8M distributed → $160k in fees
- Year 3: $20M distributed → $400k in fees
- Overhead costs: ~$300k/year (4-person core team + infrastructure)

**Break-Even Analysis**:
```
Break_Even_Point = Annual_Costs / Fee_Rate
                 = $300,000 / 0.02
                 = $15,000,000 in grants distributed annually
```

Expected to reach break-even in Year 2-3 with moderate growth.

### 8.2 Long-Term Sustainability Mechanisms

1. **Fee Adjustment Protocol**:
   - If treasury runway < 6 months: Token House can vote to increase fee (max 4%)
   - If treasury > 24 months runway: Automatically reduce fee by 0.5%
   - Ensures sustainability without over-extraction

2. **Endowment Building**:
   - Once break-even achieved, allocate 10% of surplus to perpetual endowment
   - Invested in low-risk, censorship-resistant yield (e.g., staking ETH)
   - Yield → grant funding in perpetuity

3. **Partnerships**:
   - Other DAOs pay for "Grants-as-a-Service" infrastructure
   - White-label quadratic funding tools for aligned ecosystems
   - Revenue → treasury

---

## 9. TECHNICAL IMPLEMENTATION REQUIREMENTS

### 9.1 Smart Contract Architecture

**Core Contracts**:
1. **IMPACTToken.sol**: ERC-721 soulbound token (non-transferable) with decay logic
2. **GovernanceVoting.sol**: Quadratic voting + delegation management
3. **GrantDistribution.sol**: Quadratic funding calculation + PGF token minting/burning
4. **TreasuryManagement.sol**: Multi-sig with time-locks for large withdrawals
5. **ReputationRegistry.sol**: Tracks multi-dimensional reputation scores
6. **SybilResistance.sol**: Integrates BrightID/PoH verification

**Security Requirements**:
- Full formal verification of voting and treasury contracts
- Minimum 3 independent audits before mainnet launch
- Bug bounty program (up to $500k for critical vulnerabilities)
- Gradual rollout with limits (max $100k per grant in first 3 months)

### 9.2 Off-Chain Infrastructure

**Required Systems**:
1. **GitHub Oracle**: Reads PR merges, issues closed, reviews submitted → triggers IMPACT mints
2. **Curation Dashboard**: Interface for reviewing grant applications, submitting impact assessments
3. **Voting Interface**: Quadratic voting calculator with delegation options
4. **Analytics Dashboard**: Real-time treasury status, grant distribution history, reputation leaderboards
5. **Sybil Detection ML Model**: Analyzes voting patterns for collusion/anomalies

**Data Storage**:
- **On-chain**: All votes, treasury transactions, IMPACT mints/burns, final grant allocations
- **IPFS**: Grant applications, impact reports, Citizens' House deliberations
- **Off-chain DB**: GitHub sync data, user profiles (with user consent)

---

## 10. SUCCESS METRICS & KPIs

### 10.1 Impact Metrics (Primary)

| Metric | Target Year 1 | Target Year 3 |
|--------|---------------|---------------|
| Total Public Goods Funded | $2M | $20M |
| Unique Projects Funded | 100 | 500 |
| Active IMPACT Holders | 500 | 5,000 |
| Gini Coefficient (IMPACT distribution) | <0.6 | <0.5 |
| Grant Recipients Still Active (1 yr later) | >60% | >75% |

### 10.2 Governance Health Metrics

| Metric | Healthy Range |
|--------|---------------|
| Voter Turnout | >25% of IMPACT holders |
| Citizens' House Diversity (Herfindahl Index) | <0.15 |
| Proposal Pass Rate | 30-70% (not rubber-stamping) |
| Average Votes Per Proposal | >100 |
| Whale Dominance (top 10 holders' influence) | <20% of total votes cast |

### 10.3 Sustainability Metrics

| Metric | Threshold |
|--------|-----------|
| Treasury Runway | >12 months |
| Fee Revenue Growth (YoY) | >50% |
| Operational Costs as % of Treasury | <20% |
| Endowment Size | >$5M by Year 5 |

---

## 11. RISKS & MITIGATION STRATEGIES

### 11.1 Identified Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Low Initial Participation** | High | Retroactive airdrop to proven contributors, liquidity mining for curators |
| **Sophisticated Sybil Attack** | High | Multi-layer verification, AI detection, high IMPACT threshold for influence |
| **Citizens' House Capture** | Medium | Short terms (6 mo), forced turnover (max 2 consecutive terms), diversity requirements |
| **Smart Contract Exploit** | Critical | Multiple audits, formal verification, gradual rollout, insurance fund |
| **Regulatory Pressure** | Medium | No financial utility token, no profit extraction, legal structure as nonprofit |
| **Insufficient Treasury Growth** | Medium | Conservative initial funding, fee adjustment mechanism, endowment building |
| **Governance Apathy** | Medium | IMPACT rewards for voting, delegate system, quarterly engagement campaigns |

### 11.2 Contingency Plans

**If Treasury Depletes**:
1. Emergency governance vote to increase fees (requires 67% approval)
2. Activate reserve fund (3% allocation)
3. Pause prospective grants, maintain only retroactive rounds
4. Seek emergency grants from aligned foundations

**If Sybil Attack Succeeds**:
1. Citizens' House emergency pause (67% vote)
2. Forensic analysis of suspicious accounts
3. Retroactive IMPACT slashing for confirmed Sybils
4. Strengthen verification requirements (e.g., require KYC for high-IMPACT holders)

**If Whale Emerges Despite Safeguards**:
1. Implement stricter quadratic penalties
2. Introduce reputation caps per entity (max 5% of total supply)
3. Community discussion on governance reforms

---

## 12. ROADMAP TO DECENTRALIZATION

### Phase 1: Centralized Bootstrap (Months 0-6)
- Core team operates as benevolent dictator
- Deploy smart contracts, distribute genesis IMPACT
- Run first 2 grant rounds manually with community input
- Elect first Citizens' House
- **Deliverable**: Proven grant distribution process, 100+ funded projects

### Phase 2: Hybrid Governance (Months 6-18)
- Token House votes on grant allocations (core team executes)
- Citizens' House runs first retroactive round independently
- Gradual parameter tuning based on community votes
- Treasury management transitions to multi-sig (core team + elected citizens)
- **Deliverable**: Functional two-house governance, $5M+ distributed

### Phase 3: Full Decentralization (Months 18-36)
- Smart contracts control all treasury operations (no multi-sig for routine grants)
- Core team transitions to elected "Service Provider" (re-elected quarterly)
- All governance parameters adjustable by Token House
- DAO operates independently, core team optional
- **Deliverable**: Self-sustaining, credibly neutral public goods funding protocol

### Phase 4: Ecosystem Expansion (Year 3+)
- Deploy "Grants-as-a-Service" for other ecosystems
- Open-source all tooling for anyone to fork
- Research advanced mechanisms (AI-assisted impact measurement, zero-knowledge voting)
- **Deliverable**: Industry-standard public goods funding infrastructure

---

## 13. ALIGNMENT WITH NON-EXTRACTIVE ETHOS

### Explicit Guarantees

✅ **No Financial Speculation**: IMPACT is non-transferable, PGF is not a tradeable asset
✅ **No Wealth-Based Power**: Voting power from contribution, not capital
✅ **No Profit Extraction**: 90% of fees → public goods, 7% → operations, 3% → reserves (0% to investors)
✅ **No ICO or Token Sale**: Tokens earned only through work
✅ **Anti-Concentration**: Quadratic voting, reputation decay, whale caps, diversity requirements
✅ **Transparent & Auditable**: All transactions on-chain, quarterly reports, elected oversight
✅ **Community-Owned**: DAO controls treasury, no external shareholders or VCs
✅ **Perpetual Mission Lock**: Cannot vote to change core non-extractive principles (enshrined in immutable constitution)

### Constitutional Invariants (Immutable On-Chain)

```solidity
// THESE PRINCIPLES CANNOT BE CHANGED BY GOVERNANCE VOTE
contract Constitution {
    string public constant MISSION = "Fund public goods through non-extractive mechanisms";
    uint256 public constant MIN_PUBLIC_GOODS_ALLOCATION = 90; // % of treasury
    bool public constant IMPACT_TRANSFERABLE = false;
    bool public constant WEALTH_BASED_VOTING_ALLOWED = false;
    bool public constant PROFIT_EXTRACTION_ALLOWED = false;
}
```

---

## CONCLUSION

This tokenomics model creates a **self-sustaining, anti-extractive public goods funding engine** by:

1. **Separating governance rights from financial speculation** (non-transferable IMPACT)
2. **Deriving power from contribution, not capital** (reputation-based voting)
3. **Recycling all value to public goods** (90% of fees → grants)
4. **Resisting concentration through math** (quadratic mechanisms everywhere)
5. **Ensuring long-term sustainability** (fee-based revenue + endowment building)

The model is **designed to fail safely**: if governance becomes apathetic, the treasury continues funding retroactive rounds. If the DAO dissolves, the treasury becomes a community multisig for manual distribution. The system prioritizes **impact over profit, community over extraction, and long-term mission over short-term speculation**.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Status**: Awaiting Adversarial Validation
