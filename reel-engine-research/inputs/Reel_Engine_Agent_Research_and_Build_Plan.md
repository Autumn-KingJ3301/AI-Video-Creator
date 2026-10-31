# Reel Engine — Repository Audit, Requirements Traceability, and Phased Build Plan

## Copy this entire brief into your coding agent

**Role:** Act as a principal software architect, senior code reviewer, video-systems engineer, and technical research lead. You have strong experience with TypeScript/React, Python, Model Context Protocol (MCP), Remotion, Manim, FFmpeg, video/audio synchronization, automated quality assurance, and secure execution of generated code.

**Mission:** Conduct an evidence-backed source-code audit of five existing projects, produce a consistent feature and architecture comparison for every project, then deeply analyze the supplied Reel Engine v0.1 requirements. Finally, create a detailed, phased engineering implementation plan that identifies exactly what should be reused, adapted, developed, tested, or deliberately excluded.

**Important:** This is a **research, audit, and design assignment**, not authorization to build the product. Do not implement the Reel Engine, edit upstream repositories, publish code, spend money, install untrusted binaries, or provision paid services without separate approval.

### Required input

The full document titled **"Reel Engine: Design Document v0.1"** must accompany this brief. Treat it as the primary product requirements source, including its director doctrine, preset model, Scene IR, timing system, dual renderers, quality gates, MCP phases, and UI responsibilities. It is not an implementation; distinguish requirements from existing code.

If the document is not available, you may complete the repository audits, but **stop before the requirements extraction phase** and ask for the document. Never invent its contents.

### Repositories: audit all five

1. OpenMontage — https://github.com/calesthio/OpenMontage
2. OpenChatCut — https://github.com/0xsline/OpenChatCut
3. mimic-mcp — https://github.com/pouyashahrdami/mimic-mcp
4. short-video-maker — https://github.com/gyoridavid/short-video-maker
5. manim-mcp — https://github.com/paulnegz/manim-mcp

Do not substitute forks, mirrors, or related products without recording why. The research set is fixed; you may identify optional additional dependencies, but analyze these five completely first.

### Operating principles

1. **Source code outranks README claims.** Mark a feature "implemented" only when you locate its actual logic. Differentiate "implemented", "partial", "documented-only", "absent/not found", and "unverified".
2. **Evidence for every substantive judgment.** Cite repository, pinned commit SHA, file path, symbol/function, and line numbers whenever possible. Link to permalinks pinned to the SHA, not just mutable main branches.
3. **Never infer production readiness from GitHub stars or marketing text.** Use tests, boundaries, error handling, CI, dependency management, recovery, and actual runtime behavior.
4. **Separate static inspection from execution.** Never say "tested" when you only read code. Mark every test as "passed", "failed", "skipped", or "not run", including why.
5. **Do not cherry-pick winners.** First audit all repositories against the same neutral rubric. Read requirements only after completing the initial independent audits and per-repository tables.
6. **Distinguish functional availability from quality enforcement.** An advisory check, UI warning, README checklist, and true blocking gate are four different things.
7. **Be explicit about uncertainty and permissions.** If network access, dependencies, credentials, GPU capacity, or legal rights block a step, record the blocker and continue with safe read-only inspection where possible. Do not bypass controls.
8. **No copied code without a license review.** Track repository licenses, third-party packages, fonts, codecs, models, media, data sources, and their separate terms. In particular, validate Remotion's current terms for commercial teams and automated video tools.
9. **Challenge the architecture when evidence warrants it.** Do not assume the design document's preferred stack is automatically optimal. Compare feasible alternatives while preserving the product's actual goals.
10. **Keep findings reproducible.** Record commands, environment details, versions, commits, exit codes, test results, and relevant logs. Make all outputs accessible as Markdown and machine-readable data.

---

# PHASE 0 — Prepare the audit workspace

**Objective:** Create a safe, repeatable research environment and clarify inputs without doing premature architecture selection.

Actions:

