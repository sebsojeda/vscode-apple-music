import * as vscode from "vscode";
import AppleScriptRunner from "./apple-script-runner";
import { icons, notifications } from "./constants";

type Status = {
  a: string | null;
  m: string | null;
  t: string | null;
  s: string | null;
  v: number | null;
  d: string | null;
};

type StatusReponse = {
  status: "ok" | "error" | "exists";
};

export default class AppleMusicPlayer {
  public previousTrackButton: vscode.StatusBarItem;
  public playPauseTrackButton: vscode.StatusBarItem;
  public nextTrackButton: vscode.StatusBarItem;
  public titleTrackButton: vscode.StatusBarItem;
  public muteUnmuteTrackButton: vscode.StatusBarItem;

  private appleScriptRunner: AppleScriptRunner;
  private interval: NodeJS.Timeout | undefined;

  private album: string | null = null;
  private artist: string | null = null;
  private track: string | null = null;
  private artwork: string | null = null;
  private volume: number = 100;
  private _muted: boolean = false;
  private _playing: boolean = false;

  private showTrackInStatusBar: boolean;
  private trackUpdateInterval: number;
  private volumeStep: number;
  private showPreviousButton: boolean;
  private showPlayPauseButton: boolean;
  private showNextButton: boolean;
  private showMuteButton: boolean;

