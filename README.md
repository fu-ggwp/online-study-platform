# Smart Quiz Platform

A web-based platform that helps teachers create classes, manage question banks and study sets, and lets learners practice and take exams with AI-assisted support.

## Tech Stack

- Backend: Node.js, Express.js
- Frontend: Next.js (React)
- Database: Supabase (PostgreSQL)
- Other: Swagger/OpenAPI for API docs

## Project Structure

```
smart-quiz-platform/
├── client/        # Next.js frontend
├── server/        # Express.js backend (feature-folder architecture)
├── docs/          # Documentation
├── plans/         # Planning documents
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Supabase account/project

### Installation

```
git clone https://github.com/fu-ggwp/smart-quiz-platform.git
cd smart-quiz-platform
npm install
```

### Environment Variables

Create a .env file in server/ with your Supabase credentials:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=5000
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

For PayOS premium upgrades, add these backend variables in `server/.env`:

```
PAYMENT_PROVIDER=payos
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
PAYOS_CLIENT_ID=your-payos-client-id
PAYOS_API_KEY=your-payos-api-key
PAYOS_CHECKSUM_KEY=your-payos-checksum-key
PAYOS_RETURN_URL=http://localhost:3000/upgrade/result
PAYOS_CANCEL_URL=http://localhost:3000/upgrade/result
```

Set the PayOS dashboard webhook URL to your deployed backend endpoint:

```
https://your-api-domain.com/api/payments/payos/webhook
```

For the frontend, create `client/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
### Running the project

# Backend

```
cd server
npm run dev
```

# Frontend

```
cd client
npm run dev
```

## API Documentation

Once the server is running, API docs are available at:

```
http://localhost:5000/api-docs
```

## SonarQube

This repository includes a local SonarQube setup for code quality analysis.

### Prerequisites

- Docker Desktop or Docker Engine with Docker Compose
- Node.js and npm

### Start SonarQube locally

From the repository root:

```
npm run sonar:up
```

Open:

```
http://localhost:9000
```

The first login is:

```
Username: admin
Password: admin
```

SonarQube will ask you to change the password. After logging in, create a project with this key:

```
smart-quiz-platform
```

Then create a user token in SonarQube and set it in your terminal.

PowerShell:

```
$env:SONAR_TOKEN="your-sonarqube-token"
```

If PowerShell blocks `npm` scripts because of the execution policy, run the npm commands with `npm.cmd` instead. For example:

```
npm.cmd run sonar:scan
```

Command Prompt:

```
set SONAR_TOKEN=your-sonarqube-token
```

macOS/Linux:

```
export SONAR_TOKEN="your-sonarqube-token"
```

### Run analysis

From the repository root:

```
npm run sonar:scan
```

The scanner uses `sonar-project.properties` and analyzes `client/src`, `server/src`, and `server/index.js`.

If you later add tests with coverage, generate LCOV before scanning. SonarQube is already configured to read:

```
coverage/lcov.info
client/coverage/lcov.info
server/coverage/lcov.info
```

### Stop SonarQube

```
npm run sonar:down
```

## Team

Developed by Group fu-ggwp — FPT University SWP391 project.

## License

This project is for educational purposes (FPT University coursework).
