# Reel Engine Research, Repository Audit & Implementation Plan

A comprehensive, evidence-backed architectural audit of five open-source video engines, atomic requirements extraction from **Reel Engine: Design Document v0.1**, and an actionable engineering implementation plan.

---

## 1. Research Baseline Manifest

All research findings, source code citations, and comparative matrices are pinned to the following immutable Git commits:

| Repository Name | Canonical Remote URL | Pinned Commit SHA | Commit Date | Verified License |
|---|---|---|---|---|
| **OpenMontage** | `https://github.com/calesthio/OpenMontage` | `195eab24478dc9363326aec437aefc3701635ddf` | 2026-10-28 | **AGPL-3.0** |
| **OpenChatCut** | `https://github.com/0xsline/OpenChatCut` | `7fa4b7903e7ebecf832a36249f0c0c755200cc17` | 2026-10-21 | **AGPL-3.0-or-later** |
| **mimic-mcp** | `https://github.com/pouyashahrdami/mimic-mcp` | `9dca836c78ac06d0a244364d878d7c9dfb44ca16` | 2026-08-31 | **MIT** |
| **short-video-maker** | `https://github.com/gyoridavid/short-video-maker` | `9bb9a212ced86caa7e09099c382da1a44d638760` | 2025-06-21 | **MIT** |
| **manim-mcp** | `https://github.com/paulnegz/manim-mcp` | `efd75c8d626301c03694a6606753eaa42f447924` | 2026-02-25 | **MIT** |

---

## 2. Document Navigation & Directory Structure

The complete research package is organized as follows:

```
reel-engine-research/
├── README.md                          # Research overview & navigation map (this document)
├── executive-summary.md               # High-level recommendation, trade-offs, and owner decisions
│
├── inputs/                            # Frozen source requirements
│   ├── Reel Engine Design Document v0.1.md
│   └── Reel_Engine_Agent_Research_and_Build_Plan.md
│
├── audits/                            # Independent code-level audits (5 repositories)
│   ├── openmontage.md                 # Heuristic pacing & slideshow risk analysis
│   ├── openchatcut.md                 # NLE media normalization & advisory gate analysis
│   ├── mimic-mcp.md                   # Safe-area, frame quality, and loudness QA analysis
│   ├── short-video-maker.md           # Express REST/MCP server & React web UI analysis
│   └── manim-mcp.md                   # AST Python code sandbox & Manim render worker
│
├── tables/                            # Cross-repository comparative matrices
│   ├── master-feature-matrix.md       # Master 0-4 scoring matrix (with CSV & JSON exports)
│   ├── master-feature-matrix.csv
│   ├── technology-and-risk-matrix.md  # Languages, frameworks, QA rigor, and unsupported claims
│   └── reuse-catalog.md               # Top 10 reusable components with adaptation strategies
│
├── requirements/                      # Formalized product requirements
│   ├── atomic-requirements.md         # 57 atomic requirements with RFC 2119 priorities
│   ├── requirements.csv               # Machine-readable requirements traceability register
│   ├── glossary.md                    # Exact technical domain glossary
│   ├── openquestions.md              # Research uncertainties & experimental hypotheses
│   ├── traceability-matrix.md         # Full requirements-to-code mapping across all 5 repos
│   └── traceability-matrix.csv
│
├── architecture/                      # Architectural strategy & design specifications
│   ├── options.md                     # Detailed evaluation of Strategies A, B, C, and D
│   ├── decision-matrix.md             # Weighted trade-off matrix & sensitivity analysis
│   ├── recommended-system.md          # Complete system architecture specification (Strategy D)
│   ├── reuse-map.md                   # Exact component adaptation & refactoring contracts
│   ├── gap-register.md                # Analysis of 9 critical engineering gaps
│   └── ADRs/                          # 10 Architecture Decision Records
│       ├── ADR-001-core-language-and-process-boundaries.md
│       ├── ADR-002-scene-ir-schema-and-frame-timing-contract.md
│       ├── ADR-003-remotion-manim-adapter-interface-and-normalization.md
│       ├── ADR-004-audio-timing-and-transcription-strategy.md
│       ├── ADR-005-job-execution-state-machine-and-persistence.md
│       ├── ADR-006-cache-design-and-content-addressed-assets.md
│       ├── ADR-007-quality-gate-enforcement-and-advisory-separation.md
│       ├── ADR-008-local-ui-architecture.md
│       ├── ADR-009-agent-authored-code-isolation-and-security.md
│       └── ADR-010-licensing-and-commercial-distribution-strategy.md
│
├── implementation-plan/               # Executable roadmap and tickets
│   ├── phased-roadmap.md              # Phases A through H with gates and exit criteria
│   ├── tickets.md                     # 14 executable engineering tickets with schemas & acceptance
│   ├── tickets.csv                    # Machine-readable ticket register
│   └── validation-spikes.md           # 5 high-risk technical spikes, sprint plan & budget
│
├── evidence/                          # Reproducibility data & test logs
│   ├── research-log.md                # System manifest, environment baseline, execution journal
│   └── test-results.md                # AST sandbox exploit battery & gate validation tests
│
└── decisions/                         # Business & product owner choices
    └── questions-for-owner.md         # 4 critical decisions before commencing implementation
```

---

## 3. Key Findings Summary
1. **Licensing Reality:** `OpenMontage` and `OpenChatCut` are both **AGPL-3.0**, preventing direct forking or library inclusion without open-sourcing the entire consumer application under AGPL.
2. **Quality Gate Reality:** No existing repository implements hard, deterministic blocking gates. `OpenChatCut`'s scene quality review is explicitly advisory (`// Pure advisory review... No runtime enforcement role`), while others lack safe-zone or reading-speed checks entirely.
3. **Dual Renderer Solution:** `manim-mcp` (MIT) provides the missing piece for mathematical scenes and AST Python security sandboxing, perfectly complementing Remotion for motion graphics.
4. **Primary Path:** Build a clean, decoupled TypeScript core engine implementing the Scene IR, integer-frame timing solver, and strict phased MCP state machine, reusing verified MIT modules (`manim-mcp`, `mimic-mcp`, `short-video-maker`).
