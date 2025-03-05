function printString(arg) {
  const printError =
    "InstallTrigger" in window // detect Firefox
    ? (e) => e.message + "\n" + e.stack
    : (e) => e.stack || e.message;

  if (arg === undefined) {
    return "undefined";
  }
  if (arg === null) {
    return "null";
  }
  if (arg instanceof Error) {
    return printError(arg);
  }
  if (Array.isArray(arg)) {
    return `Array(${arg.length})`;
  }
  return String(arg);
}

function printFloat(arg) {
  if (typeof arg !== "number") return "NaN";
  return arg.toString();
}

function printInt(arg) {
  if (typeof arg !== "number") return "NaN";
  return Math.floor(arg).toString();
}

function printObject(arg) {
  const printError =
    "InstallTrigger" in window // detect Firefox
    ? (e) => e.message + "\n" + e.stack
    : (e) => e.stack || e.message;

  if (arg === undefined) {
    return "undefined";
  }
  if (arg === null) {
    return "null";
  }
  if (arg instanceof Error) {
    return printError(arg);
  }
  if (Array.isArray(arg)) {
    const length = arg.length;
    const values = arg.slice(0, 10).map(printString).join(", ");
    return `Array(${length})[${values}]`;
  }
  if (typeof arg === "object") {
    const res = [];
    let i = 0;
    for (const k in arg) {
      if (++i === 10) {
        break;
      }
      const v = arg[k];
      res.push(k + ": " + printString(v));
    }
    return "{" + res.join(", ") + "}";
  }
  return arg.toString();
}

function printf(args) {
  if (typeof args[0] === "string") {
    args.unshift(
      args.shift().replace(/%(o|s|f|d|i)/g, (s, t) => {
        const arg = args.shift();
        if (arg === undefined) return s;
        switch (t) {
          case "o":
            return printObject(arg);
          case "s":
            return printString(arg);
          case "f":
            return printFloat(arg);
          case "d":
          case "i":
            return printInt(arg);
          default:
            return s;
        }
      }),
    );
  }
  return args.map(printObject).join(" ");
}

const consoleMethods = ["log", "info", "warn", "error", "debug", "assert"];

export const patchConsole = (console, ctx) => {
  if (window.revokeSpotPatch || window.__or_proxy_revocable) {
    return;
  }
  let n = 0;
  const reset = () => {
    n = 0;
  };
  let int = setInterval(reset, 1000);

  const sendConsoleLog = (level, args) => {
    const msg = printf(args);
    const truncated =
      msg.length > 5000 ? `Truncated: ${msg.slice(0, 5000)}...` : msg;
    const logs = [{ level, msg: truncated, time: Date.now() }];
    window.postMessage({ type: "ort:bump-logs", logs }, "*");
  };

  const handler = (level) => ({
    apply: function (target, thisArg, argumentsList) {
      Reflect.apply(target, ctx, argumentsList);
      n = n + 1;
      if (n > 10) {
        return;
      } else {
        sendConsoleLog(level, argumentsList); // Pass the correct level
      }
    },
  });

  window.__or_proxy_revocable = [];
  consoleMethods.forEach((method) => {
    if (consoleMethods.indexOf(method) === -1) {
      return;
    }
    const fn = ctx.console[method];
    // is there any way to preserve the original console trace?
    const revProxy = Proxy.revocable(fn, handler(method));
    console[method] = revProxy.proxy;
    window.__or_proxy_revocable.push(revProxy);
  });

  return () => {
    clearInterval(int);
    window.__or_proxy_revocable.forEach((revocable) => {
      revocable.revoke();
    });
  };
};