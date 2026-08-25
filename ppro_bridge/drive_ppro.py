#!/usr/bin/env python3
# Drives the open Premiere Pro project through the file-based MCP bridge.
# Requires: the "MCP Bridge (PPRO)" CEP panel OPEN in Premiere
# (Window > Extensions > MCP Bridge (PPRO)) — run install.sh once first.
# Usage:  python3 drive_ppro.py probe            # round-trip test: lists sequences
#         python3 drive_ppro.py run script.jsx   # run an arbitrary JSX file
import json, os, sys, time

BRIDGE = os.path.expanduser("~/Documents/ppro-mcp-bridge")
CMD = os.path.join(BRIDGE, "ppro_command.json")
RES = os.path.join(BRIDGE, "ppro_mcp_result.json")

PROBE = (
 '(function(){var p=app.project;'
 'var o={project:p.name,path:p.path,'
 'activeSequence:p.activeSequence?p.activeSequence.name:null,sequences:[]};'
 'for(var i=0;i<p.sequences.numSequences;i++){var s=p.sequences[i];'
 'o.sequences.push({name:s.name,videoTracks:s.videoTracks.numTracks,'
 'audioTracks:s.audioTracks.numTracks});}'
 'return JSON.stringify(o);})()'
)

def send(jsx, timeout=25):
    if not os.path.isdir(BRIDGE):
        print("ERROR: bridge dir missing ->", BRIDGE,
              "\nOpen the MCP Bridge (PPRO) panel in Premiere (Window > Extensions)."); return
    try:
        if os.path.exists(RES): os.remove(RES)
    except Exception: pass
    with open(CMD, "w") as f:
        json.dump({"command": "runCustomJSX", "args": {"jsx": jsx}, "status": "pending"}, f, indent=2)
    print("sent; waiting for Premiere (poll interval ~2s)...")
    t0 = time.time()
    while time.time() - t0 < timeout:
        if os.path.exists(RES):
            time.sleep(0.3)
            print("RESULT:\n" + open(RES).read()); return
        time.sleep(0.5)
    print("timeout: no result. Is the panel open with Auto-run checked?")

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "probe"
    if what == "run":
        if len(sys.argv) < 3:
            print("usage: drive_ppro.py run <script.jsx>"); sys.exit(1)
        send(open(sys.argv[2]).read())
    else:
        send(PROBE)
