# Pi Troubleshooting Guide

Quick fixes for common Pi integration issues in the Codex-native Dex setup.

---

## "Pi command not found"

Check that Pi is installed and available on your `PATH`:

```bash
pi --version
```

If the command is missing, reinstall Pi:

```bash
npm install -g @mariozechner/pi-coding-agent
```

---

## "Pi can't see Dex context"

Pi should receive Dex context from `.pi/AGENTS.md`.

Check that the file exists:

```bash
cat .pi/AGENTS.md
```

If it is missing, re-run beta activation for Pi so Dex can recreate the `.pi/` workspace scaffolding.

---

## "Pi can't reach Dex MCP servers"

Pi relies on Dex's local MCP configuration.

Verify Dex MCP config exists:

```bash
cat .mcp.json
```

If you need to re-render it, rerun the installer:

```bash
./install.sh
```

Then restart Pi and retry.

---

## "An extension failed" or TypeScript errors

Pi extensions live in `.pi/extensions/`.

List them:

```bash
ls -la .pi/extensions/
```

Inspect a specific extension:

```bash
cat .pi/extensions/[extension-name].ts
```

If Pi generated bad code, ask Pi to rewrite or fix that extension directly.

---

## Resetting Pi state

Remove one extension:

```bash
rm -f .pi/extensions/[extension-name].ts
```

Remove all Pi extensions:

```bash
rm -rf .pi/extensions/*
```

Reset the local Pi workspace Dex created:

```bash
rm -rf .pi
```

Then reactivate the Pi beta if you want Dex to recreate the scaffolding.

---

## Reporting Issues

When reporting Pi issues, include:

1. The exact prompt or Pi task you ran
2. The error output
3. Whether the issue was in Dex MCP access, generated extension code, or local Pi startup
4. The relevant file path under `.pi/` if one was created