- Confirm the requirement document exists and record its checksum, title, and version. Do not evaluate its features yet.
- Record operating system, CPU architecture, Python, Node.js, npm/pnpm, Git, FFmpeg, container runtime, and GPU availability.
- Create an isolated workspace with separate areas for original repositories, generated findings, and disposable test output.
- Check disk space and network/proxy limitations before cloning.
- Create a research log with date, environment, commands, failures, open questions, and assumptions.
- Decide whether execution is authorized. If not, continue with source analysis only.

Suggested output layout:

    reel-engine-research/
      inputs/                 # supplied requirement document; immutable
      repos/                  # five independently cloned repositories
      evidence/               # source references, commit hashes, commands, logs
      audits/                 # one detailed report per repository
      tables/                 # one table per repository + cross-repo comparison
      requirements/           # extracted requirements and traceability matrix
      architecture/           # alternatives, ADRs, interfaces, data contracts
      implementation-plan/    # work packages, estimates, dependencies, tests
      decisions/              # outstanding choices and recommendation
      README.md               # navigation and executive summary

**Gate 0:** Inputs and environment documented; repository destinations verified; no existing user work overwritten.

# PHASE 1 — Clone and inventory the repositories

**Objective:** Establish exact, immutable research baselines for all five projects.

For each repository:

1. Clone into its own directory under repos/. Default to the repository's canonical default branch; do not run installation scripts.
2. Record canonical URL, branch, complete HEAD SHA, latest commit date, tag/version, license files, repository status, and any submodules or Git LFS dependencies.
3. Record programming languages, runtimes, package managers, lockfiles, code-generation tools, build steps, deployment options, and external services.
4. Generate an annotated directory map, excluding bulky generated/vendor directories.
5. Identify startup entrypoints, major modules, critical data structures, configuration, API/MCP surfaces, rendering code, test suites, docs, and CI workflows.
6. Identify secrets handling and any scripts that execute as part of package installation.
7. Search for TODO, FIXME, unsupported/experimental flags, silent fallbacks, broad exception handlers, unsafe code execution, hard-coded ports/paths, and missing failure handling.
8. Capture a machine-readable repository manifest for reproducibility.

Suggested Git commands (run only in an authorized workspace):

    git clone --filter=blob:none <canonical-url> <repo-directory>
    git -C <repo-directory> rev-parse HEAD
    git -C <repo-directory> status --short
    git -C <repo-directory> log -1 --format=fuller
    git -C <repo-directory> ls-files

Do not run git pull on an existing research checkout without recording the previous commit. Never modify or push to upstream.

**Deliverables:** 5 pinned repository manifests, 5 architecture maps, environment manifest, and reproducibility log.

**Gate 1:** Every repository has a verified commit SHA and traceable source tree. Record clone failures instead of silently dropping a candidate.

# PHASE 2 — Deep, independent code audit of EACH repository

**Objective:** Determine how every project actually works, without yet scoring against Reel Engine requirements.

Apply the same questions to **each** repository. Trace entrypoint → input schema → orchestration → processing → renderer → output → tests. Read implementation files, not only documentation.

## 2A. Functional inventory

Inspect:

- Input types: prompt, script, narration audio, user footage, images, reference reel, batch jobs.
- Idea generation, hook creation, beat planning, storyboarding, agent decision-making, creative presets.
- Project model, JSON/YAML/Zod/Pydantic schemas, scene/clip data model, state persistence, migration/versioning.
- Time model: seconds vs integer frames, fps conversions, alignment, word/phrase timestamps, drift, trimming silence, re-timing.
- Media generation and retrieval: TTS, STT/Whisper, stock footage, image/video models, asset provenance, caching.
- Visuals: Remotion, Manim, FFmpeg, transitions, effects, templates, typography, captions, graphics, dynamic aspect ratios.
- Audio: narration/master clock, music, ducking, peak levels, loudness, clipping, synchronization.
- Quality checks: schema, duration, frame count, black/frozen frames, motion frequency, crop/safe area, caption overlap, legibility, text dwell time, contrast, visual review, retry policy.
- Integration: MCP tools, resources, prompts, REST APIs, CLI, agent skills, structured tool responses, job status.
- UI: preview, editing controls, phase view, scene timeline, review workflow, export controls.
- Output: MP4, intermediate clips, render manifests, diagnostics, partial rebuild, resumability, project portability.

