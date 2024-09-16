import * as fs from "fs";
import { runAppleScript } from "run-applescript";
import path = require("path");

export default class AppleScriptRunner {
  private scriptMap: Map<string, string>;

  constructor() {
    this.scriptMap = this.initializeMap();
  }

  public run(script: string, arg: string = "") {
    if (this.scriptMap.has(script)) {
      return runAppleScript(this.scriptMap.get(script)!.replace("$ARG$", arg));
    }
    throw new Error("Script not found");
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
