import * as vscode from "vscode";
import AppleScriptRunner from "./apple-script-runner";
import { icons } from "./constants";

type Status = {
  a: string | null;
  m: string | null;
  t: string | null;
  s: string | null;
  v: number | null;
  d: string | null;
};

export default class AppleMusicPlayer {
  public previousTrackButton: vscode.StatusBarItem;
  public playPauseTrackButton: vscode.StatusBarItem;
  public nextTrackButton: vscode.StatusBarItem;
  public titleTrackButton: vscode.StatusBarItem;
  public muteUnmuteTrackButton: vscode.StatusBarItem;

  private appleScriptRunner: AppleScriptRunner;
  private refreshInterval: number;
  private interval: NodeJS.Timeout | undefined;

  private album: string | null = null;
  private artist: string | null = null;
  private track: string | null = null;
  private artwork: string | null = null;
  private volume: number = 100;
  private _muted: boolean = false;
  private _playing: boolean = false;

  constructor(
    appleScriptRunner: AppleScriptRunner,
    refreshInterval: number = 1000
  ) {
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
    this.refreshInterval = refreshInterval;
  }

  /**
   * Play previous track
   */
  public async playPreviousTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("previous-track.applescript");
    this.startRefresh();
  }

  /**
   * Play next track
   */
  public async playNextTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("next-track.applescript");
    this.startRefresh();
  }

  /**
   * Play/Pause track
   */
  public async playPauseTrack() {
    this.stopRefresh();
    if (this.playing) {
      await this.appleScriptRunner.run("pause.applescript");
      this.playing = false;
    } else {
      await this.appleScriptRunner.run("play.applescript");
      this.playing = true;
    }
    this.startRefresh();
  }

  /**
   * Play track
   */
  public async playTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("play.applescript");
    this.playing = true;
    this.startRefresh();
  }

  /**
   * Pause track
   */
  public async pauseTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("pause.applescript");
    this.playing = false;
    this.startRefresh();
  }

  /**
   * Open Apple Music
   */
  public open() {
    this.appleScriptRunner.run("open.applescript");
  }

  /**
   * Mute/Unmute track
   */
  public async muteUnmuteTrack() {
    this.stopRefresh();
    if (this.muted) {
      await this.appleScriptRunner.run(
        "set-volume.applescript",
        `${this.volume}`
      );
      this.muted = false;
    } else {
      await this.appleScriptRunner.run("set-volume.applescript", "0");
      this.muted = true;
    }
    this.startRefresh();
  }

  /**
   * Mute track
   */
  public async muteTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run("set-volume.applescript", "0");
    this.muted = true;
    this.startRefresh();
  }

  /**
   * Unmute track
   */
  public async unmuteTrack() {
    this.stopRefresh();
    await this.appleScriptRunner.run(
      "set-volume.applescript",
      `${this.volume}`
    );
    this.muted = false;
    this.startRefresh();
  }

  /**
   * Volume up
   */
  public async volumeUp() {
    this.stopRefresh();
    this.volume = Math.min(100, this.volume + 6.25);
    await this.appleScriptRunner.run(
      "set-volume.applescript",
      `${this.volume}`
    );
    this.startRefresh();
  }

  /**
   * Volume down
   */
  public async volumeDown() {
    this.stopRefresh();
    this.volume = Math.max(0, this.volume - 6.25);
    await this.appleScriptRunner.run(
      "set-volume.applescript",
      `${this.volume}`
    );
    this.startRefresh();
  }

  /**
   * Toggle repeat
   */
  public async toggleRepeat() {
    this.stopRefresh();
    await this.appleScriptRunner.run("toggle-repeat.applescript");
    this.startRefresh();
  }

  /**
   * Toggle shuffle
   */
  public async toggleShuffle() {
    this.stopRefresh();
    await this.appleScriptRunner.run("toggle-shuffle.applescript");
    this.startRefresh();
  }

  /**
   * Initialize the player
   */
  public async init() {
    this.startRefresh();
    this.previousTrackButton.show();
    this.playPauseTrackButton.show();
    this.nextTrackButton.show();
    this.titleTrackButton.show();
    this.muteUnmuteTrackButton.show();
  }

  /**
   * Dispose of the UI
   */
  public dispose() {
    this.previousTrackButton.dispose();
    this.playPauseTrackButton.dispose();
    this.nextTrackButton.dispose();
    this.titleTrackButton.dispose();
    this.muteUnmuteTrackButton.dispose();
    this.stopRefresh();
  }

  private stopRefresh() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private async startRefresh() {
    await this.syncPlayerState();
    this.interval = setInterval(
      () => this.syncPlayerState(),
      this.refreshInterval
    );
  }

  private async syncPlayerState() {
    const results = await this.appleScriptRunner.run("get-status.applescript");
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