## 2B. Architecture and code quality

For each major subsystem, determine:

- Actual entrypoints and data flow; where the source of truth lives.
- Module cohesion/coupling; dependency direction; reusable vs application-specific parts.
- Whether orchestration, core domain logic, integration adapters, rendering, and UI are properly separated.
- Validation boundaries and whether errors fail open or fail closed.
- Type safety and schema enforcement; unsupported states; status transitions.
- Determinism, concurrency limits, cancellation, retries, resource cleanup, timeouts, cache keys, resumable jobs.
- Security: arbitrary agent-generated code, process isolation, filesystem access, network access, prompt injection through untrusted media/metadata, secrets, output path handling.
- Test coverage by behavior and critical path, not only count of test files.
- Build/deployment complexity and CPU/GPU requirements.
- Operational observability: structured logs, metrics, error reporting, provenance, trace IDs.
- Compatibility and licensing: frameworks, packages, models, fonts, media, codecs, paid API dependencies.

## 2C. Controlled verification, only when approved and feasible

- Read installation instructions and package scripts first.
- Run safe static checks, type-checkers, tests, and a minimal smoke test with small synthetic inputs only after relevant permissions and dependencies are available.
- Do not import real credentials or upload user media to third parties.
- Avoid GPU-heavy or paid render jobs by default.
- Record exact commands, tool versions, duration, resource consumption, logs, and result.
- Keep generated outputs isolated. Do not delete user files.
- If a test needs credentials or external services, mark "blocked/not run" with reason; don't fabricate success.

## 2D. Mandatory report format for EVERY repository

Create audits/<repo>.md with:

1. Executive verdict (5–10 sentences; clear evidence and limitations).
2. Repository snapshot: URL, SHA, date, license, languages, dependencies.
3. Architecture map: modules, boundaries, input→output flow.
4. Detailed feature table (schema below).
5. Representative execution trace (actual functions/files in call order).
6. Quality and security findings, ranked critical/high/medium/low, with reproduction or evidence.
7. Test and CI assessment, explicitly separating observed from executed.
8. Reusability analysis: candidate modules, dependency graph, extraction effort, license compatibility, integration risk.
9. Known unknowns and claims requiring runtime verification.
10. Recommendation for this repository alone: use as is, adapt module, study concepts only, or reject—with reasons.

**Per-repository feature table — one separate table for each of the five:**

| Feature ID | Feature / behavior | Status (implemented / partial / documented-only / absent / unverified) | How it works in code | Source evidence (SHA:path:lines) | Test evidence | Limitations / risks | Reuse potential |
|---|---|---|---|---|---|---|---|
| F-001 | Example feature | Implemented | Specific class/function and call path | SHA + permalink | Passed/Not run | Specific limitation | Reuse/Adapt/Avoid |

Include at least these feature groups: planning, schemas, timing, media generation, Remotion, Manim, captions, safe zones, transitions, quality gates, MCP/API, UI, caching, export, testing, security.

**Gate 2:** Five complete code-backed audits, with per-repository feature tables and explicit evidence. No product requirement mapping or favorite repo selection yet.

# PHASE 3 — Build the neutral cross-repository comparison

**Objective:** Compare like with like, using only verified findings from Phase 2.

Produce:

1. A single master feature matrix: feature rows × five repositories, with status labels, evidence links, and notes.
2. A technology comparison: languages, frameworks, renderer, MCP, UI, databases, job queue, STT/TTS, license.
3. A quality comparison: validation strength, error recovery, sandboxing, test maturity, deterministic rendering, failure handling.
4. A reuse comparison: code size/complexity, modularity, dependency footprint, customization cost, license constraints.
5. A list of the 10 most relevant reusable components found, independently of requirements.
6. A list of notable code defects and unsupported README claims that would matter in a fork.

