# Lumina AI Studio: Architecture & Development Plan

## 1. System Architecture Diagram

```mermaid
graph TD
    Client[Web Client (React/Next.js)]
    CDN[CDN (Cloudfront/Vercel Edge)]
    API[Backend API (Node.js/NestJS)]
    Queue[Job Queue (Redis/Bull)]
    Storage[Object Storage (S3/GCS)]
    Auth[Auth Provider (Clerk/Auth0)]
    DB[(Database - PostgreSQL)]
    
    subgraph "AI Core"
        Gemini[Gemini API 2.5]
        CustomModel[Custom Python Service (TorchServe)]
    end

    Client -- HTTPS --> CDN
    CDN --> Client
    Client -- API Req --> API
    API -- Auth Check --> Auth
    API -- Upload --> Storage
    API -- Job --> Queue
    Queue -- Process --> CustomModel
    Queue -- Process --> Gemini
    CustomModel -- Result --> Storage
    Gemini -- Result --> Storage
    API -- Read --> DB
```

## 2. Development Roadmap (MVP -> Scale)

### Phase 1: MVP (Current Build)
- **Core:** React Frontend + Client-side logic.
- **AI:** Direct integration with Gemini 2.5 Flash Image API.
- **Features:** Upload, Magic Edit (Prompt), Background Removal (Simulated), Download.
- **Storage:** Ephemeral (Browser memory/Base64).

### Phase 2: Professional SaaS (Months 2-3)
- **Backend:** NestJS implementation.
- **Auth:** User accounts, saved history.
- **Payments:** Stripe integration for credit purchase.
- **Storage:** AWS S3 for persistent image hosting.
- **Optimization:** Image compression pipeline (Sharp.js).

### Phase 3: Scaling & Enterprise (Months 4-6)
- **Dedicated GPU Clusters:** Deploy Stable Diffusion / Segment Anything models on AWS EC2 G5 instances for lower latency and cost control on high volume.
- **API Access:** Expose public API for developers.
- **Teams:** Collaborative workspaces.

## 3. Backend Endpoint Examples (NestJS Style)

```typescript
// POST /api/v1/process
{
  "taskId": "uuid",
  "status": "QUEUED",
  "eta": 5 // seconds
}

// GET /api/v1/tasks/:id
{
  "status": "COMPLETED",
  "resultUrl": "https://s3.aws.com/bucket/result.png",
  "creditsDeducted": 1
}
```

## 4. AI Strategy & Model Selection
- **Gemini 2.5 Flash Image:** Best for "Instruction-based editing" (e.g., "Make it sunset", "Add a cat"). Low latency, reasonable cost.
- **RMBG-1.4 / MODNet:** Best for pure background removal. Run locally on GPU server for zero-cost per inference after hardware.
- **Real-ESRGAN:** Best for Upscaling.

## 5. Security & Performance
- **Rate Limiting:** Redis-based sliding window limiter.
- **Size Limits:** Max 25MB upload.
- **Watermarking:** Applied dynamically via Sharp.js overlay for Free users.
