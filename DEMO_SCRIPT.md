# Research Swarm — Hackathon Demo Video Script & Recording Guide

**Target Length:** 60–90 seconds  
**Target Audience:** Hackathon Judges (Google Cloud + Gemini "All Things Agentic")

---

## 🎬 Shot-by-Shot Recording Script

### 0:00–0:08 — Cold Open
- **Screen:** Research Swarm landing page ([`http://localhost:3000`](http://localhost:3000)) — full view, let it breathe for 2 seconds before speaking.
- **Voiceover:** *"Most AI agents answer in seconds. This one runs for hours."*

### 0:08–0:20 — Live Question Intake (The "Walk Away" Moment)
- **Action:** Select destination workspace, click **Deep (8+)** mode toggle, click sample prompt: *"How is the EU AI Act going to affect small AI startups?"*, hit Submit.
- **Voiceover:** *"I'll ask Research Swarm something genuinely hard — not a quick lookup, a broad research question. I hit submit... and that's it. I can close this tab right now."*

### 0:20–0:35 — Swarm Deployment & Telemetry
- **Screen:** Cut to active job page (`/jobs/:id`). Highlight real-time telemetry stream as Coordinator decomposes question into sub-questions and worker agents spin up in parallel.
- **Voiceover:** *"Behind the scenes, a Coordinator agent just broke that question into six independent sub-questions, and deployed a fleet of worker agents to investigate them in parallel — each one searching, reading sources, and reporting back."*

### 0:35–0:50 — The Re-Planner "Wow Moment"
- **Screen:** Hover over or zoom in on the moment a NEW task appears mid-run, dynamically spawned by the Coordinator re-planner based on worker findings.
- **Voiceover:** *"This is the part that makes it a real agent, not a fixed pipeline — the Coordinator is watching what its own workers find, and just spawned a follow-up sub-question on its own, because one worker surfaced something the original plan didn't anticipate."*

### 0:50–1:00 — Distributed Systems Hardening & Resilience Proof
- **Screen:** Point to `[duplicate_skipped]` dedup log, circuit breaker trip, or execution timeline showing retried tasks completing cleanly.
- **Voiceover:** *"And it's built to survive failure — duplicate messages get deduplicated, a struggling API trips a circuit breaker instead of getting hammered, and every task is bounded so this never runs away uncontrolled."*

### 1:00–1:15 — The Living Report Artifact Window
- **Screen:** Show the Claude-style split screen artifact panel on the right — structured by theme with inline hyperlinked citations (`v1` $\rightarrow$ `v6` version progression).
- **Voiceover:** *"And the report isn't just a growing list — it's restructured by theme every time new findings come in, fully cited, so what you get back reads like a real research document, not a log."*

### 1:15–1:25 — Closing Pitch
- **Screen:** Return to main landing page or display title card.
- **Voiceover (Verbatim):** *"Research Swarm isn't just agents calling an LLM — it's a distributed system: idempotent task processing, bounded fan-out, circuit-broken external calls, and full execution tracing, built on Cloud Run, Pub/Sub, and Gemini, so every piece scales independently."*

---

## 🤖 Voiceover & AI Video Prompt

```text
Write a confident, energetic 75-second voiceover script for a hackathon demo video about "Research Swarm" — an autonomous multi-agent research system built on Google Cloud and Gemini. The video shows: (1) a user submitting a broad research question and immediately walking away, (2) a coordinator AI agent decomposing the question into sub-questions and deploying parallel worker agents, (3) the coordinator dynamically spawning a new follow-up research task mid-run based on what a worker discovered, (4) the system gracefully handling a simulated failure via a circuit breaker, and (5) a final research report that is fully cited and organized by theme. Tone: technical but exciting, aimed at hackathon judges who are engineers themselves — avoid marketing fluff, favor concrete specifics (mention Cloud Run, Pub/Sub, Gemini, Firestore by name). End on this exact closing line, verbatim: "Research Swarm isn't just agents calling an LLM — it's a distributed system: idempotent task processing, bounded fan-out, circuit-broken external calls, and full execution tracing, built on Cloud Run, Pub/Sub, and Gemini, so every piece scales independently." Keep sentences short enough to read naturally in a voiceover — no sentence longer than 20 words.
```
