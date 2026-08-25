#!/usr/bin/env node
// Minimal MCP stdio server for the Premiere Pro file bridge.
// Zero dependencies. Talks newline-delimited JSON-RPC 2.0 on stdin/stdout.
// Requires the "MCP Bridge (PPRO)" CEP panel open in Premiere with Auto-run on.

const fs = require("fs");
const os = require("os");
const path = require("path");

const DIR = path.join(os.homedir(), "Documents", "ppro-mcp-bridge");
const CMD = path.join(DIR, "ppro_command.json");
const RES = path.join(DIR, "ppro_mcp_result.json");

const PROBE =
  '(function(){var p=app.project;' +
  'var o={project:p.name,path:p.path,' +
  'activeSequence:p.activeSequence?p.activeSequence.name:null,sequences:[]};' +
  'for(var i=0;i<p.sequences.numSequences;i++){var s=p.sequences[i];' +
  'o.sequences.push({name:s.name,videoTracks:s.videoTracks.numTracks,' +
  'audioTracks:s.audioTracks.numTracks});}' +
  'return JSON.stringify(o);})()';

function runJSX(jsx, timeoutSec) {
  return new Promise((resolve) => {
    fs.mkdirSync(DIR, { recursive: true });
    try { fs.unlinkSync(RES); } catch (e) {}
    fs.writeFileSync(CMD, JSON.stringify(
      { command: "runCustomJSX", args: { jsx }, status: "pending" }, null, 2));

    const deadline = Date.now() + (timeoutSec || 30) * 1000;
    const poll = setInterval(() => {
      if (fs.existsSync(RES)) {
        clearInterval(poll);
        setTimeout(() => {
          let out = "";
          try { out = fs.readFileSync(RES, "utf8"); } catch (e) { out = "read error: " + e.message; }
          resolve(out);
        }, 300);
      } else if (Date.now() > deadline) {
        clearInterval(poll);
        resolve(JSON.stringify({
          status: "error",
          message: "timeout: no result from Premiere. Is the MCP Bridge (PPRO) panel open with Auto-run checked?"
        }));
      }
    }, 500);
  });
}

const TOOLS = [
  {
    name: "run_extendscript",
    description:
      "Run arbitrary ExtendScript (JSX) in the open Premiere Pro project and return the result string. " +
      "Script must be ES3-compatible, return a string (use JSON.stringify — a polyfill is preloaded), " +
      "and never call alert() or blocking UI. Premiere DOM: app.project, app.project.sequences, " +
      "app.project.activeSequence, videoTracks[i].insertClip(projectItem, timeSeconds), " +
      "app.project.rootItem.children, app.project.importFiles([paths], true, bin, false). " +
      "For razor cuts / transitions / export, call app.enableQE() then use the qe DOM.",
    inputSchema: {
      type: "object",
      properties: {
        jsx: { type: "string", description: "ExtendScript source to evaluate in Premiere Pro" },
        timeout: { type: "number", description: "Seconds to wait for a result (default 30)" }
      },
      required: ["jsx"]
    }
  },
  {
    name: "get_project_info",
    description:
      "Get the open Premiere Pro project: name, path, active sequence, and all sequences with track counts. " +
      "Use this first as a round-trip test that the bridge panel is alive.",
    inputSchema: { type: "object", properties: {} }
  }
];

// ---- JSON-RPC plumbing ----
function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function reply(id, result) { send({ jsonrpc: "2.0", id, result }); }
function replyErr(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    reply(id, {
      protocolVersion: (params && params.protocolVersion) || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "premiere-pro-bridge", version: "1.0.0" }
    });
  } else if (method === "notifications/initialized" || (method && method.startsWith("notifications/"))) {
    // notifications: no response
  } else if (method === "ping") {
    reply(id, {});
  } else if (method === "tools/list") {
    reply(id, { tools: TOOLS });
  } else if (method === "tools/call") {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    let text;
    if (name === "run_extendscript") {
      if (!args.jsx) return replyErr(id, -32602, "missing required argument: jsx");
      text = await runJSX(args.jsx, args.timeout);
    } else if (name === "get_project_info") {
      text = await runJSX(PROBE, args.timeout);
    } else {
      return replyErr(id, -32602, "unknown tool: " + name);
    }
    const isErr = /"status"\s*:\s*"error"/.test(text);
    reply(id, { content: [{ type: "text", text }], isError: isErr });
  } else if (id !== undefined) {
    replyErr(id, -32601, "method not found: " + method);
  }
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { continue; }
    handle(msg).catch((e) => {
      if (msg.id !== undefined) replyErr(msg.id, -32603, "internal error: " + e.message);
    });
  }
});
process.stdin.on("end", () => process.exit(0));
