# ppro_bridge — Claude ↔ Premiere Pro

Mirrors the After Effects bridge (`~/Downloads/ae_bridge` + `after-effects-mcp`),
same file-bus protocol, retargeted at Premiere. One structural difference:
Premiere has no ScriptUI panels, so the polling panel is a **CEP extension**
instead of a `.jsx` in Scripts/ScriptUI Panels.

## How it works

```
Claude / drive_ppro.py                    Premiere Pro
        │                                       │
        │  writes ppro_command.json             │
        │  {command:"runCustomJSX",             │
        │   args:{jsx:"..."}, status:"pending"} │
        ▼                                       ▼
   ~/Documents/ppro-mcp-bridge/  ◄──── CEP panel polls every 2s,
        ▲                              evalScript()s the JSX,
        │  reads ppro_mcp_result.json  writes the result
```

## Install (once)

```sh
./install.sh          # copies CEP panel, enables PlayerDebugMode, makes bridge dir
# restart Premiere → Window > Extensions > MCP Bridge (PPRO) → leave open
python3 drive_ppro.py probe    # should list your sequences
```

## MCP connectors (user scope — available in every folder)

```sh
claude mcp add -s user premiere-pro   -- node ~/Downloads/ppro_bridge/mcp/index.js
claude mcp add -s user after-effects  -- node ~/Downloads/ae-mcp-setup/after-effects-mcp/build/index.js
```

Tools exposed by `premiere-pro`:
- `get_project_info` — round-trip test; project, path, sequences + track counts
- `run_extendscript` — arbitrary JSX in the open project

## Files

- `cep/com.wazowski.pprobridge/` — the panel (manifest, HTML UI, poller, JSX host w/ JSON polyfill)
- `mcp/index.js` — dependency-free stdio MCP server
- `drive_ppro.py` — direct Python driver (same as drive_ae.py), for scripting without MCP
- `install.sh` — one-time setup

## Premiere ExtendScript crib sheet

- ES3 only, no `alert()`, return a string (JSON polyfill preloaded by host.jsx)
- `app.project.sequences[i]`, `.activeSequence`, `.rootItem.children`
- `app.project.importFiles([paths], true /*suppressUI*/, bin, false)`
- `seq.videoTracks[0].insertClip(projectItem, timeSeconds)` / `.overwriteClip(...)`
- Playhead: `seq.getPlayerPosition()` (returns Time in ticks; 254016000000 ticks/sec)
- Razor cuts, transitions, add-track, export presets → `app.enableQE()` then the
  undocumented `qe` DOM (`qe.project.getActiveSequence()`)
