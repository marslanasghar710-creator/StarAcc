# Productivity layer guidelines

## Philosophy
- Shortcuts accelerate repetitive workflows without bypassing backend validation.
- Command surfaces must be permission-aware and route-aware.
- Financially sensitive actions still require explicit confirmation.

## Global shortcuts
- `Cmd/Ctrl + K`: Open command palette.
- `Shift + ?`: Open shortcut help.

## Page and context shortcuts
- Lists (invoices, bills):
  - `j` / `k`: move selection.
  - `Enter`: open selected record.
  - `/`: focus search input.
  - `r`: refresh data.
  - `c`: open create workflow (when permitted).

## Safety rules
- Do not bind irreversible financial posting, voiding, disposal, or payroll actions to one-step shortcuts.
- Suppress shortcuts while typing in input, textarea, select, or contenteditable fields unless explicitly opted in.
- New bulk actions must be safe-by-default (for example export), permission-gated, and reversible where practical.

## Command palette behavior
- Includes permission-filtered navigation commands.
- Supports route-level contextual actions from `useCommandActions`.
- Supports keyboard shortcuts help surface.

## Adding a new shortcut
1. Register with `useShortcuts` in page or component scope.
2. Give it a unique ID with route prefix.
3. Add concise description for help dialog.
4. Set `allowInInput: true` only for deliberate text-entry shortcuts.

## Adding a new command action
1. Use `useCommandActions` in the relevant route component.
2. Provide title, description, group, and action callback.
3. Ensure route/action is permission-safe.
4. Avoid actions that bypass confirmations for sensitive accounting mutations.
