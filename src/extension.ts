import * as vscode from "vscode";
import AppleMusicPlayer from "./apple-music-player";
import AppleScriptRunner from "./apple-script-runner";

let intervalId: NodeJS.Timeout;
let scriptRunner: AppleScriptRunner;
let player: AppleMusicPlayer;

export function activate(context: vscode.ExtensionContext) {
  scriptRunner = new AppleScriptRunner();
  player = new AppleMusicPlayer(scriptRunner);
  const config = {
    commands: [
      {
        id: "vscode-apple-music.previousTrack",
        cb: () => player.playPreviousTrack(),
        ui: player.previousTrackButton,
      },
      {
        id: "vscode-apple-music.nextTrack",
        cb: () => player.playNextTrack(),
        ui: player.nextTrackButton,
      },
      {
        id: "vscode-apple-music.pauseTrack",
        cb: () => player.pauseTrack(),
        ui: player.pauseTrackButton,
      },
      {
        id: "vscode-apple-music.playTrack",
        cb: () => player.playTrack(),
      },
      {
        id: "vscode-apple-music.open",
        cb: () => player.open(),
        ui: player.titleTrackButton,
      },
      {
        id: "vscode-apple-music.muteTrack",
        cb: () => player.muteTrack(),
        ui: player.muteTrackButton,
      },
      {
        id: "vscode-apple-music.unmuteTrack",
        cb: () => player.unmuteTrack(),
      },
    ],
  };

  config.commands.map((command) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command.id, command.cb)
    );

    if (command.ui) {
      command.ui.command = command.id;
      context.subscriptions.push(command.ui);
    }
  });

  intervalId = setInterval(() => player.updateState(), 5000);
  player.show();
}

export function deactivate() {
  clearInterval(intervalId);
}
