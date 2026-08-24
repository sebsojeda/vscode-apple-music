import { spawn } from "child_process";
import * as fs from "fs";
import path = require("path");

export class AppleScriptExecutionError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly signal: NodeJS.Signals | null,
    public readonly stderr: string
  ) {
    super(message);
    this.name = "AppleScriptExecutionError";
  }
}

export default class AppleScriptRunner {
  private scriptMap: Map<string, string>;
  private queue: Promise<void> = Promise.resolve();
  private activeProcesses = new Set<ReturnType<typeof spawn>>();
  private disposed = false;

  constructor() {
    this.scriptMap = this.initializeMap();
  }

  public run(
    script: string,
    args?: string | readonly string[]
  ): Promise<string> {
    if (this.disposed) {
      return Promise.reject(new Error("AppleScript runner has been disposed."));
    }
    let rawScript = `${script}.applescript`;
    if (this.scriptMap.has(rawScript)) {
      const normalizedArgs =
        args === undefined ? [] : typeof args === "string" ? [args] : [...args];
      const result = this.queue.then(() => {
        if (this.disposed) {
          throw new Error("AppleScript runner has been disposed.");
        }
        return this.runAppleScript(
          this.scriptMap.get(rawScript)!,
          normalizedArgs
        );
      });
      this.queue = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    }
    return Promise.reject(new Error(`AppleScript “${script}” was not found.`));
  }

  public dispose() {
    this.disposed = true;
    for (const process of this.activeProcesses) {
      process.kill();
    }
    this.activeProcesses.clear();
  }

  private runAppleScript(script: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const osascript = spawn("osascript", ["-", ...args], {
        stdio: "pipe",
      });
      this.activeProcesses.add(osascript);
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        osascript.kill();
        this.activeProcesses.delete(osascript);
        reject(new Error("Apple Music did not respond within 15 seconds."));
      }, 15_000);

      osascript.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      osascript.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
      osascript.on("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.activeProcesses.delete(osascript);
        reject(error);
      });
      osascript.on("close", (code, signal) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.activeProcesses.delete(osascript);
        if (code === 0) {
          resolve(stdout);
          return;
        }
        const message =
          stderr.trim() ||
          `osascript exited with code ${code ?? "unknown"}${
            signal ? ` (${signal})` : ""
          }`;
        reject(
          new AppleScriptExecutionError(message, code, signal, stderr.trim())
        );
      });

      osascript.stdin.end(script);
    });
  }

  private initializeMap() {
    const scriptMap = new Map<string, string>();
    const scriptDirectory = path.resolve(__dirname, "../scripts");
    const scriptFiles = fs
      .readdirSync(scriptDirectory)
      .filter((scriptFile) => scriptFile.endsWith(".applescript"));
    for (const scriptFile of scriptFiles) {
      const scriptPath = path.resolve(scriptDirectory, scriptFile);
      const script = fs.readFileSync(scriptPath).toString();
      scriptMap.set(scriptFile, script);
    }
    return scriptMap;
  }
}
