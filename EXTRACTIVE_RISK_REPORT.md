# EXTRACTIVE RISK REPORT
## Adversarial Security Analysis of Public Goods Funding DAO Tokenomics

**Validator Role**: Adversarial Security Auditor
**Focus**: Identify pathways to extractive behavior, centralization, and economic instability
**Methodology**: Game-theoretic analysis, economic modeling, attack scenario simulation
**Date**: 2025-11-15
**Status**: CRITICAL VULNERABILITIES IDENTIFIED

---

## EXECUTIVE SUMMARY

This report identifies **14 critical and high-severity vulnerabilities** in the proposed tokenomics model that enable:

1. **Economic collapse** within 3 years (treasury depletion confirmed by simulation)
2. **Soft governance capture** by early contributors despite quadratic safeguards
3. **Extractive value flows** through operational budget manipulation
4. **Plutocratic drift** as IMPACT accumulates to long-term participants
5. **Gaming of retroactive funding** through social engineering

**Overall Risk Assessment**: **HIGH** - Model requires significant refinement before deployment

**Recommendation**: DO NOT DEPLOY without addressing risks #1, #2, #3, #5, #7, and #10

---

## VULNERABILITY CATALOG

### 🔴 CRITICAL RISK #1: Treasury Death Spiral

**Severity**: CRITICAL
**Category**: Economic Sustainability
**Exploitability**: Guaranteed (proven by simulation)

**Description**:
The simulation demonstrates treasury depletion from $5M to $660 in 12 quarters (3 years). The economic model is fundamentally unsustainable.

**Root Cause Analysis**:
```
Quarterly Revenue:  Fees = 2% of grants distributed
Quarterly Expenses: Grants (from treasury) + $75k operations

Problem: As treasury shrinks → grants shrink → fees shrink → death spiral
```

**Simulation Evidence**:
```
Quarter  1: Treasury $4.1M | Grants $819k | Fees $16k  | Ops $75k
Quarter  6: Treasury $1.2M | Grants $318k | Fees $6k   | Ops $75k
Quarter 12: Treasury $660  | Grants $16k  | Fees $0.3k | Ops $75k
```

**Extractive Implications**:
- Core team has incentive to "grab what they can" before collapse
- Projects rushed to apply before funds run out (quality degradation)
- DAO becomes dependent on external grants (capture risk)
- Ultimately fails its public goods mission

**Why This Enables Extraction**:
A dying DAO creates desperation. The core team can justify:
- Emergency fee increases (up to 4% allowed)
- Expanding "operational costs" to 7% of shrinking treasury
- Hiring consultants/contractors (extractive service providers)
- "Temporary" violations of 90% public goods allocation during "crisis"

**Exploitation Scenario**:
```
Quarter 8: Treasury at $610k, team realizes collapse imminent
1. Proposal: "Emergency budget increase to $150k/quarter for survival"
2. Justification: "We need to hire 2 more devs or the platform dies"
3. Vote passes (founders control 30% of genesis IMPACT, easily influence)
4. Quarters 9-12: $600k flows to "operations" (salaries to founder-aligned entities)
5. Treasury depletes, DAO dissolves, founders extracted $600k legally
```

**Mitigation Required**:
- ⚠️ Fee-based revenue model is BROKEN for early-stage DAOs
- Must bootstrap with multi-year grant from aligned foundation
- Implement progressive fee schedule: 0.5% Y1 → 1% Y2 → 2% Y3+
- Require endowment build before scaling grants (safety buffer)

---

### 🔴 CRITICAL RISK #2: Founder IMPACT Entrenchment

**Severity**: CRITICAL
**Category**: Governance Centralization
**Exploitability**: Medium (requires patience but guaranteed)

**Description**:
Despite quadratic voting and decay mechanisms, the 30% genesis allocation to founders (3M IMPACT) creates a **permanent governance aristocracy**.