Use a documented rubric and score each criterion from 0–4:

- 0 = absent or no evidence
- 1 = concept/prototype
- 2 = partial implementation
- 3 = implemented with credible tests/controls
- 4 = robustly implemented, operationally verified

Mark unknown as "?" rather than zero; **scores are evidence-backed opinions, not objective measurements**. Do not calculate a weighted winner yet.

**Deliverables:** tables/master-feature-matrix.md, tables/technology-and-risk-matrix.md, tables/reuse-catalog.md, plus machine-readable CSV/JSON exports.

**Gate 3:** Every cross-repo cell links to a per-repository finding. Comparison complete before requirements analysis.

# PHASE 4 — Deeply analyze the Reel Engine v0.1 requirement document

**Objective:** Translate the supplied design into a precise implementation contract.

Read the entire document carefully. Extract atomic requirements, preserving original section references and any stated confidence, defaults, caveats, or unresolved research questions.

Organize requirements into:

1. Product goals and non-goals; definition of "finished reel".
2. Director doctrine: one idea, hook timing, pacing, send moment, payoff, loop, consistency.
3. Project configuration and independent preset layers.
4. Scene IR: types, identifiers, start/end frames, narration, intent, events, layout, renderer, transitions, assets.
5. Audio-master timing: transcription, word timestamps, phrase alignment, silence trimming, integer-frame clock.
6. Renderer interface and routing: Remotion for general motion graphics; Manim for mathematical/scientific animation.
7. Shared scene helpers: canvas, safe zones, layouts, typography, captions, transitions, easing, responsive design.
8. Rendering: draft/final profiles, isolated scene clips, deterministic versions, cache invalidation.
9. Composition: FFmpeg, captions, audio mixing, music, non-destructive export edit list.
10. Deterministic blocking QA: render, frame counts, timing, static intervals, readable text, safe area/crop, contrast, clipping, audio.
11. Advisory quality checks: sampled frames, vision review, creative self-review rubric.
12. Agent/MCP state machine: input → transcribed → planned → authored → rendered → verified → composed → exported.
13. MCP tools, typed responses, blocked transitions, get_next_step, resume/recovery.
14. Local UI: project state, preview, scenes, lint reports, agent bootstrap prompts, postproduction.
15. Cross-cutting concerns: security, media licenses, observability, performance, operating costs, testing.
16. Non-goals for v0.1: publishing, analytics ingestion, multi-language typography, and UI layout details.
17. Unknowns requiring experiments: pacing heuristics, caption readability, safe-zone updates, retention targets.

For each requirement create a stable ID, e.g. REQ-001, and capture:

| ID | Source section | Precise requirement | Priority (MUST/SHOULD/LATER) | Verification method | Acceptance criterion | Ambiguity / decision needed |
|---|---|---|---|---|---|---|

**Strictness rules:**

- Keep empirical guidance separate from hard engineering invariants. A 1–3 second pacing heuristic is a configurable default; exact frame count and safe-area containment are machine-checkable constraints.
- Where the document proposes a default, do not silently convert it into an immutable rule.
- Identify internal contradictions (e.g. variable speech timing vs fixed scene durations).
- Identify cross-renderer invariants (coordinate systems, font metrics, event times, rendered text bounds).
- Explicitly differentiate v0.1 MVP, later versions, and experiments.
- Write a glossary for ambiguous terms such as scene, beat, shot, event, transition, preset, asset, composition, and verified.

**Deliverables:** requirements/atomic-requirements.md, requirements/requirements.csv, requirements/glossary.md, requirements/open-questions.md.

**Gate 4:** Every normative sentence in the design is traced to a stable requirement or explicitly marked non-normative. No requirement is invented.

# PHASE 5 — Requirements-to-code traceability and gap analysis

