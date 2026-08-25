// Polls ~/Documents/ppro-mcp-bridge/ppro_command.json for pending commands,
// runs the JSX in Premiere via evalScript, writes ppro_mcp_result.json.
// Same protocol as the AE bridge (mcp-bridge-auto.jsx) — only the host differs.
(function () {
  var POLL_MS = 2000;

  function sysPath(type) {
    var p = window.__adobe_cep__.getSystemPath(type);
    return decodeURI(p).replace(/^file:\/\//, "");
  }

  var HOME = sysPath("userData").replace(/\/Library\/Application Support$/, "");
  var DIR = HOME + "/Documents/ppro-mcp-bridge";
  var CMD = DIR + "/ppro_command.json";
  var RES = DIR + "/ppro_mcp_result.json";
  var fs = window.cep.fs;
  var busy = false;

  var logEl = document.getElementById("log");
  var statusEl = document.getElementById("status");
  var autoEl = document.getElementById("auto");

  function log(msg) {
    var t = new Date().toLocaleTimeString();
    logEl.textContent = t + "  " + msg + "\n" + logEl.textContent;
  }

  fs.makedir(DIR);

  function writeCmdStatus(cmdData, status) {
    cmdData.status = status;
    fs.writeFile(CMD, JSON.stringify(cmdData, null, 2));
  }

  function check() {
    if (busy || !autoEl.checked) return;
    var r = fs.readFile(CMD);
    if (r.err !== 0 || !r.data) return;

    var cmd;
    try { cmd = JSON.parse(r.data); } catch (e) { return; }
    if (cmd.status !== "pending") return;

    busy = true;
    writeCmdStatus(cmd, "running");

    var jsx = (cmd.command === "runCustomJSX" && cmd.args && cmd.args.jsx) ? cmd.args.jsx : null;
    if (!jsx) {
      fs.writeFile(RES, JSON.stringify({ status: "error", message: "unsupported command: " + cmd.command }));
      writeCmdStatus(cmd, "completed");
      log("rejected command: " + cmd.command);
      busy = false;
      return;
    }

    log("running JSX (" + jsx.length + " chars)…");
    // JSON.stringify escapes the source safely for the evalScript string.
    window.__adobe_cep__.evalScript("__bridgeRun(" + JSON.stringify(jsx) + ")", function (result) {
      fs.writeFile(RES, result === undefined ? "" : String(result));
      writeCmdStatus(cmd, "completed");
      log("done → ppro_mcp_result.json");
      busy = false;
    });
  }

  setInterval(check, POLL_MS);
  document.getElementById("checkNow").onclick = function () { log("manual check"); check(); };

  statusEl.textContent = "Watching: " + CMD;
  log("PPRO MCP Bridge started");
})();
