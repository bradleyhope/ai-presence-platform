# AI Presence Platform - MVP Todo List

## Phase 1: Database Schema & Models
- [x] Adapt database schema from planning docs to MySQL/Drizzle
- [x] Create agencies table
- [x] Create entities table
- [x] Create audits table
- [x] Create queries table
- [x] Create alerts table (monitoring alerts)
- [x] Create reports table
- [x] Push schema to database

## Phase 2: Core Data Layer
- [x] Create database helper functions in server/db.ts
- [x] Add entity CRUD operations
- [x] Add audit CRUD operations
- [x] Add query operations
- [x] Add response storage/retrieval
- [x] Add report operations

## Phase 3: tRPC API Procedures
- [x] Create entities router (list, create, update, delete)
- [x] Create audits router (create, get, list, getResponses)
- [x] Create reports router (generate, list, download)
- [ ] Create monitoring router (list alerts, get schedule)
- [x] Add proper authorization checks
- [x] Add input validation with Zod

## Phase 4: AI Query Engine
- [x] Create AI query service using built-in LLM helper
- [x] Implement ChatGPT query function
- [x] Implement Gemini query function (using GEMINI_API_KEY secret)
- [x] Implement Claude query function (using ANTHROPIC_API_KEY secret)
- [x] Implement Perplexity query function (using SONAR_API_KEY secret)
- [x] Add response parsing and citation extraction
- [x] Add error handling and retry logic
- [x] Store responses in database
- [x] Add executeQueries endpoint to audits router
- [x] Seed database with demo agency

## Phase 5: Dashboard UI
- [x] Set up DashboardLayout with navigation
- [x] Create Home/Dashboard page with stats
- [x] Create Entities list page
- [x] Create Entity detail/edit page
- [x] Create New Entity modal/form
- [x] Create Audits list page
- [x] Create New Audit form
- [x] Create Audit Results page with tabs (Overview, Responses, Sources, Analysis)
- [x] Add loading states and error handling
- [x] Create Reports list page

## Phase 6: Monitoring & Alerts
- [ ] Create monitoring service
- [ ] Add scheduled audit logic
- [ ] Implement change detection
- [ ] Create alerts display
- [ ] Add monitoring enable/disable toggle

## Phase 7: Report Generation
- [ ] Create report generation service
- [ ] Design PDF report template
- [ ] Implement report generation with agency branding
- [ ] Store reports in S3 using built-in storage
- [ ] Add report download functionality
- [ ] Create Reports list page

## Phase 8: Settings & Admin
- [ ] Create Settings page
- [ ] Add agency info management
- [ ] Add white-label branding settings
- [ ] Add user management (if needed)

## Phase 9: Testing & Polish
- [ ] Test complete audit flow
- [ ] Test monitoring and alerts
- [ ] Test report generation
- [ ] Add proper error messages
- [ ] Improve loading states
- [ ] Mobile responsiveness check

## Phase 10: Deployment
- [ ] Create checkpoint
- [ ] Test in preview environment
- [ ] Deploy to production
- [ ] Create documentation
- [ ] Handoff to Tancredi

## Known Limitations & Adaptations
- Using MySQL instead of PostgreSQL (Manus template default)
- Using single database instead of PostgreSQL + MongoDB split
- Using tRPC instead of REST API
- Using Manus built-in LLM instead of separate Python service
- Simplified architecture but same MVP features


## Grok Integration (New Feature)
- [x] Add Grok query function to AI service
- [x] Update database schema to include 'grok' platform enum
- [x] Update frontend UI to include Grok checkbox
- [x] Update AuditDetail tabs to include Grok
- [x] Test Grok integration with XAI_API_KEY


## Use User's OpenAI API Key
- [x] Update ChatGPT query function to use OpenAI API directly
- [x] Remove dependency on built-in Manus LLM helper for ChatGPT
- [x] Add OPENAI_API_KEY to required secrets


## Bug Fixes
- [x] Improve query generation to be more natural and entity-specific
- [x] Fix Anthropic Claude API integration (use x-api-key header)
- [x] Update Claude to use latest model (claude-sonnet-4-20250514)