**Objective:** Identify exact code reuse opportunities and the remaining engineering work.

For EVERY requirement from Phase 4, map all five audited repositories:

| Requirement ID | Requirement | OpenMontage evidence | OpenChatCut evidence | mimic-mcp evidence | short-video-maker evidence | manim-mcp evidence | Best candidate | Missing work | Confidence |
|---|---|---|---|---|---|---|---|---|---|

Use candidate statuses:

- Reuse as-is: compatible contract, adequate tests, acceptable license.
- Adapt: solid implementation with required modifications and tests.
- Reference only: useful design but copying is inappropriate or too expensive.
- New implementation: no adequate code found.
- Defer: explicitly out of scope.

For each potential reuse, document:

- Exact original module/function and its dependencies.
- Proposed new interface and how it maps to Scene IR/MCP project state.
- Necessary adapters, refactors, tests, security isolation, and license considerations.
- Estimated complexity (S/M/L/XL), not arbitrary percentages.
- Failure modes, fallback behavior, and rollback/replaceability.

Highlight gaps in **hard enforcement**, especially: frame-based timing, audio-driven cuts, safe zones and crop checks, caption dwell time, true visual-change detection, deterministic blocking gates, isolated generated-code execution, and resumability.

**Deliverables:** requirements/traceability-matrix.md and CSV, architecture/reuse-map.md, architecture/gap-register.md.

**Gate 5:** Every selected component is tied to explicit requirement IDs and source evidence. Every MUST has a planned owner and validation strategy.

# PHASE 6 — Compare architecture strategies and select a recommended approach

**Objective:** Make a reasoned build-vs-fork-vs-compose decision.

Evaluate at least four strategies:

- **A. Fork OpenMontage** and narrow its pipelines to the Reel Engine requirements.
- **B. Fork OpenChatCut** and add structured scene planning and strict quality gates.
- **C. Build from a small MCP/Remotion base** (e.g. mimic-mcp), adapt a Manim service, and create an original shared IR, QA engine, and UI.
- **D. Greenfield core with selective library reuse**, using the repositories as implementation references.

For each strategy, estimate with assumptions:

- Requirements coverage and architectural fit.
- License/commercial deployment constraints, including AGPL and Remotion's separate license.
- Amount of code to maintain; dependency and upgrade burden.
- Required integration/adaptation and migration work.
- Quality-gate feasibility and cross-renderer consistency.
- Testability, failure isolation, observability, developer experience.
- CPU/GPU cost, rendering latency, provider usage.
- Security and generated-code execution risks.
- Time to first test reel, MVP, and maintainable v1.
- Reversibility and future extensibility.

Use a weighted decision matrix. **Propose and justify weights only after Phase 4 requirements are known.** Report sensitivity: does the recommended approach change if UI importance, license cost, or delivery deadline changes?

Write Architecture Decision Records (ADRs) for:

1. Core implementation language and process boundaries.
2. Scene IR schema, versioning, frame-based timing contract.
3. Remotion/Manim adapter interface and media normalization.
4. Audio timing and transcription strategy.
5. Job execution, state machine, cancellation, retries, persistence.
6. Cache design and content-addressed assets.
7. QA enforcement and advisory review separation.
8. Local UI architecture.
9. Isolation and security of agent-authored code.
10. Licensing and commercial distribution strategy.

**Deliverables:** architecture/options.md, architecture/decision-matrix.md, architecture/ADRs/, architecture/recommended-system.md.

**Gate 6:** Recommendation has evidence, tradeoffs, rejected alternatives, uncertainties, and explicit constraints. Do not choose based on popularity.

# PHASE 7 — Produce the detailed, phased implementation roadmap

**Objective:** Convert the recommended architecture into a directly executable engineering plan, WITHOUT writing product code yet.

Each implementation phase MUST include:

