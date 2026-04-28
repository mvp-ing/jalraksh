# JalRaksh

> **जलरक्ष** — _Protecting Water, Preserving Life_

An intelligent water pollution monitoring and root cause analysis system powered by **AI Agents**, **Machine Learning**, and **Quantum Computing**.

---

## Problem Statement

Water pollution remains one of the most critical environmental challenges, with pollution spikes often going undetected until significant damage has occurred. Traditional monitoring systems can detect _when_ pollution levels rise, but struggle to identify _why_ — the root causes behind these spikes.

### Key Challenges

- **Delayed Detection**: Pollution spikes are often identified too late for effective intervention
- **Complex Causality**: Multiple factors (industrial discharge, agricultural runoff, sewage overflow, natural events) can contribute to pollution events
- **Data Overload**: IoT sensors generate massive amounts of data that are difficult to analyze in real-time
- **Non-linear Patterns**: Pollution dynamics involve complex, non-linear relationships that traditional models struggle to capture

---

## Proposed Solution

JalRaksh employs an **agentic AI architecture** that combines the strengths of Machine Learning and Quantum Computing to:

1. **Detect** pollution spikes in real-time from sensor data
2. **Analyze** patterns and correlations across multiple data sources
3. **Identify** potential root causes using causal inference
4. **Recommend** intervention strategies to authorities

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        JalRaksh System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   Sensor     │    │   Satellite  │    │  Historical  │     │
│   │    Data      │    │   Imagery    │    │    Data      │     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│          │                   │                   │              │
│          └───────────────────┼───────────────────┘              │
│                              ▼                                  │
│                    ┌─────────────────┐                          │
│                    │  Data Ingestion │                          │
│                    │      Agent      │                          │
│                    └────────┬────────┘                          │
│                             ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   Agent Orchestrator                     │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │                                                         │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│   │  │  Anomaly    │  │   Causal    │  │  Quantum    │     │   │
│   │  │  Detection  │  │  Inference  │  │  Analysis   │     │   │
│   │  │   Agent     │  │   Agent     │  │   Agent     │     │   │
│   │  │    (ML)     │  │    (ML)     │  │  (Quantum)  │     │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   Root Cause    │                          │
│                    │    Analysis     │                          │
│                    └────────┬────────┘                          │
│                             ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   Alerts &      │                          │
│                    │   Dashboard     │                          │
│                    └─────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component     | Technology                                                   |
| ------------- | ------------------------------------------------------------ |
| **AI Agents** | LangChain / AutoGen based multi-agent system                 |
| **ML Models** | Anomaly detection, Time-series forecasting, Causal inference |
| **Quantum**   | Quantum optimization for complex pattern recognition         |
| **Data**      | Real-time sensor streams, Satellite imagery, Weather data    |

---

## Implementation Details

### Frontend Initialization Flow

On app startup, the frontend initializes map state, optional cloud map loading, AI assistant settings, and demo datasets through a single mount-time effect in `jalrakshak/src/frontend/src/app.jsx`.

Initialization sequence:

1. Resolve map source from URL parameters (`provider`, `id`, `mapUrl`)
2. Parse share-link state (segment and map view) when present
3. Apply a default map camera centered on Delhi/Yamuna when no share state is found
4. Configure AI assistant provider and model from environment-backed config
5. Load pre-seeded pollution demo datasets and map layer config
6. Programmatically set up the time animation filter for the timestamp field

### Data Loading and Layer Setup

- Sample data is loaded via `loadAllSampleData()` from `data/sample-data`
- The returned `datasets`, `config`, and `options` are passed through `addDataToMap(...)`
- After data load, a time filter is attached to `pollution_segments`
- The filter is configured as an animated timestamp window using:
  - `addFilter(...)`
  - `setFilter(...)`
  - `setFilterAnimationTime(...)`

This explicit filter setup ensures the animation window initializes correctly across startup scenarios.

### Share URL and Segment Focus

The app supports shareable links parsed through utilities in `utils/share-url`.

- If full map state is present, camera parameters are restored
- If only segment ID is present, the app zooms to known segment coordinates
- If neither is available, the app falls back to the default city-level view

This behavior keeps shared investigation links reproducible during demos.

### AI Assistant Integration

- AI assistant configuration is dispatched using `updateAiAssistantConfig(...)`
- Current default provider is Google with model `gemini-2.5-flash`
- API key is read from environment configuration (`GoogleAIApiKey` in `.env`)
- Assistant panel is rendered as a resizable side panel (`AiAssistantPanel`)

### Map Boundary + Context Synchronization

When users pan/zoom the map, `onViewStateChange` computes current viewport bounds through `WebMercatorViewport` and dispatches `setMapBoundary(...)`.

This keeps assistant context synchronized with the visible map region for boundary-aware data interactions.

### UI Layout Composition

- Main map canvas and assistant panel are arranged with `react-resizable-panels`
- SQL panel (DuckDB plugin) opens conditionally when enabled
- Screen capture hooks are wired through `ScreenshotWrapper` for assistant workflows

---

## Key Features

- Real-time pollution spike detection from sensor-style time-series data
- Root cause hints using pattern and correlation analysis
- Multi-agent architecture for ingestion, anomaly analysis, and inference
- Frontend dashboard for visual exploration and assistant-led interaction

---

## Repository Structure

- `jalrakshak/src/frontend/` - React-based frontend application
- `README.md` - project overview, architecture, and setup notes

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm 9+ (or compatible package manager)

### Run Frontend Locally

1. Go to the frontend directory:
   `cd jalrakshak/src/frontend`
2. Install dependencies:
   `npm install`
3. Start the development server:
   `npm run dev`
4. Open the local URL shown in the terminal.

---

## Demo Data Behavior

- Users can search by river name
- The app loads pre-defined segment-level information for supported rivers
- Visuals and AI assistant responses are driven by this seeded dataset
- Designed for reliable offline/demo use during hackathon judging

---

## Next Steps

- Add additional river segments and historical windows
- Integrate backend APIs after demo phase
- Add alert explainability notes for non-technical users
- Add tests for data loading, search flows, and assistant responses

---

## License

This project is currently developed as part of a hackathon submission. Add your preferred license before public distribution.