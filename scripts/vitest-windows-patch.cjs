const childProcess = require("node:child_process");

const originalExec = childProcess.exec;

childProcess.exec = function patchedExec(command, ...args) {
  if (typeof command === "string" && command.trim().toLowerCase() === "net use") {
    const callback = args.find((arg) => typeof arg === "function");
    if (callback) {
      process.nextTick(() => callback(null, ""));
    }

    return {
      kill() {},
      on() {
        return this;
      },
      once() {
        return this;
      },
      pid: undefined,
      stderr: null,
      stdin: null,
      stdout: null,
    };
  }

  return originalExec.call(this, command, ...args);
};
