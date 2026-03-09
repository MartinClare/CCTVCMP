# AXON Vision CMP — Edge Webhook API

This document describes the webhook endpoint that receives AI safety analysis reports from edge cameras and automatically triggers incident detection, LLM classification, and alarm evaluation.

**Live endpoint:**
```
https://cctvcmp.vercel.app/api/webhook/edge-report
```

---

## Authentication

Every request **must** include an API key in the request header:

```
x-api-key: YOUR_EDGE_API_KEY
```

The key is set via the `EDGE_API_KEY` environment variable on Vercel. Requests without a valid key return `401 Unauthorized`.

> **Setup:** Go to Vercel → your project → Settings → Environment Variables → add `EDGE_API_KEY` with a strong secret value.

---

## Endpoint

### `POST /api/webhook/edge-report`

Receives a structured safety analysis report from an edge AI camera device.

**Behaviour after receiving a report:**
1. Saves the raw report to `edge_reports` table
2. Updates the camera's `last_report_at` and marks it `online`
3. Auto-creates the camera record if it doesn't exist yet
4. Runs LLM classification in the background (via OpenRouter / Gemini)
5. Evaluates configured alarm rules and creates incidents if triggered
6. Dispatches notifications if notification channels are configured
7. Returns `202 Accepted` immediately — the edge device is not blocked

---

## Request

**Headers:**

| Header | Required | Value |
|---|---|---|
| `Content-Type` | ✅ | `application/json` |
| `x-api-key` | ✅ | Your `EDGE_API_KEY` value |

**Body schema:**

```json
{
  "edgeCameraId": "string",
  "cameraName": "string",
  "timestamp": "ISO 8601 datetime string",
  "analysis": {
    "overallDescription": "string",
    "overallRiskLevel": "Low | Medium | High",
    "constructionSafety": {
      "summary": "string",
      "issues": ["string"],
      "recommendations": ["string"]
    },
    "fireSafety": {
      "summary": "string",
      "issues": ["string"],
      "recommendations": ["string"]
    },
    "propertySecurity": {
      "summary": "string",
      "issues": ["string"],
      "recommendations": ["string"]
    },
    "peopleCount": 0,
    "missingHardhats": 0,
    "missingVests": 0
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `edgeCameraId` | string | ✅ | Unique ID of the edge camera. Used to match or auto-create the camera record |
| `cameraName` | string | ✅ | Human-readable camera label |
| `timestamp` | string | ✅ | ISO 8601 datetime when the analysis was captured |
| `analysis.overallDescription` | string | ✅ | Natural language summary of the scene |
| `analysis.overallRiskLevel` | `Low\|Medium\|High` | ✅ | Overall risk level assessed by the edge AI |
| `analysis.constructionSafety.summary` | string | ✅ | Summary of construction safety observations |
| `analysis.constructionSafety.issues` | string[] | ✅ | List of detected construction safety issues |
| `analysis.constructionSafety.recommendations` | string[] | ✅ | Recommended actions for construction safety |
| `analysis.fireSafety.summary` | string | ✅ | Summary of fire safety observations |
| `analysis.fireSafety.issues` | string[] | ✅ | List of fire/smoke related issues detected |
| `analysis.fireSafety.recommendations` | string[] | ✅ | Recommended actions for fire safety |
| `analysis.propertySecurity.summary` | string | ✅ | Summary of security observations |
| `analysis.propertySecurity.issues` | string[] | ✅ | Detected security issues (intrusion, trespass, etc.) |
| `analysis.propertySecurity.recommendations` | string[] | ✅ | Recommended security actions |
| `analysis.peopleCount` | number | ❌ | Total number of people in frame |
| `analysis.missingHardhats` | number | ❌ | Number of people without a hardhat |
| `analysis.missingVests` | number | ❌ | Number of people without a safety vest |

---

## Example Request

```bash
curl -X POST https://cctvcmp.vercel.app/api/webhook/edge-report \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_EDGE_API_KEY" \
  -d '{
    "edgeCameraId": "site-a-cam-01",
    "cameraName": "Gate North Cam",
    "timestamp": "2026-03-08T10:30:00Z",
    "analysis": {
      "overallDescription": "3 workers detected near excavation. One worker missing hardhat. No fire hazards observed.",
      "overallRiskLevel": "High",
      "constructionSafety": {
        "summary": "PPE non-compliance detected",
        "issues": ["Worker missing hardhat near excavation zone"],
        "recommendations": ["Enforce hardhat policy", "Post safety signage at zone entry"]
      },
      "fireSafety": {
        "summary": "No fire hazards observed",
        "issues": [],
        "recommendations": []
      },
      "propertySecurity": {
        "summary": "Authorised personnel only",
        "issues": [],
        "recommendations": []
      },
      "peopleCount": 3,
      "missingHardhats": 1,
      "missingVests": 0
    }
  }'