- Goal and user-visible outcome.
- Requirements covered (IDs).
- Existing code to reuse/adapt with precise source location.
- New modules and contracts to develop.
- Work packages ordered by dependencies.
- Inputs, outputs, APIs, schemas, and key data structures.
- Specific tests, fixtures, and sample videos.
- Automated acceptance gates and failure conditions.
- Security/license considerations.
- Dependencies, risks, parallelizable tasks, estimates (optimistic/likely/pessimistic), and exit criteria.
- Artifact/demo showing that the phase actually works.
- A restart note: completed work, next step, and exact test command.

Design the implementation as the following **provisional phases**. Adjust their order only with explicit reasoning:

### Build Phase A — Contracts and minimal vertical slice

- Define versioned ProjectConfig, presets, Scene IR, render result, quality report, and project-state schemas.
- Choose one 15-second narrated example with a hook, two beats, captions, and payoff.
- Hand-author the scene plan initially; prove audio+scene+export works without an agent.
- Define initial golden fixtures and baseline metrics.
- Acceptance: deterministic output metadata, valid contracts, repeatable render.

### Build Phase B — Shared rendering foundation

- Implement adapter contract for scene renderers; support Remotion first and Manim second.
- Normalize fps, resolution, color, alpha, fonts, safe coordinates, audio-free scene clip output, and error reports.
- Implement responsive layout helpers, preset typography, transitions, caption layers and style tokens.
- Acceptance: mix at least one Manim and one Remotion scene in a single consistent reel.

### Build Phase C — Audio-driven frame timing

- Implement ingest/TTS/transcription/word timing, optional pause tightening, phrase boundaries and frame quantization.
- Build a deterministic timing solver and visual-event schedule.
- Define rules for speech pauses, empty narration scenes, transitions, and total duration.
- Acceptance: scene boundaries match phrase cues within explicit tolerance; no accumulated A/V drift; tests at multiple fps.

### Build Phase D — Quality gates

- Implement IR lint checks first, then rendered-frame checks, caption bounds/reading time, safe zone and 3:4 crop, contrast, static intervals, black frames, audio loudness/clipping, and transition limits.
- Return structured errors with scene ID, frame range, severity, evidence frame, suggested fix and block/advisory status.
- Verify hard blockers cannot be bypassed by exception handling, missing evidence, or unsupported renderers.
- Acceptance: intentionally bad synthetic videos fail specific gates; valid fixture passes; every blocker has a regression test.

### Build Phase E — Composition, caching, and recovery

- Compose independent scene clips via FFmpeg with captions, narration and music; implement a non-destructive export edit list.
- Content-address scenes using IR + code + style + asset/version + audio slice hashes.
- Implement cancellation, resumption, idempotency, timeouts, failure recovery, and cache invalidation.
- Acceptance: editing one scene re-renders only affected dependencies; interrupted jobs recover without corrupting project state.

### Build Phase F — MCP and director skill

- Expose the phases and typed tools from the requirements; enforce legal state transitions and get_next_step.
- Add doctrine, presets, hook-generation workflow, beat sheet, limited scene choices, and self-review rubric.
- Use bounded agent retries. Preserve separate human approval points and advisory quality findings.
- Acceptance: an external coding agent can execute the complete pipeline and recover after context loss without inventing project state.

### Build Phase G — React local UI

- Project view, phase/status, scene list, render queue, preview, sampled evidence, lint report, prompt panel and approval actions.
- Add minimal non-destructive trim/reorder/toggle controls; do not build a full NLE unless required.
- Acceptance: a non-developer can inspect and export a video; failures point to the problematic scene and frame.

### Build Phase H — Hardening and tuning

- Security review, isolation tests, dependency/license review, automated CI, observability, performance budgets, documentation and packaging.
- Benchmarks: render latency, per-scene cache hit rate, memory, failure rate, caption correctness, A/V synchronization.
- Compare 15/30/45-second presets and at least two pacing variants; distinguish measured results from hypotheses.
- Acceptance: reproducible setup, zero known critical failures, verified recovery, documented licensing, repeatable benchmark suite.

Provide:

1. Dependency graph of phases and a critical path.
2. Work breakdown structure with individually executable tickets.
3. Ticket schema: ID, title, requirement IDs, owner role, dependencies, exact tasks, files/contracts, tests, acceptance, estimate, risk.
4. MVP boundary (must ship) vs v1 vs future scope.
5. Five high-risk engineering spikes with hypotheses, smallest experiment, success/failure threshold, cost cap, next decision.
6. A 1-week validation sprint plan (or equivalent short sprint) before committing to a larger build.
7. Two staffing scenarios: solo developer and small team. Do not assume the team has existing media-engine expertise.
8. Budget worksheet covering infrastructure, storage, CPU/GPU minutes, provider APIs, and relevant licenses; mark all external prices as needing current verification.

**Gate 7:** Every MVP requirement is covered by a ticket and explicit test. No "implement video quality" mega-tickets without measurable subcomponents.

# PHASE 8 — Final verification and decision handoff

**Objective:** Deliver a decision-ready research package that a different engineering team could execute.

Required final files:

1. README.md — navigation and exact research baseline.
2. executive-summary.md — top recommendation, why, main risks, and next decision.
3. audits/openmontage.md
4. audits/openchatcut.md
5. audits/mimic-mcp.md
6. audits/short-video-maker.md
7. audits/manim-mcp.md
8. tables/master-feature-matrix.md and CSV/JSON.
9. tables/technology-and-risk-matrix.md.
10. requirements/atomic-requirements.md and CSV.
11. requirements/traceability-matrix.md and CSV.
12. architecture/options.md, decision-matrix.md, recommended-system.md and ADRs.
13. architecture/reuse-map.md and gap-register.md.
14. implementation-plan/phased-roadmap.md.
15. implementation-plan/tickets.md and machine-readable JSON/CSV.
16. implementation-plan/validation-spikes.md.
17. evidence/research-log.md and evidence/test-results.md.
18. decisions/questions-for-owner.md with a short list of choices that materially change scope, cost, or license exposure.

Final verification checklist:

- All five repository SHAs recorded and URLs verified.
- Every substantial feature claim has source evidence.
- The five individual tables use the same rubric.
- Source inspections and executed tests are clearly distinguished.
- No requirement from the design document is lost.
- Every MUST requirement maps to a chosen implementation and acceptance test.
- Hard QA gates and advisory model judgments are separated.
- Renderer licensing and generated-code execution risks are addressed.
- The recommendation considers all four architecture strategies.
- Every roadmap phase has measurable exit criteria, dependencies, and estimated effort.
- Unresolved questions and blockers are plainly stated.
- The report is reproducible, and no work was done beyond permitted scope.

## Output and communication rules

- Start with a short execution plan and confirm the requirement document is available.
- Work phase by phase. At each research gate, provide a concise status update with the new artifacts, blockers, and next phase.
- Do not ask for routine approvals during read-only investigation. Ask only when access, execution, spending, destructive actions, or an architectural decision genuinely requires authorization.
- Use plain, direct technical language. No marketing prose or unsupported superlatives.
- Prefer small, source-linked tables and concrete call traces to vague summaries.
- When a claim is uncertain, say what would verify or falsify it.
- **Do not begin implementing the Reel Engine unless the owner approves the architecture and phased plan.**

## Final response format

Return:

1. **Recommendation:** one primary strategy and the strongest alternative.
2. **Evidence:** the most important repo findings and source permalinks.
3. **Coverage:** requirements satisfied by reuse vs new work vs deferred.
4. **Plan:** phases, milestones, critical path, MVP boundary, effort ranges, and tests.
5. **Risks:** licensing, security, performance, quality, dependencies, and unknowns.
6. **Decision needed:** the smallest set of owner questions before implementation.
7. **Links:** every generated report, matrix, ADR, and backlog file.

**Definition of success:** Another experienced engineer should be able to select the architecture, validate the choice, and execute the first implementation sprint using your package—without rediscovering the repositories or guessing what any requirement means.