  constructor(appleScriptRunner: AppleScriptRunner) {
    const config = vscode.workspace.getConfiguration("vscodeAppleMusic");

    this.showTrackInStatusBar = config.get("showTrackInStatusBar", true);
    this.trackUpdateInterval = config.get("trackUpdateInterval", 1000);
    this.volumeStep = config.get("volumeStep", 6.25);
    this.showPreviousButton = config.get("showPreviousButton", true);
    this.showPlayPauseButton = config.get("showPlayPauseButton", true);
    this.showNextButton = config.get("showNextButton", true);
    this.showMuteButton = config.get("showMuteButton", true);

    this.previousTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      5
    );
    this.playPauseTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      4
    );
    this.nextTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      3
    );
    this.titleTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      2
    );
    this.muteUnmuteTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1
    );

    this.appleScriptRunner = appleScriptRunner;
  }

  /**
   * Update configuration
   */
  public updateConfiguration() {
    const config = vscode.workspace.getConfiguration("vscodeAppleMusic");

    this.showTrackInStatusBar = config.get("showTrackInStatusBar", true);
    this.trackUpdateInterval = config.get("trackUpdateInterval", 1000);
    this.volumeStep = config.get("volumeStep", 6.25);
    this.showPreviousButton = config.get("showPreviousButton", true);
    this.showPlayPauseButton = config.get("showPlayPauseButton", true);
    this.showNextButton = config.get("showNextButton", true);
    this.showMuteButton = config.get("showMuteButton", true);

    this.stopRefresh();
    this.show();
  }

  /**
   * Play previous track
   */
  public async playPreviousTrack() {
    this.stopRefresh();
    await this.syncPlayerState();
    if (!this.track || !this.artist) {
      vscode.window.showErrorMessage(notifications.notPlaying);
    } else {
      await this.appleScriptRunner.run("previous-track");
    }
    this.startRefresh();
  }

  /**
   * Play next track
   */
  public async playNextTrack() {
    this.stopRefresh();
    await this.syncPlayerState();
    if (!this.track || !this.artist) {
      vscode.window.showErrorMessage(notifications.notPlaying);
    } else {
      await this.appleScriptRunner.run("next-track");
    }
    this.startRefresh();
  }

  /**
   * Play/Pause track
   */
  public async playPauseTrack() {
    if (this.playing) {
      await this.pauseTrack();
    } else {
      await this.playTrack();
    }
  }

  /**
   * Play track
   */
  public async playTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("play");
    this.playing = true;
    this.startRefresh();
  }

  /**
   * Pause track
   */
  public async pauseTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("pause");
    this.playing = false;
    this.startRefresh();
  }

  /**
   * Open Apple Music
   */
  public open() {
    this.appleScriptRunner.run("open");
    this.show();
  }

  /**
   * Quit Apple Music
   */
  public quit() {
    this.appleScriptRunner.run("quit");
    this.hide();
  }

  /**
   * Mute/Unmute track
   */
  public async muteUnmuteTrack() {
    if (this.muted) {
      await this.unmuteTrack();
    } else {
      await this.muteTrack();
    }
  }

  /**
   * Mute track
   */
  public async muteTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("set-volume", "0");
    this.muted = true;
    this.startRefresh();
  }

  /**
   * Unmute track
   */
  public async unmuteTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("set-volume", `${this.volume}`);
    this.muted = false;
    this.startRefresh();
  }

  /**
   * Volume up
   */
  public async volumeUp() {
    this.stopRefresh();
    this.volume = Math.min(100, this.volume + this.volumeStep);
    await this.appleScriptRunner.run("set-volume", `${this.volume}`);
    this.startRefresh();
  }

  /**
   * Volume down
   */
  public async volumeDown() {
    this.stopRefresh();
    this.volume = Math.max(0, this.volume - this.volumeStep);
    await this.appleScriptRunner.run("set-volume", `${this.volume}`);
    this.startRefresh();
  }

  /**
   * Toggle repeat
   */
  public async toggleRepeat() {
    await this.appleScriptRunner.run("toggle-repeat");
  }

  /**
   * Toggle shuffle
   */
  public async toggleShuffle() {
    await this.appleScriptRunner.run("toggle-shuffle");
  }

  /**
   * Add to Library
   */
  public async addToLibrary() {
    await this.syncPlayerState();
    if (!this.track || !this.artist) {
      vscode.window.showErrorMessage(notifications.notPlaying);
      return;
    }
    let result = await this.appleScriptRunner.run("add-to-library");
    let { status } = JSON.parse(result) as StatusReponse;
    if (status !== "ok") {
      vscode.window.showErrorMessage(
        notifications.unableToAddToPlaylist("Library")
      );
    } else {
      vscode.window.showInformationMessage(
        notifications.addedToPlaylist("Library")
      );
    }
  }

  /**
   * Add to Playlist
   */
  public async addToPlaylist() {
    await this.syncPlayerState();
    if (!this.track || !this.artist) {
      vscode.window.showErrorMessage(notifications.notPlaying);
      return;
    }
    let choice = await this.choosePlaylist();
    if (!choice) {
      return;
    }
    let { playlist, create } = choice;
    vscode.window.withProgress(
      {
        title: notifications.addingToPlaylist(playlist),
        location: vscode.ProgressLocation.Notification,
      },
      async () => {
        if (create) {
          let { status } = await this.createPlaylist(playlist);
          if (status !== "ok") {
            if (status === "exists") {
              vscode.window.showErrorMessage(
                notifications.playlistExists(playlist)
              );
            } else {
              vscode.window.showErrorMessage(
                notifications.unableToAddToPlaylist(playlist)
              );
            }
            return;
          }
        }
        let result = await this.appleScriptRunner.run(
          "add-to-playlist",
          playlist
        );
        let { status } = JSON.parse(result) as StatusReponse;
        if (status !== "ok") {
          vscode.window.showErrorMessage(
            notifications.unableToAddToPlaylist(playlist)
          );
        } else {
          vscode.window.showInformationMessage(
            notifications.addedToPlaylist(playlist)
          );
        }
      }
    );
  }

  /**
   * Play playlist
   */
  public async playPlaylist(shuffle: boolean) {
    let result = await this.appleScriptRunner.run("get-all-playlists");
    let data = JSON.parse(result);
    let playlists = data.map(
      (playlist: string) => `${icons.playlist} ${playlist}`
    );
    let playlist: string | undefined = await vscode.window.showQuickPick(
      playlists,
      {
        placeHolder: "Select Playlist",
      }
    );
    if (!playlist) {
      return undefined;
    }
    playlist = playlist.replace(`${icons.playlist} `, "");
    if (shuffle) {
      await this.appleScriptRunner.run("shuffle-playlist", playlist);
    } else {
      await this.appleScriptRunner.run("play-playlist", playlist);
    }
  }

  /**
   * Show the player
   */
  public show() {
    this.startRefresh();
    this.showPreviousButton
      ? this.previousTrackButton.show()
      : this.previousTrackButton.hide();
    this.showPlayPauseButton
      ? this.playPauseTrackButton.show()
      : this.playPauseTrackButton.hide();
    this.showNextButton
      ? this.nextTrackButton.show()
      : this.nextTrackButton.hide();
    this.showTrackInStatusBar
      ? this.titleTrackButton.show()
      : this.titleTrackButton.hide();
    this.showMuteButton
      ? this.muteUnmuteTrackButton.show()
      : this.muteUnmuteTrackButton.hide();
  }

  /**
   * Hide the player
   */
  public hide() {
    this.stopRefresh();
    this.previousTrackButton.hide();
    this.playPauseTrackButton.hide();
    this.nextTrackButton.hide();
    this.titleTrackButton.hide();
    this.muteUnmuteTrackButton.hide();
  }

  /**
   * Dispose of the UI
   */
  public dispose() {
    this.stopRefresh();
    this.previousTrackButton.dispose();
    this.playPauseTrackButton.dispose();
    this.nextTrackButton.dispose();
    this.titleTrackButton.dispose();
    this.muteUnmuteTrackButton.dispose();
  }

  private async createPlaylist(name: string) {
    let result = await this.appleScriptRunner.run("create-playlist", name);
    let data = JSON.parse(result) as StatusReponse;
    return data;
  }

  private async choosePlaylist() {
    let result = await this.appleScriptRunner.run("get-user-playlists");
    let data = JSON.parse(result);
    let create = false;
    let playlists = data.map(
      (playlist: string) => `${icons.playlist} ${playlist}`
    );
    let playlist: string | undefined = await vscode.window.showQuickPick(
      [`${icons.plus} New Playlist`, ...playlists],
      {
        placeHolder: "Select Playlist",
      }
    );
    if (!playlist) {
      return undefined;
    }
    if (playlist.startsWith(icons.plus)) {
      create = true;
      playlist = await vscode.window.showInputBox({
        placeHolder: "Playlist Title",
      });
      if (!playlist) {
        return undefined;
      }
    } else {
      playlist = playlist.replace(`${icons.playlist} `, "");
    }
    return { playlist, create };
  }

  private stopRefresh() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private async startRefresh() {
    if (this.interval) {
      return;
    }
    await this.syncPlayerState();
    this.interval = setInterval(
      () => this.syncPlayerState(),
      this.trackUpdateInterval
    );
  }

  private async syncPlayerState() {
    const results = await this.appleScriptRunner.run("get-status");
    const status = JSON.parse(results) as Status;

    this.album = status.a;
    this.artist = status.m;
    this.track = status.t;
    this.artwork = status.d;
    this.playing = status.s === "playing";

    if (status.v) {
      if (status.v === 0) {
        this.muted = true;
      } else {
        this.muted = false;
        this.volume = status.v;
      }
    }

    if (this.track && this.artist) {
      let albumArtwork = this.artwork ?? "";
      let tooltip = new vscode.MarkdownString();
      tooltip.supportHtml = true;
      tooltip.appendMarkdown(
        `<table>
          <tr>
            <td>
              <img src="${albumArtwork}" width="48px" height="48px" />
            </td>
            <td>
              <div><b>${this.track}</b></div>
              <div><small>${this.artist} ${
          this.album ? `— ${this.album}` : ""
        }</small></div>
            </td>
          </tr>
        </table>`
      );
      let titleTrack = `${this.track} — ${this.artist}`;
      if (titleTrack.length > 50) {
        titleTrack = titleTrack.substring(0, 50 - 3) + "...";
      }
      this.titleTrackButton.text = titleTrack;
      this.titleTrackButton.tooltip = tooltip;
    } else {
      this.titleTrackButton.text = "Not Playing";
      this.titleTrackButton.tooltip = "Open";
    }

    this.previousTrackButton.text = icons.previousTrack;
    this.previousTrackButton.tooltip = "Previous";
    this.nextTrackButton.text = icons.nextTrack;
    this.nextTrackButton.tooltip = "Next";
  }

  get muted() {
    return this._muted;
  }

  set muted(muted: boolean) {
    this._muted = muted;
    if (muted) {
      this.muteUnmuteTrackButton.text = icons.mute;
      this.muteUnmuteTrackButton.tooltip = "Unmute";
    } else {
      this.muteUnmuteTrackButton.text = icons.unmute;
      this.muteUnmuteTrackButton.tooltip = "Mute";
    }
  }

  get playing() {
    return this._playing;
  }

  set playing(playing: boolean) {
    this._playing = playing;
    if (playing) {
      this.playPauseTrackButton.text = icons.pauseTrack;
      this.playPauseTrackButton.tooltip = "Pause";
    } else {
      this.playPauseTrackButton.text = icons.playTrack;
      this.playPauseTrackButton.tooltip = "Play";
    }
  }
}
