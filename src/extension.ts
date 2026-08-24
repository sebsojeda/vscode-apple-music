import * as vscode from "vscode";
import AppleMusicPlayer from "./apple-music-player";
import AppleScriptRunner from "./apple-script-runner";
import { commands } from "./constants";

let player: AppleMusicPlayer | undefined;

type CommandHandler = () => void | Promise<void>;

export function activate(context: vscode.ExtensionContext) {
  const appleScriptRunner = new AppleScriptRunner();
  player = new AppleMusicPlayer(appleScriptRunner, context);

  const register = (
    id: string,
    handler: CommandHandler,
    ui?: vscode.StatusBarItem
  ) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, async () => {
        try {
          await handler();
        } catch (error) {
          await player?.handleError(error);
        }
      })
    );
    if (ui) {
      ui.command = id;
    }
  };

  register(
    commands.previousTrack,
    () => player!.playPreviousTrack(),
    player.previousTrackButton
  );
  register(
    commands.playPauseTrack,
    () => player!.playPauseTrack(),
    player.playPauseTrackButton
  );
  register(commands.playTrack, () => player!.playTrack());
  register(commands.pauseTrack, () => player!.pauseTrack());
  register(
    commands.nextTrack,
    () => player!.playNextTrack(),
    player.nextTrackButton
  );
  register(
    commands.showNowPlaying,
    () => player!.showNowPlaying(),
    player.titleTrackButton
  );
  register(commands.open, () => player!.open());
  register(commands.quit, () => player!.quit());
  register(
    commands.muteUnmuteTrack,
    () => player!.muteUnmuteTrack(),
    player.muteUnmuteTrackButton
  );
  register(commands.muteTrack, () => player!.muteTrack());
  register(commands.unmuteTrack, () => player!.unmuteTrack());
  register(commands.volumeUp, () => player!.volumeUp());
  register(commands.volumeDown, () => player!.volumeDown());
  register(commands.setVolume, () => player!.chooseVolume());
  register(commands.toggleRepeat, () => player!.toggleRepeat());
  register(commands.setRepeatMode, () => player!.chooseRepeatMode());
  register(commands.toggleShuffle, () => player!.toggleShuffle());
  register(commands.favoriteTrack, () => player!.favoriteTrack());
  register(commands.unfavoriteTrack, () => player!.unfavoriteTrack());
  register(commands.toggleFavorite, () => player!.toggleFavorite());
  register(commands.seekForward, () => player!.seekForward());
  register(commands.seekBackward, () => player!.seekBackward());
  register(commands.restartTrack, () => player!.restartTrack());
  register(commands.copyTrackInfo, () => player!.copyTrackInfo());
  register(commands.revealCurrentTrack, () => player!.revealCurrentTrack());
  register(commands.searchLibrary, () => player!.searchLibrary());
  register(commands.show, () => player!.show());
  register(commands.hide, () => player!.hide());
  register(commands.toggleStatusBarControls, () =>
    player!.toggleStatusBarControls()
  );
  register(commands.addToLibrary, () => player!.addToLibrary());
  register(commands.addToPlaylist, () => player!.addToPlaylist());
  register(commands.playPlaylist, () => player!.playPlaylist());
  register(commands.shufflePlaylist, () => player!.playPlaylist(true));
  register(commands.selectWorkspaceSoundtrack, () =>
    player!.selectWorkspaceSoundtrack()
  );
  register(commands.clearWorkspaceSoundtrack, () =>
    player!.clearWorkspaceSoundtrack()
  );
  register(commands.playWorkspaceSoundtrack, () =>
    player!.playWorkspaceSoundtrack()
  );
  register(commands.manageWorkspaceSoundtrack, () =>
    player!.manageWorkspaceSoundtrack()
  );
  register(commands.checkSetup, () => player!.checkSetup());

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("vscodeAppleMusic")) {
        player?.updateConfiguration();
      }
    }),
    player
  );

  if (
    vscode.workspace
      .getConfiguration("vscodeAppleMusic")
      .get("showOnStartup", true)
  ) {
    player.show();
  }

  void player
    .startWorkspaceSoundtrackIfConfigured()
    .catch((error) => player?.handleError(error));
}

export function deactivate() {
  player = undefined;
}
