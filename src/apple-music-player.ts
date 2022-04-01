import * as vscode from "vscode";
import AppleScriptRunner from "./apple-script-runner";

export default class AppleMusicPlayer {
  public previousTrackButton: vscode.StatusBarItem;
  public pauseTrackButton: vscode.StatusBarItem;
  public nextTrackButton: vscode.StatusBarItem;
  public muteTrackButton: vscode.StatusBarItem;
  public titleTrackButton: vscode.StatusBarItem;

  private appleScriptRunner: AppleScriptRunner;

  constructor(appleScriptRunner: AppleScriptRunner) {
    this.previousTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      5
    );
    this.previousTrackButton.text = "$(chevron-left)";
    this.previousTrackButton.tooltip = "Previous";

    this.pauseTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      4
    );
    this.pauseTrackButton.text = "$(play)";
    this.pauseTrackButton.tooltip = "Pause";

    this.nextTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      3
    );
    this.nextTrackButton.text = "$(chevron-right)";
    this.nextTrackButton.tooltip = "Next";

    this.titleTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      2
    );
    this.titleTrackButton.text = "Not Playing";

    this.muteTrackButton = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1
    );
    this.muteTrackButton.text = "$(unmute)";
    this.muteTrackButton.tooltip = "Mute";

    this.appleScriptRunner = appleScriptRunner;
  }

  /**
   * Play the previous track
   */
  public playPreviousTrack() {
    this.appleScriptRunner.run("previous-track.applescript");
    this.updateState();
  }

  /**
   * Play the next track
   */
  public playNextTrack() {
    this.appleScriptRunner.run("next-track.applescript");
    this.updateState();
  }

  /**
   * Pause the track
   */
  public pauseTrack() {
    this.appleScriptRunner.run("pause.applescript");
    this.updateState();
  }

  /**
   * Play the track
   */
  public playTrack() {
    this.appleScriptRunner.run("play.applescript");
    this.updateState();
  }

  /**
   * Opens the track
   */
  public openTrack() {
    this.appleScriptRunner.run("open.applescript");
  }

  /**
   * Mute the track
   */
  public muteTrack() {
    this.appleScriptRunner.run("mute.applescript");
    this.updateState();
  }

  /**
   * Unmute the track
   */
  public unmuteTrack() {
    this.appleScriptRunner.run("unmute.applescript");
    this.updateState();
  }

  /**
   * Show the UI
   */
  public show() {
    this.previousTrackButton.show();
    this.pauseTrackButton.show();
    this.nextTrackButton.show();
    this.titleTrackButton.show();
    this.muteTrackButton.show();
  }

  /**
   * Update the UI state
   */
  public async updateState() {
    const result = await this.appleScriptRunner.run("get-status.applescript");
    const status = JSON.parse(result);

    if (status.s === "paused") {
      this.setPausedState();
    } else if (status.s === "playing") {
      this.setPlayingState();
    } else {
      this.setStoppedState();
    }

    if (status.v === 0) {
      this.setMutedState();
    } else {
      this.setUnmutedState();
    }

    let text = status.s ? `${status.n} - ${status.a}` : "Not Playing";
    this.titleTrackButton.tooltip = text;

    text = text.length > 50 ? text.substring(0, 50) + "..." : text;
    this.titleTrackButton.text = text;
  }

  private setPausedState() {
    this.pauseTrackButton.text = "$(play)";
    this.pauseTrackButton.tooltip = "Play";
    this.pauseTrackButton.command = "vscode-apple-music.playTrack";
  }

  private setPlayingState() {
    this.pauseTrackButton.text = "$(debug-pause)";
    this.pauseTrackButton.tooltip = "Pause";
    this.pauseTrackButton.command = "vscode-apple-music.pauseTrack";
  }

  private setStoppedState() {
    this.pauseTrackButton.text = "$(play)";
    this.pauseTrackButton.tooltip = "Play";
    this.pauseTrackButton.command = "vscode-apple-music.openTrack";
  }

  private setMutedState() {
    this.muteTrackButton.text = "$(mute)";
    this.muteTrackButton.tooltip = "Unmute";
    this.muteTrackButton.command = "vscode-apple-music.unmuteTrack";
  }

  private setUnmutedState() {
    this.muteTrackButton.text = "$(unmute)";
    this.muteTrackButton.tooltip = "Mute";
    this.muteTrackButton.command = "vscode-apple-music.muteTrack";
  }
}
