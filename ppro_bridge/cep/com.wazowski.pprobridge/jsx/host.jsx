// Auto-loaded into Premiere's ExtendScript engine via <ScriptPath> in manifest.xml.
// Premiere's ExtendScript has no native JSON — polyfill a minimal one (ES3-safe).

if (typeof JSON === "undefined") { JSON = {}; }
if (!JSON.parse) {
    JSON.parse = function (s) { return eval("(" + s + ")"); };
}
if (!JSON.stringify) {
    JSON.stringify = function (v) {
        function esc(s) {
            return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
                    .replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
        }
        function go(x) {
            if (x === null || x === undefined) return "null";
            var t = typeof x;
            if (t === "number") return isFinite(x) ? String(x) : "null";
            if (t === "boolean") return String(x);
            if (t === "string") return '"' + esc(x) + '"';
            if (x instanceof Array) {
                var a = [], i;
                for (i = 0; i < x.length; i++) a.push(go(x[i]));
                return "[" + a.join(",") + "]";
            }
            var o = [], k;
            for (k in x) { if (x.hasOwnProperty(k)) o.push('"' + esc(k) + '":' + go(x[k])); }
            return "{" + o.join(",") + "}";
        }
        return go(v);
    };
}

// Entry point the panel calls: evals arbitrary JSX, always returns a string.
function __bridgeRun(src) {
    try {
        var r = eval(src);
        return (typeof r === "string") ? r : JSON.stringify(r);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString(), line: e.line || 0 });
    }
}
