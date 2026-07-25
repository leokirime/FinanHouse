# Agent Instructions — DDAE Engine (Document-Driven AI Engineering Engine)

This project follows DDAE Engine: documents in `Docs/` are the source of truth. Code implements what the documents specify — not the other way around. Full methodology: `Docs/00_ddae_engine/metodologia.md` and `Docs/00_ddae_engine/regras_ddae_engine.md`.

## Before writing any code

1. Read `Docs/00_ddae_engine/metodologia.md` and `Docs/00_ddae_engine/regras_ddae_engine.md` if you haven't in this session — they define the workflow this file assumes.
2. Read `Docs/01_product/visao_produto.md` and `Docs/01_product/requisitos_funcionais.md` for product context and the requirement you are implementing. If the task doesn't map to an existing requirement, stop and add/update the requirement first (or ask the user to).
3. Read `Docs/02_architecture/` and `Docs/04_governance/registro_decisoes.md` to check whether a prior decision already constrains your approach. Do not silently contradict a recorded decision — if you believe one should change, record a new decision that supersedes it.
4. Find or create the relevant session under `Docs/05_sessions/` (`ddae-engine session create "<nome>"`) and the block describing the unit of work (`ddae-engine block create "<nome>" --session <sessao>`). Read the block fully before touching code — it defines scope, files involved, and acceptance criteria.

## While implementing

- Work block by block. Each block lives at `Docs/05_sessions/<sessao>/05_blocks/bloco_NN_<nome>.md` and should have its scope, acceptance criteria, and risks filled in before implementation starts.
- Generate the execution prompt for a block with `ddae-engine prompt create --block <bloco> --session <sessao>` when handing work to an agent.
- Do not change scope mid-block without reporting it and getting explicit authorization first. If the task turns out to need more (or less) than the block describes, say so before proceeding.
- Respect technical contracts in `Docs/03_contracts/` (frontend/backend, database, auth, environment variables, deploy) — changing one is a registered decision, not a side effect of an unrelated task.
- Respect the design system in `Docs/07_design_system/` — don't introduce colors, components, or tokens outside what's documented without registering the addition there.
- Check the relevant quality gates in `Docs/06_quality_gates/` (architecture, security, tests, performance, design, deploy) before considering a block done, based on what the block touches.
- Register every pendency you find using the P1–P4 scale (`Docs/00_ddae_engine/metodologia.md`, section 12) — never describe unresolved work only in free-form prose.
- When a block is done, generate its closure feedback with `ddae-engine feedback create --block <bloco> --session <sessao>` and fill it in completely — what was built, what changed, what's still pending.
- If you make a decision that would be expensive to reverse, record it in `Docs/04_governance/registro_decisoes.md` (or `Docs/02_architecture/decisoes_tecnicas.md` for architecture-specific ones).
- Update the documentation in the same block where the behavior it describes changes — not in a future "cleanup" block.
- Run `ddae-engine validate` to check structural compliance and `ddae-engine audit` to check for orphaned blocks/prompts/feedbacks before considering a session closed.

## Commits

- **Never commit, push, or force-push without explicit user confirmation for that specific action**, even when a semantic commit message is suggested in a feedback or prompt file. Suggest the commit message; wait for approval before running `git add`/`git commit`/`git push`.

## What not to do

- Do not implement a feature that has no corresponding requirement in `Docs/01_product/requisitos_funcionais.md`.
- Do not invent architecture that contradicts `Docs/02_architecture/` or a recorded decision without registering a new one.
- Do not expand scope beyond what the active block describes without reporting it first.
- Do not commit automatically, even if the action seems obviously approved by context.
- Do not treat this file's instructions as optional context — they define the workflow for this repository.