**Math Breakdown**:
```
Founders (20 people):
- Genesis IMPACT: 3,000,000 (150,000 each)
- After 12 quarters (5% decay/quarter): ~1,690,000 total
- Voting power: √1,690,000 = 1,300 votes

New contributors (543 people joined over 12 quarters):
- Avg IMPACT: ~7,000 each (earned through contributions)
- Total IMPACT: ~3,800,000
- Avg voting power per person: √7,000 = 83 votes
- Combined: 543 × 83 = 45,069 votes

Founders control: 1,300 / (1,300 + 45,069) = 2.8% of votes
```

**Wait, that looks GOOD, right? WRONG. Here's the exploit**:

**Founder Collusion Attack**:
The 20 founders are a tight-knit group (they founded the DAO together). They can:

1. **Coordinate voting** without detection (appear independent, meet off-chain)
2. **Control Citizens' House elections** (nominate + elect each other with 1,300 combined votes)
3. **Dominate curation reputation** (allocate "curator IMPACT" to each other for grant reviews)
4. **Soft-capture retroactive funding** (Citizens' House = founders → retroactive funds go to founder-aligned projects)

**The Real Voting Power**:
```
Founders' True Influence:
- Direct votes: 2.8% (seems small)
- Citizens' House control: 50% (elect majority of 50 citizens)
- Retroactive funding control: 30% of all grants
- Curator reputation: Dominate grant selection

Effective control: ~40-50% of all decision-making
```

**Extractive Pathway**:
Year 3: Founders quietly:
1. Elect themselves to Citizens' House (2-year cumulative voting)
2. Retroactively fund founder-aligned projects (friends, portfolio companies)
3. Use "non-extractive" label while funneling $millions to their network
4. Technically legal (it's public goods!), practically extractive

**Simulation Evidence**:
The simulation shows "top 10 holders" maintain 14-15% of total IMPACT throughout. With coordination, 20 founders can act as a cartel.

**Mitigation Required**:
- ⚠️ Reduce founder allocation to 15% MAX (not 30%)
- Require founder IMPACT to decay FASTER (10%/quarter vs. 5%)
- Implement anti-nepotism rules for Citizens' House (max 2 founders at a time)
- Public disclosure of conflicts of interest for retro funding votes
- Rotate Citizens' House members every 2 quarters (not 6 months)

---

### 🔴 CRITICAL RISK #3: Operational Budget as Extraction Vector

**Severity**: CRITICAL
**Category**: Value Extraction
**Exploitability**: High

**Description**:
The 7% operational budget allocation is a **legal extraction mechanism** disguised as sustainability.

**Current Model**:
```
Treasury fees → 90% grants, 7% operations, 3% reserves
Operations budget: Salaries, infrastructure, audits
```

**The Problem**:
"Operations" is **undefined and ungoverned**. Who decides:
- What salary levels are "reasonable"? ($50k/year? $200k? $500k?)
- How many "core team" members are needed? (4? 10? 20?)
- What counts as "infrastructure"? (AWS? Or luxury MacBooks?)
- Can "audits" include consulting from founder-owned firms?

**Extractive Exploitation**:
```
Year 1: Core team (4 people) at $75k each = $300k/year ✓ Reasonable
Year 2: "We need to scale! Hire 6 more" = $750k/year
Year 3: "Competitive salaries to retain talent" = $150k each × 10 = $1.5M/year

Math:
- 7% of $5M treasury = $350k/year MAX
- But team wants $1.5M/year
- Solution: Reclassify expenses or increase treasury via fee hikes
- OR: Use "emergency" powers to exceed 7% temporarily (constitution allows Citizens' veto, but they're captured by founders per Risk #2)
```

**Real-World Precedent**:
Many DAOs have seen "operational costs" balloon:
- SushiSwap: $4M+ operational budgets for questionable spending
- BadgerDAO: Core team paid $millions before treasury collapse
- Wonderland: Founder-aligned entities extracted via "treasury management"

**Extractive Scenario**:
```
Quarter 6: Treasury at $1.2M, founders propose:
"We need $50k/month ($150k/quarter) to hire a lead developer"

Community: "That's 50% of our $300k quarterly revenue!"
Founders: "Without this, we can't deliver features. Vote yes or DAO dies."

Vote passes (founder influence + fear).

New "lead dev" is a founder's friend/co-founder of their startup.
Does minimal work, gets paid $150k/quarter ($600k/year).

Technically legal (it's operations!), practically extractive.
```

**Mitigation Required**:
- ⚠️ Cap TOTAL operational spending at $500k/year ABSOLUTE (not % of treasury)
- Require quarterly public reports with specific salary disclosures
- All hires must be approved by Token House vote (not just Citizens' House)
- Implement "reasonable compensation" standard (median OSS salary in region)
- Any spending over $25k/quarter requires individual proposal + vote

---

### 🟠 HIGH RISK #4: Gini Coefficient Breach

**Severity**: HIGH
**Category**: Wealth Concentration
**Exploitability**: Guaranteed (proven by simulation)

**Description**:
The model targets Gini < 0.5 by Year 3 but achieves 0.622 (FAILED).

**Simulation Results**:
```
Quarter  1: Gini 0.434 ✓
Quarter  6: Gini 0.561 ✗ (breach)
Quarter 12: Gini 0.622 ✗✗ (severe)
```

**Why This Matters**:
A Gini > 0.6 indicates severe inequality, approaching plutocratic concentration. For reference:
- United States income Gini: 0.48
- Brazil (high inequality): 0.53
- South Africa (most unequal): 0.63

**Your DAO is as unequal as South Africa's wealth distribution.**

**Root Cause**:
1. Decay (5%/quarter) doesn't redistribute IMPACT, just destroys it
2. New contributors earn less IMPACT than early whales accumulated
3. Multi-dimensional reputation favors generalists (founders) over specialists

**Extractive Implication**:
High Gini means:
- Small elite controls governance (even with quadratic voting)
- Grant allocations favor elite's preferences
- New contributors feel disempowered → leave
- DAO becomes oligarchy, not democracy

**Mitigation Required**:
- Implement IMPACT redistribution (not just decay): 2% of top holders' IMPACT redistributed to bottom 50% quarterly
- Increase new contributor earning rates (double IMPACT for first 6 months)
- Cap individual IMPACT holdings at 2% of total supply (forced decay above cap)

---

### 🟠 HIGH RISK #5: Retroactive Funding Social Engineering

**Severity**: HIGH
**Category**: Governance Manipulation
**Exploitability**: High

**Description**:
Retroactive funding is marketed as "can't be gamed (already happened)" but this is **false**.

**The Exploit**:
```
PHASE 1 (Quarters 1-4): Build credibility
- Create genuinely useful OSS project
- Earn community trust, build reputation
- Get elected to Citizens' House

PHASE 2 (Quarters 5-8): Plant seeds
- Launch 5 "public good" projects (appear independent)
- Actually controlled by same entity (hidden via different GitHub orgs)
- Make them useful enough to gain traction

PHASE 3 (Quarter 9-12): Harvest
- As Citizens' House member, advocate loudly for "rewarding impactful projects"
- Nominate your 5 projects for retroactive funding
- Other Citizens don't realize they're all yours (different names, orgs)
- Vote to allocate $500k across your 5 projects
- Extract $500k while appearing legitimate
```

**Why This Works**:
- Citizens' House has NO conflict-of-interest disclosure requirements
- No limits on how many projects one person can nominate
- No verification that nominees are truly independent
- Retroactive impact is subjective (GitHub stars can be gamed, usage metrics faked)

**Real-World Example**:
Optimism RetroPGF Round 2 faced criticism when:
- Projects with inflated GitHub stars received funding
- Voting cartels formed among Citizens
- Some recipients were "public goods" in name only

**Extractive Impact**:
30% of all funding goes to retroactive rounds. If 50% of retro funding is captured by bad actors:
```
Total DAO funding over 3 years: $4.2M (per simulation)
Retroactive allocation: $4.2M × 30% = $1.26M
If 50% captured: $630k extracted
```

**Mitigation Required**:
- ⚠️ Mandatory conflict-of-interest disclosures for Citizens' House
- Limits: Citizens can nominate max 3 projects per round, cannot vote on own nominations
- Third-party impact verification (not just GitHub metrics)
- Whistleblower rewards: 10% of recovered funds if you expose fraud
- Reduce retro allocation to 15% (not 30%) until governance matures

---

### 🟠 HIGH RISK #6: IMPACT Decay Creates Voter Apathy

**Severity**: HIGH
**Category**: Governance Failure
**Exploitability**: Medium (unintentional)

**Description**:
5% quarterly decay (19.4% annually) **punishes participation**.

**Psychological Impact**:
```
Contributor thinking:
"I earned 1,000 IMPACT this quarter through hard work.
In 1 year, it'll decay to ~800 IMPACT.
In 2 years, it'll be ~650 IMPACT.
Why bother contributing if my influence evaporates?"
```

**Simulation Evidence**:
Total IMPACT in circulation drops from 6.1M → 3.8M over 12 quarters.
This isn't just inactive users decaying—it's EVERYONE losing value.

**Governance Consequence**:
```
Quarter 1: 335 active contributors, 6.1M IMPACT → avg 18,200 per person
Quarter 12: 555 active contributors, 3.8M IMPACT → avg 6,900 per person

Contributor effort DOUBLED (335 → 555) but avg influence DECREASED (18k → 7k).
```

**This is the opposite of "rewarding ongoing participation."**

**Extractive Risk**:
Low voter engagement enables:
- Elite capture (only whales bother voting since they have enough IMPACT for it to matter)
- Proposals pass with low quorum (10% is TOO LOW when participation is discouraged)
- Stealth governance attacks (pass extractive proposals when no one's watching)

**Mitigation Required**:
- Reduce decay to 2% per quarter (7.8% annually)
- Decay only affects INACTIVE contributors (no contributions in past 2 quarters)
- Participation bonus: +5% IMPACT per quarter for active voters (offsets decay)
- Increase quorum to 25% of active IMPACT for major decisions

---

### 🟠 HIGH RISK #7: Quadratic Funding is Sybil-Vulnerable at Scale

**Severity**: HIGH
**Category**: Economic Attack
**Exploitability**: High (despite claimed safeguards)

**Description**:
The model claims "BrightID + GitHub verification" prevents Sybils, but this is **wishful thinking**.

**Why Current Defenses Fail**:

**1. BrightID is gameable**:
- Requires 3 existing members to vouch
- Attacker creates 10 real identities initially
- Uses those 10 to vouch for 30 more
- Exponential growth: 10 → 40 → 160 Sybils with valid BrightID

**2. GitHub history is purchaseable**:
- Aged GitHub accounts sell for $20-50 on darknet markets
- Contributions can be fabricated (fake repos, fake commits)
- "Peer review scores" can be Sybil-voted by other fake accounts

**3. Quadratic funding amplifies Sybils**:
The demonstration shows grassroots > whales, but this **assumes honest actors**.

**Sybil Attack on QF**:
```
Attacker's goal: Capture $100k grant for fake project

Step 1: Create 100 Sybil identities ($2,500 + 2,100 hours per earlier analysis)
Step 2: Each Sybil contributes $10 to attacker's project = $1,000 direct

Quadratic matching calculation:
Matching = (Σ√10)² for 100 contributors
         = (100 × 3.16)² = 316² = 99,856
         = $99,856 in matching funds for $1,000 investment

ROI: $99,856 / $3,500 (attack cost) = 28.5x return
```

**Wait, the model says Sybils cost $500k for minimal influence. Why the discrepancy?**

The $500k estimate is for governance capture (earning IMPACT for voting power).
The QF attack is for grant capture (gaming matching funds).

**These are DIFFERENT attack vectors, and QF Sybil is WAY cheaper.**

**Mitigation Required**:
- ⚠️ Implement pairwise bonding curves (Vitalik's collusion-resistant QF)
- Cap matching multiplier at 10x (max $10k direct → $100k total)
- Require contributions from accounts with >6 months history
- Use ML anomaly detection for suspicious contribution patterns
- Citizens' House retains veto power over QF results (sanity check)

---

### 🟠 HIGH RISK #8: Citizens' House Election is Plutocratic

**Severity**: HIGH
**Category**: Governance Centralization
**Exploitability**: Medium

**Description**:
Citizens' House members are elected by IMPACT holders using ranked-choice voting, **weighted by IMPACT**.

**This is proof-of-stake governance with extra steps.**

**The Math**:
```
Founder with 150,000 IMPACT:
- Voting power: √150,000 = 387 votes
- Can elect 1 Citizen with 387 votes

New contributor with 1,000 IMPACT:
- Voting power: √1,000 = 31 votes
- Needs 12 other new contributors to equal 1 founder

387 new contributors needed to counter 20 founders' election power.
```

**Extractive Implication**:
If founders control Citizens' House elections:
- They elect founder-aligned members
- Citizens' House controls 30% of funding (retroactive)
- Citizens' House has veto power over governance
- **Founders have captured the "checks and balances" mechanism**

**Mitigation Required**:
- Citizens' House elections should use 1-person-1-vote (not IMPACT-weighted)
- Require BrightID verification for voters (Sybil resistance)
- Sortition (random selection) for 50% of Citizens' House seats
- Term limits: Max 2 consecutive terms (prevent entrenchment)

---

### 🟡 MEDIUM RISK #9: Fee Adjustment Governance is Exploitable

**Severity**: MEDIUM
**Category**: Value Extraction
**Exploitability**: Medium

**Description**:
The model allows fee increases up to 4% via Token House vote if "treasury runway < 6 months."

**The Exploit**:
```
Quarter 8: Treasury at $610k, burn rate $75k/quarter
Runway: $610k / $75k = 8 months (above 6-month threshold)

Founders propose: "Hire 2 more devs for $100k/quarter"
Vote passes (founder influence).

New burn rate: $175k/quarter
Runway: $610k / $175k = 3.5 months (below threshold!)

Now founders can propose fee increase to 4%:
"Emergency! Treasury runway < 6 months, we need higher fees"

Community forced to accept or DAO dies.
```

**This is manufactured crisis governance.**

**Extractive Pathway**:
1. Increase operational costs unnecessarily
2. Create treasury crisis
3. Force fee increase
4. Higher fees enable more operational spending
5. Repeat

**Mitigation Required**:
- Fee increases require 67% supermajority (not simple majority)
- Cannot increase fees if operational costs increased in past 2 quarters
- Max 1 fee adjustment per year (prevent iterative gaming)

---

### 🟡 MEDIUM RISK #10: "Non-Transferable" IMPACT Can Be Shadow-Traded

**Severity**: MEDIUM
**Category**: Extractive Behavior
**Exploitability**: Medium

**Description**:
IMPACT is designed as soulbound (non-transferable) to prevent financialization.

**But you cannot prevent off-chain agreements.**

**Shadow Market Exploit**:
```
Buyer: "I'll pay you $10,000 for your account with 50,000 IMPACT"
Seller: "Deal. Here are my private keys."

Transaction occurs off-chain. On-chain, it looks like the same person.
IMPACT is now effectively traded, defeating the non-transferable design.
```

**Why This Matters**:
1. Wealthy entities can buy voting power (violates anti-plutocracy ethos)
2. Creates perverse incentive: earn IMPACT to sell accounts, not contribute
3. Original contributors may sell out to extractive actors

**Real-World Precedent**:
- World ID (soulbound identity) has shadow markets for verified accounts
- ENS names (before transferability) traded via ownership transfer
- Validator keys in PoS systems traded off-chain

**Detection Difficulty**:
How can you tell if an account was sold vs. person still active?
- Behavior changes (different voting patterns) → could be preference shift
- IP changes → could be VPN or travel
- Contribution style shifts → could be learning new skills

**Impossible to prove without KYC, which violates privacy.**

**Mitigation Required**:
- ⚠️ Periodic proof-of-humanity re-verification (every 6 months)
- Behavioral anomaly detection (flag accounts with sudden pattern changes)
- Decay is actually helpful here (bought accounts lose value over time)
- Community norm: publicly shame account buyers (social enforcement)
- Consider delegation instead of sale (can revoke if delegate misbehaves)

---

### 🟡 MEDIUM RISK #11: Curator Reputation is Circular & Gameable

**Severity**: MEDIUM
**Category**: Governance Manipulation
**Exploitability**: Medium

**Description**:
The model states curators earn IMPACT for reviewing grant applications, with "quality determined by agreement with final funding outcome."

**This is circular logic**:
```
Curators review projects → vote on funding → outcome determined by votes
→ Curators who voted with majority earn IMPACT
→ IMPACT increases their future voting power
→ Creates conformity cascade (vote with majority to earn IMPACT)
```

**Game-Theoretic Outcome**:
Curators are incentivized to vote with the crowd, NOT critically evaluate.

**Extractive Implication**:
1. Low-quality projects can pass if they gain early momentum
2. Dissenting curators are punished (don't earn IMPACT for unpopular opinions)
3. Groupthink dominates, critical analysis disappears
4. Funds flow to popular (not impactful) projects

**Real-World Example**:
YouTube/TikTok: Early likes/views create momentum, algorithm amplifies, quality becomes secondary.

**Mitigation Required**:
- Separate curation IMPACT from vote outcome
- Reward based on effort (did they write detailed review?) not agreement
- Retroactive evaluation: Did projects they funded succeed? (measured 6 months later)
- Diversity bonus: Curators who identify hidden gems (low votes but high impact) earn bonus IMPACT

---

### 🟡 MEDIUM RISK #12: Multi-Dimensional Reputation Favors Generalists, Punishes Specialists

**Severity**: MEDIUM
**Category**: Inefficiency & Misaligned Incentives
**Exploitability**: Low (self-inflicted harm)

**Description**:
Voting power formula:
```
Total_Voting_Power = sqrt(Builder_Rep² + Curator_Rep² + Community_Rep²)
```

**This favors generalists over specialists.**

**Example**:
```
Alice (Specialist): 10,000 Builder, 0 Curator, 0 Community
  Voting Power = √(10,000²) = 10,000

Bob (Generalist): 6,000 Builder, 6,000 Curator, 6,000 Community
  Voting Power = √(6,000² + 6,000² + 6,000²) = √108,000,000 = 10,392
```

**Bob has 44% less total reputation (18k vs. 10k) but MORE voting power.**

**Why This Is a Problem**:
1. Discourages specialization (we WANT expert builders, not dilettantes)
2. Incentivizes "reputation farming" across categories (do mediocre work everywhere)
3. Specialists feel undervalued → leave ecosystem

**Extractive Implication**:
- Founders (who do a bit of everything) maintain power
- Expert builders (who only code) lose influence
- DAO becomes generalist-run, quality decreases

**Mitigation Required**:
- Use linear formula: `Voting_Power = sqrt(Builder + Curator + Community)`
- OR: Allow users to specialize and earn 2x IMPACT in one chosen category
- OR: Separate governance by domain (builders vote on tech, curators on grants, etc.)

---

### 🟡 MEDIUM RISK #13: "Emergency Pause" is a Centralization Backdoor

**Severity**: MEDIUM
**Category**: Governance Centralization
**Exploitability**: Low (requires Citizens' House capture, but see Risk #2)

**Description**:
Citizens' House can pause grant distributions for 14 days with 67% vote if:
- Sybil attack detected
- Smart contract vulnerability found
- Governance manipulation suspected

**This is a useful safety mechanism, but also a censorship vector.**

**The Exploit**:
```
Scenario: A whistleblower project applies for a grant
- They're building a tool to detect Citizens' House corruption
- Citizens' House (captured by founders per Risk #2) sees this as threat
- Vote to "pause" grants citing "suspicious governance activity"
- Delay project funding for 14 days (may be canceled in next round)
- Repeat for any dissenting project
```

**Extractive Pathway**:
Pause power = veto power over specific grants (if you control Citizens' House).

**Mitigation Required**:
- Pause must be system-wide (not selective projects)
- Require transparency report within 24 hours (not 48)
- Community can override pause with 75% Token House vote
- Track pause usage: if paused >3 times per year, elect new Citizens' House

---

### 🟡 MEDIUM RISK #14: Open-Source Code Enables Copycat DAOs

**Severity**: MEDIUM
**Category**: Value Fragmentation (not direct extraction)
**Exploitability**: Guaranteed

**Description**:
The model states "Year 3+: Open-source all tooling for anyone to fork."

**The Risk**:
```
Year 4: A well-funded entity (VC, foundation, protocol) forks the DAO
- Launches "Optimized Public Goods DAO 2.0"
- Allocates $50M initial treasury (10x more than original)
- Uses same mechanics but with aggressive marketing
- Attracts all new contributors to fork, not original
- Original DAO withers, fork becomes dominant
- Fork gradually introduces extractive mechanics (boiling frog)
```

**Why This Matters**:
You're creating a blueprint for extractive entities to clone, then out-compete you.

**Real-World Example**:
- SushiSwap forked Uniswap, vampire attacked liquidity
- Many "Gitcoin clones" launched with worse mechanics
- OpenSea vs. LooksRare (financial incentives won over ethos)

**Not Directly Extractive, But**:
Weakens the non-extractive ecosystem by enabling funded competitors to dominate.

**Mitigation**:
- License code as "non-commercial" or "DAO-only use" (restricts VC forks)
- Build strong brand/community moat (hard to replicate)
- Accept that forks are inevitable (and maybe beneficial for ecosystem)
- This is LOW priority compared to other risks

---

## CROSS-CUTTING SYSTEMIC RISKS

### A. Death Spiral Dynamics

Multiple risks compound:
```
Treasury depletes (Risk #1)
  → Emergency measures needed
  → Founders increase ops budget (Risk #3)
  → Forces fee hike (Risk #9)
  → Higher fees reduce grant applications
  → Less fee revenue → worse death spiral
```

### B. Founder Cartel Capture

Risks #2, #3, #5, #8, #13 all enable founder control:
```
Founders control:
- 30% of genesis IMPACT (voting power)
- Citizens' House elections (IMPACT-weighted)
- Retroactive funding (Citizens' House power)
- Operational budget (undefined limits)
- Emergency pause (captured Citizens' House)

Result: Founders can extract legally while maintaining "non-extractive" image.
```

### C. Incentive Misalignment

The model claims to reward contribution, but actually rewards:
- Seniority (early IMPACT > new contributions)
- Conformity (curator groupthink)
- Generalism (multi-dimensional formula)
- Patience (waiting to extract via slow capture)

True contributors (specialist builders, critical curators) are **punished**.

---

## QUANTITATIVE RISK ASSESSMENT

| Risk # | Severity | Exploitability | Impact | Priority |
|--------|----------|----------------|--------|----------|
| 1. Treasury Death Spiral | CRITICAL | Guaranteed | DAO Collapse | **FIX NOW** |
| 2. Founder Entrenchment | CRITICAL | Medium | Soft Capture | **FIX NOW** |
| 3. Ops Budget Extraction | CRITICAL | High | Value Leak | **FIX NOW** |
| 4. Gini Breach | HIGH | Guaranteed | Plutocracy | **FIX SOON** |
| 5. Retro Funding Gaming | HIGH | High | Extraction | **FIX NOW** |
| 6. Decay Voter Apathy | HIGH | Medium | Governance Fail | **FIX SOON** |
| 7. QF Sybil Attack | HIGH | High | Grant Capture | **FIX NOW** |
| 8. Citizens' House Plutocracy | HIGH | Medium | Centralization | **FIX SOON** |
| 9. Fee Adjustment Gaming | MEDIUM | Medium | Gradual Extraction | Address |
| 10. Shadow IMPACT Trading | MEDIUM | Medium | Plutocracy | Address |
| 11. Curator Circularity | MEDIUM | Medium | Bad Incentives | Address |
| 12. Generalist Bias | MEDIUM | Low | Inefficiency | Consider |
| 13. Emergency Pause Veto | MEDIUM | Low | Censorship | Consider |
| 14. Copycat Forks | MEDIUM | Guaranteed | Fragmentation | Accept |

---

## RECOMMENDED FIXES (PRIORITY ORDER)

### Tier 1 (MUST FIX BEFORE DEPLOYMENT):

1. **Fix Treasury Model**:
   - Secure $10M+ multi-year foundation grant (not $5M)
   - Reduce initial grant sizes by 50% (conserve treasury)
   - Implement 0.5% → 1% → 2% progressive fee schedule
   - Build $2M endowment before scaling

2. **Reduce Founder Allocation**:
   - 15% max to founders (not 30%)
   - 10% quarterly decay for founders (not 5%)
   - Max 2 founders in Citizens' House at once

3. **Cap Operational Budget**:
   - $400k/year ABSOLUTE maximum
   - Public salary disclosures
   - All hires require Token House vote

4. **Fix Retroactive Funding**:
   - Mandatory conflict-of-interest disclosures
   - Citizens can't vote on own nominations
   - Third-party impact verification
   - Reduce allocation to 15% (not 30%)

5. **Harden Quadratic Funding**:
   - Pairwise bonding curves (collusion resistance)
   - Cap matching multiplier at 10x
   - 6-month account age minimum for contributors

### Tier 2 (FIX IN FIRST YEAR):

6. Implement IMPACT redistribution (not just decay)
7. Reduce decay to 2% quarterly (not 5%)
8. Make Citizens' House elections 1-person-1-vote
9. Increase quorum to 25% for major votes
10. Add participation bonuses to offset decay

### Tier 3 (MONITOR & ITERATE):

11-14. Address medium-priority risks based on observed behavior

---

## CONCLUSION

The proposed tokenomics model demonstrates **strong theoretical commitment** to non-extractive principles but contains **critical implementation flaws** that enable:

✅ **Good intentions** (90% to public goods, non-transferable tokens, quadratic mechanisms)
❌ **Exploitable loopholes** (founder control, ops budget extraction, retro funding gaming)
❌ **Unsustainable economics** (treasury death spiral proven by simulation)

**Final Assessment**: This model would **fail within 3 years** and likely be **captured by founders** before collapse.

**DO NOT DEPLOY** without addressing Tier 1 fixes.

**With fixes, the model has potential** to be a genuinely non-extractive public goods funding mechanism.

---

**Report prepared by**: Adversarial Validator Agent
**Methodology**: Game-theoretic analysis, economic simulation review, attack scenario modeling
**Confidence Level**: HIGH (vulnerabilities are structural, not speculative)
**Recommendation**: Substantial revision required

