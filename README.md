# CarbonFlow 🍃

**A Smart Carbon Credit Management & Trading Platform**



CarbonFlow is a comprehensive, full-stack web application designed to help industries track, manage, analyze, and trade their carbon credits. It moves beyond simple ledgers by integrating real-time IoT data, providing AI-powered insights, and securing transactions on a public blockchain to ensure complete transparency.

### ✨ **[Live Demo: carbonflow.vercel.app](https://carbonflow.vercel.app)** ✨

---

## 🚀 What Makes CarbonFlow Unique?

CarbonFlow is not just another dashboard. It's an all-in-one ecosystem that solves the core problems of carbon management: data inaccuracy, lack of actionable insights, and trust in the trading process.

* **Real-time IoT Monitoring:** Simulates a direct feed from on-site IoT devices, allowing organizations to monitor their emissions live, second-by-second, rather than relying on error-prone manual monthly reports.
* **AI-Powered Insights:** Integrates a generative AI model (powered by Google Gemini) that analyzes an organization's specific data to provide actionable, intelligent recommendations for reducing their carbon footprint.
* **On-Chain Transparency:** All marketplace transactions are immutably recorded on the **Sepolia (Ethereum) testnet**. This provides a decentralized, tamper-proof, and publicly verifiable audit trail for every trade, building ultimate trust between participants.

---

## Features

* **📈 Dashboard:** A central hub showing key metrics like Total Emissions, Available Credits, Market Price, and Compliance Status.
* **🤖 AI-Powered Analysis:** A dedicated page where users can generate custom-tailored recommendations from an AI based on their live operational data.
* **⚡ Live Emissions Monitoring:** A real-time dashboard displaying live-streaming data from IoT sensors, complete with a dynamic chart and device status.
* **🛒 P2P Marketplace:** A full-featured marketplace where users can list their surplus carbon credits for sale or buy credits from other users.
* **⛓️ Blockchain Verification:** Every completed trade is registered on the blockchain via a custom Smart Contract. The transaction feed includes a clickable "Verified" badge that links directly to the transaction on Etherscan for public auditing.
* **💳 Wallet & Top-Up:** An in-app wallet (powered by Razorpay) allows users to top up their INR balance to purchase credits.
* **📝 Automated Reporting:** Users can generate and download comprehensive PDF reports summarizing their emissions, compliance, and transaction history.
* **🛡️ Compliance Monitoring:** A persistent sidebar component that dynamically checks the user's emissions against their targets and displays their current compliance status (e.g., "Compliant," "At Risk," "Action Required").
* **👋 AI-Powered Onboarding:** A multi-step sign-up process where a backend function uses AI to analyze a user's initial data and allocate their starting carbon credits.

---

## 🛠️ Tech Stack & System Architecture

This project uses a modern, decoupled architecture. The frontend React application consumes data and services from a Supabase backend, which in turn interacts with third-party AI and Blockchain APIs.

### Tech Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) | Core UI library with fast bundling. |
| | TypeScript | For type safety across the entire application. |
| | Tailwind CSS | Utility-first CSS for rapid styling. |
| | Shadcn-UI | Beautifully designed, accessible component library. |
| | Recharts | Composable charting library for data visualization. |
| | `react-router-dom` | Client-side routing. |
| | `jsPDF` | Client-side PDF generation for reports. |
| **Backend** | Supabase | All-in-one backend (Database, Auth, Edge Functions). |
| | Postgres | SQL database for storing all user and app data. |
| | Supabase Auth | Manages user sign-up, sign-in, and profiles. |
| | Supabase Realtime | Powers the live emissions monitoring feed. |
| | Supabase Edge Functions | Secure, server-side Deno functions. |
| **AI & Blockchain** | Generative AI | Google Gemini (or Groq/Fireworks) for AI insights. |
| | Solidity | Language for writing the on-chain smart contract. |
| | Ethers.js | Library for interacting with the Ethereum blockchain. |
| | Alchemy | RPC provider to connect our backend to the Sepolia testnet. |
| | MetaMask | Used for wallet management and contract deployment. |

### System Architecture
[Client/Browser] <-- (HTTPS) --> [Supabase Backend] <-- (API) --> [Third-Party Services] (React, Vite, TS) (Postgres, Auth) | +-- [Edge Function: analyze-emissions] --> [Google AI API] | +-- [Edge Function: calculate-initial-credits] --> [Google AI API] | +-- [Edge Function: execute-trade] --> [Alchemy RPC] | v [Sepolia Testnet] (Solidity Contract)

---

## 🚀 Getting Started

Follow these steps to get a local copy up and running.

### Prerequisites

* Node.js (v18+) or Bun
* [Supabase CLI](https://supabase.com/docs/guides/cli)
* [MetaMask](https://metamask.io/) browser extension
* An [Alchemy](https://www.alchemy.com/) account (for the Sepolia RPC URL)
* A [Google AI Studio](https://aistudio.google.com/) API key (or Groq/Fireworks key)

### Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/your-username/carbonflow.git](https://github.com/your-username/carbonflow.git)
    cd carbonflow
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install 
    # or
    bun install
    ```

3.  **Set up Supabase Project**
    * Sign in to your Supabase account: `supabase login`
    * Link your local project to your Supabase project: `supabase link --project-ref YOUR_PROJECT_ID`
    * Push your database schema (from `supabase/migrations`): `supabase db push`

4.  **Deploy the Smart Contract**
    * Get free test ETH from a [Sepolia Faucet](https://sepoliafaucet.com/) for your MetaMask wallet.
    * Open [Remix IDE](https://remix.ethereum.org/).
    * Paste the code from `TransactionLedger.sol` (in our chat history) into a new file.
    * Compile and deploy it to the Sepolia testnet using the "Injected Provider - MetaMask" environment.
    * Copy the **deployed contract address**.

5.  **Set up Environment Variables**

    Create a `.env.local` file in the root of your project for your frontend:
    ```.env.local
    VITE_SUPABASE_URL=httpss://YOUR_PROJECT_ID.supabase.co
    VITE_SUPABASE_ANON_KEY=YOUR_PROJECT_ANON_KEY
    ```

    Set your backend secrets securely in Supabase. **Run these commands in your terminal:**
    ```bash
    # Get your Service Role Key from Supabase Settings -> API
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

    # The API key for your AI provider
    supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY

    # Your MetaMask wallet's private key (for signing transactions)
    supabase secrets set WALLET_PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY

    # Your Alchemy HTTPS URL for Sepolia
    supabase secrets set SEPOLIA_RPC_URL=YOUR_ALCHEMY_SEPOLIA_HTTPS_URL
    ```

6.  **Update Edge Function Code**
    * Open `supabase/functions/execute-trade/index.ts`.
    * Paste the `contractAddress` you copied from Remix into the `const contractAddress` variable.

7.  **Deploy Edge Functions**
    ```bash
    # Deploy all functions in your project
    supabase functions deploy
    ```

8.  **Run the Application**
    ```bash
    npm run dev
    # or
    bun run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 👨‍💻 Author

* **Dhanush**
* GitHub: [github.com/dhanush4u2](https://www.github.com/dhanush4u2)
* LinkedIn: [linkedin.com/in/dhanushp4u2](https://www.linkedin.com/in/dhanushp4u2/)
* Portfolio: [dhanushpatyam.netlify,app](https://dhanushpatyam.netlify,app)
