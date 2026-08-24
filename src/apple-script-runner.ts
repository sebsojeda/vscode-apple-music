import { spawn } from "child_process";
import * as fs from "fs";
import path = require("path");

export default class AppleScriptRunner {
  private scriptMap: Map<string, string>;

  constructor() {
    this.scriptMap = this.initializeMap();
  }

  public run(script: string, arg?: string): Promise<string> {
    let rawScript = `${script}.applescript`;
    if (this.scriptMap.has(rawScript)) {
      return this.runAppleScript(
        this.scriptMap.get(rawScript)!,
        arg === undefined ? [] : [arg]
      );
    }
    throw new Error("Script not found");
  }

  private runAppleScript(script: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const osascript = spawn("osascript", ["-", ...args], {
        stdio: "pipe",
      });
      let stdout = "";
      let stderr = "";

      osascript.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      osascript.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
      osascript.on("error", reject);
      osascript.on("close", (code, signal) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }
        reject(
          new Error(
            stderr.trim() ||
              `osascript exited with code ${code ?? "unknown"}${
                signal ? ` (${signal})` : ""
              }`
          )
        );
      });

      osascript.stdin.end(script);
    });
  }

  private initializeMap() {
    const scriptMap = new Map<string, string>();
    const scriptDirectory = path.resolve(__dirname, "../scripts");
    const scriptFiles = fs.readdirSync(scriptDirectory);
    scriptFiles.map((scriptFile) => {
      const scriptPath = path.resolve(scriptDirectory, scriptFile);
      const script = fs.readFileSync(scriptPath).toString();
      scriptMap.set(scriptFile, script);
    });
    return scriptMap;
  }
}
