# ExecPlans

Use an ExecPlan for any multi-file feature, migration, or significant refactor.

## Required Shape

Each ExecPlan should include:

- `Goal`: what the change accomplishes
- `Success Criteria`: concrete end-state checks
- `Current State`: repo-grounded survey of what exists now
- `Phases`: ordered implementation slices with acceptance criteria
- `Validation Matrix`: tests and manual checks
- `Risks`: the main failure modes and mitigations
- `Closure`: final reconciliation of completed, cancelled, or blocked items

## Working Rules

- Ground the plan in the actual repo before proposing changes.
- Prefer explicit phases over loose task lists.
- Split design from implementation when interfaces or behavior are changing.
- Keep one canonical source of truth for migration decisions.
- Update the plan as work lands; do not leave stale future-tense tasks behind.
- Before calling a plan complete, reconcile every phase and checklist item as `Completed`, `Cancelled`, or `Blocked`.

## Closure Standard

An ExecPlan is only complete when:

- the documented success criteria match the current repo state,
- validation results are recorded,
- remaining legacy surfaces are either removed or explicitly classified,
- and no unresolved implementation checkbox remains implied by the document.
