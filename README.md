# dGameBet — Decentralized Football Betting dApp

dGameBet is a decentralized application (Đapp) for betting on football match results, built with cutting-edge web3 technologies and modern frontend tools. The platform empowers users to securely place bets on football matches, with all logic and payouts enforced by smart contracts on the Ethereum Sepolia testnet.

## 🌟 Features

- **Decentralized Betting:** Trustless betting on football matches via Ethereum smart contracts.
- **Organizer-Driven Matches:** Game organizers create matches, define start times, and deploy the betting contract.
- **Accurate Timing:** Smart contracts enforce the correct start time for each match.
- **Preset Bet Amounts:** All participants bet the same amount (defined by the organizer).
- **Secure Result Submission:** After the match, the organizer submits the final score; winnings are distributed accordingly.
- **Automatic Payouts:**
  - 5% of the total pool goes to the organizer.
  - The remainder is split among those who bet on the winning team.
  - In case of a draw, all stakes are refunded.
- **Active & Finished Matches:** The main contract lists all open and finished matches.
- **Organizer Ratings:** Bettors can rate organizers based on their experience.

## 🛠️ Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/), [TailwindCSS](https://tailwindcss.com/)
- **Smart Contracts:** [Solidity](https://soliditylang.org/), [Hardhat](https://hardhat.org/)
- **Blockchain Network:** Ethereum Sepolia Testnet (via [Infura](https://infura.io/))
- **Web3 Libraries:** [wagmi](https://wagmi.sh/), [ethers.js](https://docs.ethers.org/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Hardhat](https://hardhat.org/)
- [Infura API Key](https://infura.io/)
- MetaMask or any Ethereum wallet

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/dgamebet.git
   cd dgamebet
   ```

2. **Install dependencies:**

   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure environment variables:**
   - Create a `.env.local` file in the root directory.
   - Add your Infura API key and other required secrets.

4. **Compile and deploy smart contracts:**

   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network sepolia
   ```

5. **Run the frontend:**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

### Usage

- Connect your wallet (MetaMask) to Sepolia.
- Organizers can create matches and define rules.
- Users can bet on their chosen team before the match starts.
- After the match, the organizer submits the result.
- Winnings are distributed automatically.

## 📝 Project Specification (Serbian)

Napraviti Đapp dGameBet za klađenje na rezultat fudbalske utakmice. Organizator igre kreira
pametni ugovor aplikacije i navodi tačno vreme početka utakmice (obezbediti u pametnom
ugovoru pravilan proračun vremena početka). Svako ima pravo da uloži na pobedu jednog od dva
tima tačan ulog koji je definisan prilikom kreiranja utakmice. Nakon kraja utakmice, organizator
klađenja je dužan da unese konačan rezultat utakmice na osnovu čega će premija biti
raspoređena. 5% premije ide organizatoru klađenja dok se ostatak deli na one koji su se kladili na
pobednički tim. Ukoliko je rezultat nerešen, sredstva treba da budu vraćena svim ulagačima.
Glavni pametni ugovor Đapp-a treba da obezbedi listanje aktivnih utakmica na koje može da se
kladi kao i utakmica koje su završene. Obezbediti da oni koji su se kladili mogu da ocenjuju
organizatora klađenja.

## 🤝 Contributing

Pull requests are very welcome! For major changes, please open an issue first to discuss what you’d like to change.

