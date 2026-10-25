# Resume this redesign in Codex cloud

## Current checkpoint

- Repository: `pick`
- Branch: `codex/redesign-foundation`
- Architecture: Svelte + TypeScript + Vite under `redesign/`
- Implemented: P01 decision wheel and P02 weighted selection, including local save/resume and accessible results
- Product decision: roadmap at `/#/roadmap` is direct-address only; do not add a visible UI link
- Remaining planned groups and release gates: [requirements](requirements.md), [migration plan](migration.md), [verification](verification.md)

## Start a cloud task

1. Open the `pick` repository in Codex cloud and select branch `codex/redesign-foundation`.
2. Start the task with: “Continue the Pick redesign from `docs/redesign/resume.md`. Read `docs/redesign/requirements.md`, `docs/redesign/architecture.md`, and `docs/redesign/migration.md` first. Preserve the roadmap as direct-address only. Continue with P03 sound, boundary ticks, celebration, and idle motion. Update parity evidence and run the documented redesign checks.”
3. Work in `redesign/`; the original root app and `js/` modules remain the behavior reference. Keep new persistence isolated until the explicit legacy migration phase.
4. Before a handoff, run the checks in `docs/redesign/verification.md`, update the pending-work list and commit on this branch.

The current wheel foundation commit is the parent of the pending roadmap visibility update in this checkpoint. Re-check the branch head after opening it in cloud so the task starts from the latest pushed commit.