```

---

## Response

### `202 Accepted` — Success

```json
{
  "reportId": "clxyz1234...",
  "status": "accepted"
}
```

The report has been saved. Classification and alarm evaluation run asynchronously in the background.

### `401 Unauthorized`

```json
{ "message": "Unauthorized" }
```

Missing or incorrect `x-api-key` header.

### `400 Bad Request`

```json
{ "message": { "fieldErrors": { ... }, "formErrors": [] } }
```

Payload failed schema validation. Check the `fieldErrors` for which fields are missing or invalid.

---

## How Classification Works

After saving the report, the system runs a **hybrid classifier**:

### Step 1 — Numeric PPE check (always runs)
- If `missingHardhats > 0` or `missingVests > 0` → `ppe_violation` is immediately flagged with `confidence: 1.0`
- This does not require an LLM

### Step 2 — LLM classification (requires `OPENROUTER_API_KEY`)
- Sends the analysis to **Google Gemini 2.0 Flash** via OpenRouter
- Classifies all 8 incident types based on natural language descriptions
- If no API key is set, falls back to keyword matching

### Step 3 — Fallback keyword classifier
- Runs if LLM is unavailable
- Scans `issues` arrays for known keywords per incident type

### Incident types classified

| Type | Trigger signal |
|---|---|
| `ppe_violation` | `missingHardhats` or `missingVests` > 0 |
| `fall_risk` | Issues containing: fall, height, scaffold, ladder, guardrail |
| `fire_detected` | Issues containing: active fire, flame, burning, blaze |
| `smoke_detected` | Issues containing: visible smoke, smoldering |
| `restricted_zone_entry` | Issues containing: intrusion, unauthorized, trespass |
| `machinery_hazard` | Issues containing: crane, forklift, excavator, heavy equipment |
| `smoking` | Issues containing: smoking, cigarette, tobacco |
| `near_miss` | Detected by LLM from context |

---

## Alarm Rules

Incidents are only created when an alarm rule is configured for that incident type. Default rules are seeded automatically on first use.

Rules can be configured at:  
**`https://cctvcmp.vercel.app/settings`** → Alarm Rules tab

| Rule setting | Description |
|---|---|
| `minRiskLevel` | Minimum risk level to trigger the alarm |
| `minConfidence` | Minimum classifier confidence (0.0–1.0) |
| `consecutiveHits` | Number of consecutive detections before triggering |
| `dedupMinutes` | Minutes to wait before re-triggering the same incident type |
| `recordOnly` | If true, saves the incident but does not raise an alert |

---

## Camera Auto-Registration

If `edgeCameraId` is not found in the database, the system **automatically creates** the camera record and assigns it to:
- The first available project (or creates "Edge Site" if none exists)
- The first available zone (or creates "Default" zone if none exists)

To pre-assign a camera to a specific project and zone, create the camera record manually via `POST /api/edge-devices` before the first report arrives.

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret for user sessions |
| `EDGE_API_KEY` | Secret key required by all edge camera devices |
| `OPENROUTER_API_KEY` | *(Optional)* OpenRouter API key for LLM classification |

Set all variables in **Vercel → Settings → Environment Variables**, then redeploy.

---

## Testing the Webhook Locally

```bash
# Start the dev server (runs on port 3002)
npm run dev

# Send a test report
curl -X POST http://localhost:3002/api/webhook/edge-report \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_EDGE_API_KEY" \
  -d '{
    "edgeCameraId": "test-cam-01",
    "cameraName": "Test Camera",
    "timestamp": "2026-03-08T10:00:00Z",
    "analysis": {
      "overallDescription": "Smoke detected near storage area",
      "overallRiskLevel": "High",
      "constructionSafety": { "summary": "No issues", "issues": [], "recommendations": [] },
      "fireSafety": { "summary": "Visible smoke near storage", "issues": ["visible smoke near storage area"], "recommendations": ["Investigate immediately"] },
      "propertySecurity": { "summary": "No issues", "issues": [], "recommendations": [] },
      "peopleCount": 1,
      "missingHardhats": 0,
      "missingVests": 0
    }
  }'
```

Expected response:
```json
{ "reportId": "clxyz...", "status": "accepted" }
```

Then check the dashboard at `http://localhost:3002/dashboard` to see the new incident.
