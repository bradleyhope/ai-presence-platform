# AI Presence Platform - Setup Guide

This guide will help you set up and run the AI Presence Platform in a new environment.

## Overview

The AI Presence Platform monitors how clients and individuals appear across AI platforms like ChatGPT, Perplexity, Gemini, Claude, and Grok. It provides audits, reports, and monitoring capabilities.

## Prerequisites

- Node.js 22+ and pnpm
- MySQL 8.0+
- GitHub CLI (gh) for cloning the repository

## Quick Start Instructions

### Step 1: Clone the Repository

```bash
cd /home/ubuntu
gh repo clone bradleyhope/ai-presence-platform
cd ai-presence-platform
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Set Up MySQL Database

```bash
# Install MySQL if not already installed
sudo apt-get update && sudo apt-get install -y mysql-server

# Start MySQL service
sudo service mysql start

# Create database and user
sudo mysql -e "CREATE DATABASE IF NOT EXISTS ai_presence;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'aiuser'@'localhost' IDENTIFIED BY 'aipassword123';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ai_presence.* TO 'aiuser'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Create default agency (required for entity creation)
sudo mysql -e "USE ai_presence; INSERT INTO agencies (name, slug, email, planTier, maxEntities, status) VALUES ('Demo Agency', 'demo-agency', 'demo@agency.local', 'standard', 100, 'active');"
```

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=mysql://aiuser:aipassword123@localhost:3306/ai_presence

# Security
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE

# Application Configuration
VITE_APP_ID=YOUR_APP_ID_HERE
VITE_APP_TITLE=AI Presence Platform
VITE_APP_LOGO=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
NODE_ENV=development

# OAuth Configuration (Optional - leave empty for demo mode)
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=

# Forge API Configuration
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=

# AI API Keys (Add your keys here)
OPENAI_API_KEY=
SONAR_API_KEY=
GEMINI_API_KEY=
CLAUDE_API_KEY=
ANTHROPIC_API_KEY=
XAI_API_KEY=

# AWS S3 Configuration (Optional)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# AWS_S3_BUCKET=
EOF
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

**Generate App ID:**
```bash
python3 -c "import uuid; print(str(uuid.uuid4()))"
```

### Step 5: Run Database Migrations

```bash
pnpm db:push
```

### Step 6: Build the Application

```bash
pnpm build
```

### Step 7: Start the Server

**Development mode:**
```bash
pnpm dev
```

**Production mode:**
```bash
NODE_ENV=production pnpm start
```

The server will start on `http://localhost:3000`

### Step 8: Expose the Port (for Manus sandbox)

If running in a Manus sandbox, expose port 3000 to get a public URL.

## Demo Mode (No OAuth)

The application has been modified to support demo mode when OAuth is not configured:

- **Frontend**: Returns `#` for login URL when `VITE_OAUTH_PORTAL_URL` is empty
- **Backend**: Automatically creates and authenticates a "Demo User" when `OAUTH_SERVER_URL` is empty

This allows you to test the application without setting up OAuth infrastructure.

## Key Features

1. **Entities Management** - Add and manage clients/individuals to monitor
2. **Audits** - Run AI presence audits across multiple platforms
3. **Reports** - Generate PDF reports with audit results
4. **Monitoring** - Enable automated monitoring for entities
5. **Analytics** - View insights on AI presence

## Database Schema

The application uses the following main tables:

- `users` - User accounts
- `agencies` - PR/communications agencies
- `entities` - Clients being monitored
- `audits` - AI presence audit records
- `queries` - Individual queries within audits
- `reports` - Generated PDF reports
- `alerts` - Monitoring alerts

## Troubleshooting

### Entity Creation Fails

**Error**: `Foreign key constraint fails`

**Solution**: Ensure a default agency exists:
```bash
sudo mysql -e "USE ai_presence; INSERT INTO agencies (name, slug, email, planTier, maxEntities, status) VALUES ('Demo Agency', 'demo-agency', 'demo@agency.local', 'standard', 100, 'active');"
```

### OAuth Errors

**Error**: `OAUTH_SERVER_URL is not configured`

**Solution**: This is expected in demo mode. The application will work without OAuth by creating a demo user automatically.

### Database Connection Issues

**Error**: `Can't connect to MySQL server`

**Solution**: 
```bash
sudo service mysql start
```

## API Keys Setup

To use the AI audit features, you'll need API keys for:

- **OpenAI** (ChatGPT) - https://platform.openai.com/api-keys
- **Perplexity** (Sonar) - https://www.perplexity.ai/settings/api
- **Google Gemini** - https://ai.google.dev/
- **Anthropic** (Claude) - https://console.anthropic.com/
- **xAI** (Grok) - https://x.ai/api

Add these to your `.env` file.

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper OAuth server URLs
3. Use a production-grade database
4. Set up proper SSL/TLS certificates
5. Configure environment variables through your hosting platform
6. Set up proper backup and monitoring

## Support

For issues or questions, refer to the main repository or documentation.
