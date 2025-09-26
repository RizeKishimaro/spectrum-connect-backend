
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img-shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img-shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img-shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>

# NestJS Communication Gateway & Predictive Dialer

This is a **NestJS** application designed to serve as a robust **Communication Gateway and Predictive Dialer**. It manages user data, VoIP/Telephony operations (via Asterisk), CRM activities, and various SMS messaging protocols.

***

## ⚙️ System Architecture Overview

The system is structured around managing communication-centric data and orchestrating real-time telephony processes.

### 1. Data Model (Schema Overview)

The database schema is centered around the **SystemCompany** which acts as the main tenant for most data.

| Entity | Purpose | Key Relationships |
| :--- | :--- | :--- |
| **SystemCompany** | Main tenancy object. Links to almost all other data. | User, Agent, Settings, SIPProvider, CRMEads, DIDNumbers, etc. |
| **User** | System user authentication and subscription data. | SystemCompany, Subscription. |
| **Agent** | Represents a telephony agent (e.g., call center staff). | SystemCompany, User, CallLog, AgentInformation. |
| **SIPProvider** | Configuration for VoIP/SIP trunk providers. | SIPEndpoints, RTPAddress, SIPProviderConfig. |
| **CallLog/ParkedCall** | Records of call history and currently parked calls. | Agent, SystemCompany. |
| **CRMEads / CRMAppointment** | Customer relationship management data. | SystemCompany, Services, CRMAppointmentStatus, CompanyMembers. |
| **IVRTree / IvrFiles** | Defines Interactive Voice Response (IVR) flows. | SystemCompany. |

### 2. Predictive Dialer Functionality

The core telephony logic resides within the `DialerService`, which acts as the central orchestrator for predictive and outbound calling.

#### A. Core Components and Interaction

| Component | Function | Interactions |
| :--- | :--- | :--- |
| **DialerService (NestJS)** | The central service for initiating and managing calls (the main application logic). | All other services (Prisma, ARI Client, AMI Provider, etc.). |
| **ARI Client (Asterisk)** | Handles real-time communication and application control via the **Asterisk REST Interface**. | Receives real-time events like `StasisStart`, `ChannelStateChange`, `ChannelDestroyed`, and `DTMFReceived`. |
| **AMI Provider (Asterisk)** | Used for general server commands and control via the **Asterisk Manager Interface**. | Used by `DialerService` for non-channel-specific commands. |
| **PrismaService** | The ORM (Object-Relational Mapper) layer for database interaction. | Manages persistence for `CallLog`, `Agent`, `CRMEads`, and `Settings`. |
| **WsGatewayGateway** | A WebSocket gateway to communicate real-time events to the frontend clients. | Emits real-time dialer events (`emit(dialer:*)`) to agents/users. |

#### B. How a Call Works (High-Level Flow)

1.  **Initiation:** The `DialerService` decides which **`CRMEads`** to call next, based on system **`Settings`** and available **`Agent`** capacity.
2.  **Dialing:** The `DialerService` instructs the **ARI Client** to originate a new call to the lead's number.
3.  **Real-time Events:**
    * The **ARI Client** receives a **`StasisStart`** event when the channel is created and enters the application, triggering logic in the `DialerService`.
    * The client receives **`ChannelStateChange`** and **`ChannelDestroyed`** events, allowing the `DialerService` to track the call progress (ringing, answered, hung up).
    * If an IVR or prompt is played, **`DTMFReceived`** events are handled for user input.
4.  **Data Logging & Update:** Throughout the call process, the **`PrismaService`** is used to:
    * Create and update **`CallLog`** records.
    * Update the status of the respective **`CRMEads`**.
    * Update the state of the **`Agent`** (e.g., from *idle* to *on-call*).
5.  **Frontend Updates:** The **`WsGatewayGateway`** emits events back to the frontend to instantly update the UI for agents and supervisors with call status, agent state, and lead information.

