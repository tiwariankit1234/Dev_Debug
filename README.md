# 🚀 DevDebug Agent

[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Express%20%7C%20MongoDB%20%7C%20Python-blue.svg)](#tech-stack)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%202.5%20%2F%203.5-orange.svg)](#features)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

**DevDebug Agent** is a full-stack, AI-powered developer platform designed to analyze, debug, execute, and translate code across multiple programming languages. By combining **static linting**, a **secure local execution sandbox**, and the reasoning capabilities of **Google Gemini models**, DevDebug Agent automatically identifies bugs, scans for security vulnerabilities, proposes optimized solutions, and generates beautifully styled PDF reviews.

---

## 🛠️ Architecture & Workflow

The platform coordinates a three-tier architecture:
1. **Frontend Dashboard**: A React single-page application featuring a Monaco Code Editor, interactive terminal, and real-time visualization of linting/AI reports.
2. **Express API Server**: Manages user authentication, saves persistent review histories in MongoDB, streams generated PDF reports, and spawns the core Python agent.
3. **Execution Sandbox & Python Agent**: A zero-dependency analyzer that runs syntax verification, executes code locally in a secure temp directory with automated timeouts, and queries the Gemini API with standard system reasoning prompts.

```mermaid
graph TD
    User([Developer]) -->|Writes Code| ReactApp[React + Monaco Editor]
    ReactApp -->|JWT Authenticated API Requests| ExpressServer[Express API Server]
    ExpressServer -->|1. Runs Static Analysis & Sandboxed Code| PythonAgent[Python Sandbox Agent]
    PythonAgent -->|2. Combines Code + Run Output + Lint Errors| GeminiAPI[Google Gemini API]
    GeminiAPI -->|3. Structured JSON Report| PythonAgent
    PythonAgent -->|4. Return Unified Results| ExpressServer
    ExpressServer -->|Store History| MongoDB[(MongoDB)]
    ExpressServer -->|Generate Report PDF| PDFKit[PDFKit Generator]
    ExpressServer -->|Send Output & Report| ReactApp
```

---

## ✨ Features

*   **🔍 AST & Static Linting**: Automatically parses Python syntax using Abstract Syntax Trees (AST), scans JavaScript for bad practices (like `eval()`), and flags unsafe C/C++ memory functions (like `gets()` or `strcpy()`).
*   **⚡ Secure Local Sandbox**: Safely runs code (Python, JavaScript, Java, C, C++) locally inside a dynamic directory with execution timeouts (5-second hard limit) to prevent runaway infinite loops or resource starvation.
*   **🤖 Gemini AI Diagnostics**: Leverages Gemini's reasoning capabilities to identify logical errors, assess performance complexity (Time/Space), scan for OWASP top-10 security flaws, and deliver a clean, drop-in replacement codebase.
*   **🌍 Multi-Language Code Translator**: Effortlessly translate code from one language to another (e.g., Python to C++ or Java to JavaScript) using specialized JSON schema prompts for translation fidelity.
*   **📄 High-Fidelity PDF Generation**: Compile any review session into a premium, styled PDF document directly from the server, featuring structured summaries, bug severity indicators, remediation guides, and formatting templates.
*   **🔒 Auth & Persistent History**: JWT-based session security with bcrypt passwords. Users can access, delete, or review their history of past code evaluations at any time.

---

## 💻 Tech Stack

### Frontend
*   **React 19 & Vite** (Single-page app framework)
*   **Monaco Editor** (Rich code editor with syntax highlighting)
*   **Lucide React** (Clean SVG icon system)
*   **Vanilla CSS** (Harmony dark mode layout, glassmorphism UI)

### Backend
*   **Node.js & Express** (Server framework)
*   **MongoDB & Mongoose** (Persistent database for reports and user auth)
*   **PDFKit** (Server-side PDF generation)
*   **JWT & BcryptJS** (Secure sessions & passwords)

### Core Analysis Agent
*   **Python 3** (Zero-dependency core runner using standard libraries: `ast`, `subprocess`, `urllib`, `shutil`)
*   **Gemini API** (Gemini 2.5 / 3.5 structured JSON responses)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your local environment:
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Python 3.x](https://www.python.org/)
*   [MongoDB](https://www.mongodb.com/try/download/community) (running locally or via MongoDB Atlas connection string)
*   *(Optional)* `g++` (for compiling/running C++ code) and `javac` (for compiling/running Java code) in your PATH.

### Installation

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/your-username/devdebug-agent.git
   cd devdebug-agent
   ```

2. Install dependencies across all modules (root, backend, and frontend) using the root script shortcut:
   ```bash
   npm run install:all
   ```

### Configuration

Create a `.env` file in the **`backend`** directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/devdebug
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
NODE_ENV=development
```

> 💡 **Gemini API Key**: You can obtain a free API key from the [Google AI Studio](https://aistudio.google.com/).

### Running the Application

You can spin up both the backend API and frontend dev server concurrently using the single root script:

```bash
npm run dev
```

*   **Frontend**: Opens at [http://localhost:5173/](http://localhost:5173/)
*   **Backend API**: Running at [http://localhost:5000/](http://localhost:5000/)

---

## 📂 Project Directory Structure

```
devdebug-agent-root/
├── package.json          # Root scripts & dependencies (concurrently)
├── agent/                # Python core agent
│   ├── analyze.py        # Static parsing, local execution sandbox, & Gemini query agent
│   └── requirements.txt  # Core dependencies notes (zero external packages required)
├── backend/              # Node.js Express Backend
│   ├── db.js             # MongoDB connection config
│   ├── authRoutes.js     # User registration and sign-in routes
│   ├── authMiddleware.js # JWT verification middleware
│   ├── models.js         # Mongoose User and Report schemas
│   ├── routes.js         # API endpoints (analysis, translation, PDF generation)
│   ├── server.js         # Main server entrypoint
│   └── .env              # Backend environment configuration
├── frontend/             # React SPA Frontend
│   ├── src/
│   │   ├── main.jsx      # Vite app entrypoint
│   │   ├── App.jsx       # Main application layout, editor, history, and dashboard
│   │   ├── App.css       # Core styles
│   │   └── index.css     # Global custom CSS design tokens
│   ├── index.html
│   └── vite.config.js    # Vite configurations
└── samples/              # Test code files for Python, JS, C++ verification
```

---

## 🧪 Running Sandbox Verification Tests

To verify that the local execution sandbox, compiler integrations, and syntax checkers are functioning correctly on your machine, run the built-in test suite:

```bash
python test_sandbox.py
```

---

## 🌐 Deployment

DevDebug Agent is configured to support a **unified production build**, where the Express backend serves the optimized React frontend.

### 📦 Frontend Production Build
Before deploying, compile the React production bundle inside the `frontend` directory:
```bash
cd frontend
npm run build
```
This compiles and bundles the static frontend files into `frontend/dist`.

---

### ☁️ Microsoft Azure Virtual Machine Deployment

You can host the application on a **Microsoft Azure Virtual Machine (VM)** (e.g., Ubuntu Server). Here is the recommended configuration workflow:

#### 1. Configure Inbound Port Rules (Azure NSG)
In your Azure Portal, select your VM's **Network Security Group (NSG)** (e.g., `DevDebug-Server-nsg`) and add an **Inbound Security Rule** to allow traffic:
*   **Source**: `Any`
*   **Source port ranges**: `*`
*   **Destination**: `Any`
*   **Destination port ranges**: `5000` (or `80` / `443` if setting up a reverse proxy)
*   **Protocol**: `TCP`
*   **Action**: `Allow`
*   **Priority**: `1000` (or next available)
*   **Name**: `Allow_DevDebug_Backend`

#### 2. Install Server Dependencies
SSH into your Azure VM and set up Node.js, Python 3, and a process manager:
```bash
# Update system repositories
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3 (required for the sandbox execution agent)
sudo apt-get install -y python3 python3-pip

# Install PM2 globally to manage and persist the server process
sudo npm install -g pm2
```

#### 3. Clone Repository & Setup Environments
Clone the codebase onto the VM and configure the environment variables:
```bash
# Clone the repository
git clone https://github.com/tiwariankit1234/Dev_Debug.git
cd Dev_Debug

# Install all workspace dependencies
npm run install:all
```

Create a `.env` file inside the `backend` directory:
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://localhost:27017/devdebug  # Or your remote MongoDB connection string
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

#### 4. Compile Assets and Run with PM2
Build the production frontend and spawn the background Node.js server process:
```bash
# Build the React frontend
npm run build --prefix frontend

# Start the Express server in the background using PM2
cd backend
pm2 start server.js --name "devdebug-server"

# Ensure the process restarts automatically on VM reboot
pm2 startup
pm2 save
```

The application will now be running on port `5000` in the background and will restart automatically if the VM restarts. You can access it using your VM's Public IP address (e.g., `http://<YOUR_VM_PUBLIC_IP>:5000`).

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

