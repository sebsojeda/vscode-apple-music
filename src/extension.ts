import * as vscode from "vscode";
import AppleMusicPlayer from "./apple-music-player";
import AppleScriptRunner from "./apple-script-runner";
import { commands } from "./constants";

let appleScriptRunner: AppleScriptRunner;
let player: AppleMusicPlayer;

type Config = {
  id: string;
  cb: () => void;
  ui?: vscode.StatusBarItem;
}[];

export function activate(context: vscode.ExtensionContext) {
  appleScriptRunner = new AppleScriptRunner();
  player = new AppleMusicPlayer(appleScriptRunner);

  const config: Config = [
    {
      id: commands.previousTrack,
      cb: () => player.playPreviousTrack(),
      ui: player.previousTrackButton,
    },
    {
      id: commands.playPauseTrack,
      cb: () => player.playPauseTrack(),
      ui: player.playPauseTrackButton,
    },
    {
      id: commands.playTrack,
      cb: () => player.playTrack(),
    },
    {
      id: commands.pauseTrack,
      cb: () => player.pauseTrack(),
    },
    {
      id: commands.nextTrack,
      cb: () => player.playNextTrack(),
      ui: player.nextTrackButton,
    },
    {
      id: commands.open,
      cb: () => player.open(),
      ui: player.titleTrackButton,
    },
    {
      id: commands.quit,
      cb: () => player.quit(),
    },
    {
      id: commands.muteUnmuteTrack,
      cb: () => player.muteUnmuteTrack(),
      ui: player.muteUnmuteTrackButton,
    },
    {
      id: commands.muteTrack,
      cb: () => player.muteTrack(),
    },
    {
      id: commands.unmuteTrack,
      cb: () => player.unmuteTrack(),
    },
    {
      id: commands.volumeUp,
      cb: () => player.volumeUp(),
    },
    {
      id: commands.volumeDown,
      cb: () => player.volumeDown(),
    },
    {
      id: commands.toggleRepeat,
      cb: () => player.toggleRepeat(),
    },
    {
      id: commands.toggleShuffle,
      cb: () => player.toggleShuffle(),
    },
    {
      id: commands.show,
      cb: () => player.show(),
    },
    {
      id: commands.hide,
      cb: () => player.hide(),
    },
    {
      id: commands.addToLibrary,
      cb: () => player.addToLibrary(),
    },
    {
      id: commands.addToPlaylist,
      cb: () => player.addToPlaylist(),
    },
    {
      id: commands.playPlaylist,
      cb: () => player.playPlaylist(false),
    },
    {
      id: commands.shufflePlaylist,
      cb: () => player.playPlaylist(true),
    },
  ];

  config.map((command) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command.id, command.cb)
    );
    if (command.ui) {
      command.ui.command = command.id;
      context.subscriptions.push(command.ui);
    }
  });

  if (
    vscode.workspace
      .getConfiguration("vscodeAppleMusic")
      .get("showOnStartup", true)
  ) {
    player.show();
  }

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("vscodeAppleMusic")) {
      player.updateConfiguration();
    }
  });
}

export function deactivate() {
  player.dispose();
}