***

## 🚀 Project Setup

### Prerequisites

You need to have **Node.js** (LTS recommended) and **npm** installed on your system.

### 1. Installation

Install all project dependencies:

```bash
$ npm install
````

### 2\. Environment Configuration (Dotenv)

This project relies on environment variables for configuration. You need to create a file named **`.env`** in the root directory and populate it with the required values.

  * **Security Note:** **DO NOT** commit your actual `.env` file to version control (Git). Use a placeholder file like `.env.example` if needed.

#### `.env` File Template:

Copy the following structure into your newly created `.env` file and replace the bracketed placeholders (`<...>`) with your actual service credentials and configuration settings.

```dotenv
# Database
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>?schema=public"

# JWT
JWT_SECRET=<your_jwt_secret_here>

# Asterisk AMI
AMI_USERNAME=<ami_username>
AMI_SECRET=<ami_password>
AMI_PORT=5038
AMI_HOST=localhost

# Asterisk ARI
ARI_URL=[http://127.0.0.1:8088/ari](http://127.0.0.1:8088/ari)
ARI_USERNAME=<ari_username>
ARI_PASSWORD=<ari_password>
ARI_APP=dialer-app

# CORS / Frontend URLs
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001

# SMS Providers
# Limitless
SMS_API_URL=http://localhost:8000/sms/limitless/test
SMS_API_KEY=<limitless_api_key>

# Teliqon
TELIQON_SMS_API_URL=http://localhost:8000/sms/teliqon/test
TELIQON_SMS_API_USERNAME=<teliqon_username>
TELIQIN_SMS_API_PASSWORD=<teliqon_password>
TELIQON_SMS_API_KEY=<teliqon_api_key>

# CommPeak
COMMPEAK_SMS_API_URL=[https://sendsms.commpeak.com/simple_send/](https://sendsms.commpeak.com/simple_send/)
COMMPEAK_SMS_API_KEY=<commpeak_api_key>

# Topying
TOPYING_SMS_API_URL=http://<ip>:20003
TOPYING_SMS_API_USERNAME=<topying_username>
TOPYING_SMS_API_PASSWORD=<topying_password>

# Server
PORT=8000

# SMPP
SMPP_URL=smpp://127.0.0.1:2775
SMPP_USERNAME=<smpp_username>
SMPP_PASSWORD=<smpp_password>

# Optional wholesale/test accounts
SMPP_WHOLESALE_USERNAME=<smpp_wholesale_username>
SMPP_WHOLESALE_PASSWORD=<smpp_wholesale_password>

SMPP_SIMBOX_USERNAME=<smpp_simbox_username>
SMPP_SIMBOX_PASSWORD=<smpp_simbox_password>
```

-----

## ▶️ Running the Application

### Compile and run the project

| Mode | Command | Description |
| :--- | :--- | :--- |
| **Development** | `$ npm run start` | Compiles and runs the application once. |
| **Watch Mode** | `$ npm run start:dev` | Compiles and runs in watch mode, restarting on file changes. **Recommended for development.** |
| **Production** | `$ npm run start:prod` | Compiles the project and runs the production build. |

-----

## 🧪 Running Tests

| Test Type | Command | Description |
| :--- | :--- | :--- |
| **Unit Tests** | `$ npm run test` | Executes standard unit tests. |
| **E2E Tests** | `$ npm run test:e2e` | Executes end-to-end tests, requiring the server to be running or mocked. |
| **Test Coverage** | `$ npm run test:cov` | Runs all tests and generates a test coverage report. |

-----

## ☁️ Deployment

For detailed deployment strategies, refer to the **[deployment documentation](https://docs.nestjs.com/deployment)**.

You can also use the official platform, **Mau**, for simplified AWS deployments:

```bash
$npm install -g mau$ mau deploy
```

-----

## 📄 License

Nest is **MIT licensed**.

```
```
