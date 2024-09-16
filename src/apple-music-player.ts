import * as vscode from "vscode";
import AppleScriptRunner from "./apple-script-runner";

export default class AppleMusicPlayer {
  public previousTrackButton: vscode.StatusBarItem;
  public pauseTrackButton: vscode.StatusBarItem;
  public nextTrackButton: vscode.StatusBarItem;
  public muteTrackButton: vscode.StatusBarItem;
  public titleTrackButton: vscode.StatusBarItem;

  private appleScriptRunner: AppleScriptRunner;
  private volume: number = 100;
  private callback: () => void = () => {};

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
   * Send user action signal
   */
  public onUserAction(cb: () => void) {
    this.callback = cb;
  }

  /**
   * Play the previous track
   */
  public async playPreviousTrack() {
    // ensure previous track is played before updating
    this.callback();
    await this.appleScriptRunner.run("previous-track.applescript");
    this.updateState();
  }

  /**
   * Play the next track
   */
  public async playNextTrack() {
    // ensure next track is played before updating
    this.callback();
    await this.appleScriptRunner.run("next-track.applescript");
    this.updateState();
  }

  /**
   * Pause the track
   */
  public pauseTrack() {
    this.callback();
    this.appleScriptRunner.run("pause.applescript");
    this.setPausedState();
  }

  /**
   * Play the track
   */
  public playTrack() {
    this.callback();
    this.appleScriptRunner.run("play.applescript");
    this.setPlayingState();
  }

  /**
   * Open the player
   */
  public open() {
    this.appleScriptRunner.run("open.applescript");
  }

  /**
   * Mute the track
   */
  public muteTrack() {
    this.callback();
    this.appleScriptRunner.run("mute.applescript");
    this.setMutedState();
  }

  /**
   * Unmute the track
   */
  public unmuteTrack() {
    this.callback();
    this.appleScriptRunner.run("unmute.applescript", this.volume.toString());
    this.setUnmutedState();
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
    if (status.v !== 0) {
      this.volume = status.v;
    }

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

    let tooltip = new vscode.MarkdownString();
    tooltip.supportHtml = true;
    tooltip.supportThemeIcons = true;
    if (status.d) {
      tooltip.appendMarkdown(
        `<table>
          <tr>
            <td>
              <img src="${status.d}" width="48px" height="48px" style="display:inline;" />
            </td>
            <td>
              <div><b>${status.t}</b></div>
              <div><small>${status.m} — ${status.a}</small></div>
            </td>
          </tr>
        </table>`
      );
    }

    let text =
      status.t && status.m ? `${status.t} — ${status.m}` : "Not Playing";
    text = text.length > 50 ? text.substring(0, 50) + "..." : text;
    this.titleTrackButton.text = text;
    this.titleTrackButton.tooltip = tooltip;
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
    this.pauseTrackButton.command = "vscode-apple-music.open";
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
