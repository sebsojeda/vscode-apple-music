import * as vscode from "vscode";
import AppleScriptRunner from "./apple-script-runner";
import { commands, icons, notifications } from "./constants";

type RepeatMode = "off" | "one" | "all";
type StatusBarLayout = "compact" | "full" | "trackOnly";

type StatusBarVisibility = {
  previous: boolean;
  playPause: boolean;
  next: boolean;
  track: boolean;
  mute: boolean;
};

type Status = {
  a: string | null;
  m: string | null;
  t: string | null;
  s: string | null;
  v: number | null;
  u: boolean | null;
  d: string | null;
  f: boolean | null;
  x: boolean | null;
  r: RepeatMode | null;
  i: string | null;
};

type StatusResponse = {
  status: "ok" | "error" | "exists";
  message?: string;
  code?: number;
};

type SetupResponse = StatusResponse & {
  version?: string;
};

type SearchResult = {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number | null;
  favorited: boolean | null;
};

type WorkspaceSoundtrack = {
  version: 1;
  playlistId: string;
  playlistName: string;
  shuffle: boolean;
};

type PlaylistRecord = {
  id: string;
  name: string;
};

type ActionItem = vscode.QuickPickItem & {
  run?: () => void | Promise<void>;
};

type PlaylistItem = vscode.QuickPickItem & {
  playlist: PlaylistRecord | undefined;
};

type PlaylistRecordItem = vscode.QuickPickItem & {
  playlist: PlaylistRecord;
};

type RepeatModeItem = vscode.QuickPickItem & {
  mode: RepeatMode;
};

const WORKSPACE_SOUNDTRACK_KEY = "vscodeAppleMusic.workspaceSoundtrack";

export default class AppleMusicPlayer {
  public previousTrackButton: vscode.StatusBarItem;
  public playPauseTrackButton: vscode.StatusBarItem;
  public nextTrackButton: vscode.StatusBarItem;
  public titleTrackButton: vscode.StatusBarItem;
  public muteUnmuteTrackButton: vscode.StatusBarItem;

  private readonly appleScriptRunner: AppleScriptRunner;
  private readonly context: vscode.ExtensionContext;
  private readonly output: vscode.OutputChannel;
  private interval: NodeJS.Timeout | undefined;
  private syncPromise: Promise<void> | undefined;
  private lastNowPlayingRenderKey: string | undefined;
  private visible = false;
  private disposed = false;

  private album: string | null = null;
  private artist: string | null = null;
  private track: string | null = null;
  private trackId: string | null = null;
  private artwork: string | null = null;
  private volume = 100;
  private favorited: boolean | null = null;
  private shuffleEnabled: boolean | null = null;
  private repeatMode: RepeatMode | null = null;
  private _muted: boolean | undefined;
  private _playing: boolean | undefined;

  private statusBarLayout: StatusBarLayout = "compact";
  private legacyStatusBarVisibility: StatusBarVisibility | undefined;
  private trackUpdateInterval = 1000;
  private volumeStep = 6.25;
  private seekStep = 15;
  private autoPlayWorkspaceSoundtrack = false;

  constructor(
    appleScriptRunner: AppleScriptRunner,
    context: vscode.ExtensionContext
  ) {
    this.appleScriptRunner = appleScriptRunner;
    this.context = context;
    this.output = vscode.window.createOutputChannel("Apple Music Player");
    this.readConfiguration();

    this.previousTrackButton = vscode.window.createStatusBarItem(
      "vscode-apple-music.previousTrackStatus",
      vscode.StatusBarAlignment.Left,
      5
    );
    this.playPauseTrackButton = vscode.window.createStatusBarItem(
      "vscode-apple-music.playPauseStatus",
      vscode.StatusBarAlignment.Left,
      4
    );
    this.nextTrackButton = vscode.window.createStatusBarItem(
      "vscode-apple-music.nextTrackStatus",
      vscode.StatusBarAlignment.Left,
      3
    );
    this.titleTrackButton = vscode.window.createStatusBarItem(
      "vscode-apple-music.nowPlayingStatus",
      vscode.StatusBarAlignment.Left,
      2
    );
    this.muteUnmuteTrackButton = vscode.window.createStatusBarItem(
      "vscode-apple-music.muteStatus",
      vscode.StatusBarAlignment.Left,
      1
    );

    this.previousTrackButton.name = "Apple Music: Previous Track";
    this.playPauseTrackButton.name = "Apple Music: Play/Pause";
    this.nextTrackButton.name = "Apple Music: Next Track";
    this.titleTrackButton.name = "Apple Music: Now Playing";
    this.muteUnmuteTrackButton.name = "Apple Music: Mute/Unmute";
    this.playing = false;
    this.muted = false;
    this.renderStatusBar();
  }

  public updateConfiguration() {
    this.readConfiguration();
    this.stopRefresh();
    this.applyVisibility();
    if (this.visible) {
      void this.startRefresh().catch((error) => this.handleBackgroundError(error));
    }
  }

  public async playPreviousTrack() {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    await this.runAndSync("previous-track");
  }

  public async playNextTrack() {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    await this.runAndSync("next-track");
  }

  public async playPauseTrack() {
    await this.syncPlayerState();
    if (this.playing) {
      await this.pauseTrack();
    } else {
      await this.playTrack();
    }
  }

  public async playTrack() {
    await this.runAndSync("play");
  }

  public async pauseTrack() {
    await this.runAndSync("pause");
  }

  public async open() {
    await this.appleScriptRunner.run("open");
  }

  public async quit() {
    await this.appleScriptRunner.run("quit");
    this.hide();
  }

  public async revealCurrentTrack() {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    const response = await this.appleScriptRunner.run("reveal-current-track");
    this.assertOk(response, "reveal the current track in Music");
  }

  public async muteUnmuteTrack() {
    await this.syncPlayerState();
    if (this.muted) {
      await this.unmuteTrack();
    } else {
      await this.muteTrack();
    }
  }

  public async muteTrack() {
    const response = await this.runAndSync("set-mute", "true");
    this.assertOk(response, "mute Apple Music");
  }

  public async unmuteTrack() {
    const response = await this.runAndSync("set-mute", "false");
    this.assertOk(response, "unmute Apple Music");
  }

  public async volumeUp() {
    await this.syncPlayerState();
    await this.setVolumeTo(Math.min(100, this.volume + this.volumeStep));
  }

  public async volumeDown() {
    await this.syncPlayerState();
    await this.setVolumeTo(Math.max(0, this.volume - this.volumeStep));
  }

  public async chooseVolume() {
    await this.syncPlayerState();
    const value = await vscode.window.showInputBox({
      title: "Apple Music Volume",
      prompt: "Enter a volume from 0 to 100",
      value: this.formatNumber(this.volume),
      validateInput: (input) => {
        const volume = Number(input);
        return Number.isFinite(volume) && volume >= 0 && volume <= 100
          ? null
          : "Volume must be a number from 0 to 100.";
      },
    });
    if (value === undefined) {
      return;
    }
    await this.setVolumeTo(Number(value));
    vscode.window.showInformationMessage(
      `Apple Music volume: ${this.formatNumber(this.volume)}%.`
    );
  }

  public async toggleRepeat() {
    await this.runAndSync("toggle-repeat");
    vscode.window.showInformationMessage(
      `Apple Music repeat: ${this.repeatLabel(this.repeatMode)}.`
    );
  }

  public async chooseRepeatMode() {
    await this.syncPlayerState();
    const modes: RepeatModeItem[] = [
      {
        label: "$(circle-slash) Off",
        description: this.repeatMode === "off" ? "Current" : undefined,
        mode: "off",
      },
      {
        label: "$(repeat) All",
        description: this.repeatMode === "all" ? "Current" : undefined,
        mode: "all",
      },
      {
        label: "$(symbol-numeric) One",
        description: this.repeatMode === "one" ? "Current" : undefined,
        mode: "one",
      },
    ];
    const choice = await vscode.window.showQuickPick(modes, {
      title: "Apple Music Repeat Mode",
      placeHolder: "Choose a repeat mode",
    });
    if (!choice) {
      return;
    }
    const response = await this.runAndSync("set-repeat", choice.mode);
    this.assertOk(response, "change the repeat mode");
    vscode.window.showInformationMessage(
      `Apple Music repeat: ${this.repeatLabel(this.repeatMode)}.`
    );
  }

  public async toggleShuffle() {
    await this.runAndSync("toggle-shuffle");
    const state = this.shuffleEnabled ? "enabled" : "disabled";
    vscode.window.showInformationMessage(`Apple Music shuffle ${state}.`);
  }

  public async favoriteTrack() {
    await this.setFavorite(true);
  }

  public async unfavoriteTrack() {
    await this.setFavorite(false);
  }

  public async toggleFavorite() {
    await this.syncPlayerState();
    if (!this.track) {
      vscode.window.showErrorMessage(notifications.noTrack);
      return;
    }
    await this.setFavorite(this.favorited !== true, true);
  }

  public async seekForward() {
    await this.seekBy(this.seekStep);
  }

  public async seekBackward() {
    await this.seekBy(-this.seekStep);
  }

  public async restartTrack() {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    const response = await this.runAndSync("seek", ["absolute", "0"]);
    this.assertOk(response, "restart the current track");
  }

  public async copyTrackInfo() {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    const parts = [`${this.track} — ${this.artistLabel()}`];
    if (this.album) {
      parts.push(this.album);
    }
    await vscode.env.clipboard.writeText(parts.join(" · "));
    vscode.window.showInformationMessage("Copied the current track information.");
  }

  public async showNowPlaying() {
    await this.syncPlayerState();
    this.startRefreshTimer();
    const actions: ActionItem[] = [];
    const separator = (label: string): ActionItem => ({
      label,
      kind: vscode.QuickPickItemKind.Separator,
    });

    if (this.track) {
      actions.push(separator(`${this.track} — ${this.artistLabel()}`));
      actions.push({
        label: this.playing ? "$(debug-pause) Pause" : "$(play) Play",
        run: () => this.playPauseTrack(),
      });
      actions.push({
        label: this.favorited
          ? `${icons.unfavoriteAction} Unfavorite Track`
          : `${icons.favoriteAction} Favorite Track`,
        run: () => this.toggleFavorite(),
      });
      actions.push({
        label: `${icons.plus} Add to Library`,
        run: () => this.addToLibrary(),
      });
      actions.push({
        label: `${icons.playlist} Add to Playlist…`,
        run: () => this.addToPlaylist(),
      });
      actions.push({
        label: `${icons.copy} Copy Track Info`,
        run: () => this.copyTrackInfo(),
      });

      actions.push(separator("Playback"));
      actions.push({
        label: `${icons.rewind} Back ${this.formatNumber(this.seekStep)} Seconds`,
        run: () => this.seekBackward(),
      });
      actions.push({
        label: `${icons.restart} Restart Track`,
        run: () => this.restartTrack(),
      });
      actions.push({
        label: `${icons.forward} Forward ${this.formatNumber(
          this.seekStep
        )} Seconds`,
        run: () => this.seekForward(),
      });
    }

    actions.push(separator("Music"));
    actions.push({
      label: `${icons.search} Search Apple Music…`,
      run: () => this.searchLibrary(),
    });
    actions.push({
      label: `${icons.settings} Set Volume…`,
      description: `${this.formatNumber(this.volume)}%${
        this.muted ? " · Muted" : ""
      }`,
      run: () => this.chooseVolume(),
    });
    actions.push({
      label: "$(list-random) Toggle Shuffle",
      description:
        this.shuffleEnabled === null
          ? "Unknown"
          : this.shuffleEnabled
          ? "On"
          : "Off",
      run: () => this.toggleShuffle(),
    });
    actions.push({
      label: "$(repeat) Set Repeat Mode…",
      description: this.repeatLabel(this.repeatMode),
      run: () => this.chooseRepeatMode(),
    });
    if (this.track) {
      actions.push({
        label: `${icons.open} Reveal Current Track in Music`,
        run: () => this.revealCurrentTrack(),
      });
    } else {
      actions.push({
        label: `${icons.open} Open Music`,
        run: () => this.open(),
      });
    }

    const choice = await vscode.window.showQuickPick(actions, {
      title: "Apple Music",
      placeHolder: this.track
        ? `${this.track} — ${this.artistLabel()}`
        : "Choose an Apple Music action",
      matchOnDescription: true,
    });
    await choice?.run?.();
  }

  public async addToLibrary() {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    const result = await this.appleScriptRunner.run("add-to-library");
    const { status } = this.parseStatusResponse(
      result,
      "add-to-library response"
    );
    if (status !== "ok") {
      vscode.window.showErrorMessage(
        notifications.unableToAddToPlaylist("Library")
      );
      return;
    }
    vscode.window.showInformationMessage(
      notifications.addedToPlaylist("Library")
    );
  }

  public async addToPlaylist() {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    const choice = await this.choosePlaylistForAddition();
    if (!choice) {
      return;
    }
    const { playlist, reference, value, create } = choice;
    await vscode.window.withProgress(
      {
        title: notifications.addingToPlaylist(playlist),
        location: vscode.ProgressLocation.Notification,
      },
      async () => {
        if (create) {
          const { status } = await this.createPlaylist(playlist);
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
        const result = await this.appleScriptRunner.run(
          "add-to-playlist",
          [reference, value]
        );
        const { status } = this.parseStatusResponse(
          result,
          "add-to-playlist response"
        );
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

  public async playPlaylist(shuffle?: boolean) {
    const playlist = await this.choosePlaylist("Select Playlist", "all");
    if (!playlist) {
      return;
    }
    await this.playPlaylistById(playlist.id, shuffle, playlist.name);
  }

  public async searchLibrary() {
    const query = await vscode.window.showInputBox({
      title: "Search Apple Music",
      prompt: "Search tracks, artists, albums, and playlists",
      placeHolder: "Enter a song, artist, album, or playlist",
    });
    if (!query?.trim()) {
      return;
    }

    const searchQuery = query.trim();
    const [rawResults, playlists] = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "Searching Apple Music…",
      },
      () =>
        Promise.all([
          this.appleScriptRunner.run("search-library", searchQuery),
          this.getPlaylistRecords("all"),
        ])
    );
    const tracks = this.parseSearchResults(rawResults);
    const normalizeSearchText = (value: string) =>
      value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();
    const playlistSearchTerms = normalizeSearchText(searchQuery).split(/\s+/);
    const matchingPlaylists = playlists.filter((playlist) => {
      const playlistName = normalizeSearchText(playlist.name);
      return playlistSearchTerms.every((term) => playlistName.includes(term));
    });
    if (tracks.length === 0 && matchingPlaylists.length === 0) {
      vscode.window.showInformationMessage(
        `No Apple Music tracks or playlists found for “${searchQuery}”.`
      );
      return;
    }

    const actions: ActionItem[] = [];
    if (matchingPlaylists.length > 0) {
      actions.push({
        label: "Playlists",
        kind: vscode.QuickPickItemKind.Separator,
      });
      const playlistNameCounts = new Map<string, number>();
      for (const playlist of matchingPlaylists) {
        playlistNameCounts.set(
          playlist.name,
          (playlistNameCounts.get(playlist.name) ?? 0) + 1
        );
      }
      actions.push(
        ...matchingPlaylists.map<ActionItem>((playlist) => ({
          label: `${icons.playlist} ${playlist.name}`,
          description: "Playlist · Shuffle unchanged",
          detail:
            (playlistNameCounts.get(playlist.name) ?? 0) > 1
              ? `Duplicate name · ID …${playlist.id.slice(-6)}`
              : undefined,
          run: () =>
            this.playPlaylistById(playlist.id, undefined, playlist.name),
        }))
      );
    }
    if (tracks.length > 0) {
      actions.push({
        label: "Tracks",
        kind: vscode.QuickPickItemKind.Separator,
      });
      actions.push(
        ...tracks.map<ActionItem>((track) => ({
          label: `${track.favorited ? "$(star-full) " : ""}${track.name}`,
          description: track.artist || undefined,
          detail: [
            track.album,
            track.duration !== null && track.duration > 0
              ? this.formatDuration(track.duration)
              : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
          run: async () => {
            const response = await this.runAndSync("play-track", track.id);
            this.assertOk(response, `play “${track.name}”`);
          },
        }))
      );
    }

    const choice = await vscode.window.showQuickPick(actions, {
      title: `Apple Music — ${searchQuery}`,
      placeHolder: "Choose a track or playlist",
      matchOnDescription: true,
      matchOnDetail: true,
    });
    await choice?.run?.();
  }

  public async selectWorkspaceSoundtrack() {
    if (!this.hasWorkspace()) {
      vscode.window.showInformationMessage(notifications.noWorkspace);
      return;
    }
    const playlist = await this.chooseWorkspacePlaylist();
    if (!playlist) {
      return;
    }
    const mode = await vscode.window.showQuickPick(
      [
        {
          label: "$(play) Play in Order",
          description: "Keep the playlist's normal order",
          shuffle: false,
        },
        {
          label: "$(list-random) Shuffle",
          description: "Shuffle whenever the workspace soundtrack starts",
          shuffle: true,
        },
      ],
      {
        title: "Workspace Soundtrack Playback",
        placeHolder: "Choose how this playlist should play",
      }
    );
    if (!mode) {
      return;
    }
    const soundtrack: WorkspaceSoundtrack = {
      version: 1,
      playlistId: playlist.id,
      playlistName: playlist.name,
      shuffle: mode.shuffle,
    };
    await this.context.workspaceState.update(
      WORKSPACE_SOUNDTRACK_KEY,
      soundtrack
    );
    const playNow = await vscode.window.showInformationMessage(
      `Workspace soundtrack set to “${playlist.name}”${
        mode.shuffle ? " (shuffle)" : ""
      }.`,
      "Play Now"
    );
    if (playNow === "Play Now") {
      await this.playWorkspaceSoundtrack();
    }
  }

  public async manageWorkspaceSoundtrack() {
    if (!this.hasWorkspace()) {
      vscode.window.showInformationMessage(notifications.noWorkspace);
      return;
    }
    const soundtrack = this.getWorkspaceSoundtrack();
    const actions: ActionItem[] = [
      {
        label: soundtrack
          ? `${icons.workspace} Change Workspace Soundtrack…`
          : `${icons.workspace} Choose Workspace Soundtrack…`,
        description: this.workspaceSoundtrackDescription(),
        run: () => this.selectWorkspaceSoundtrack(),
      },
    ];
    if (soundtrack) {
      actions.push(
        {
          label: "$(play) Play Workspace Soundtrack",
          run: () => this.playWorkspaceSoundtrack(),
        },
        {
          label: "$(trash) Clear Workspace Soundtrack",
          run: () => this.clearWorkspaceSoundtrack(),
        }
      );
    }
    const choice = await vscode.window.showQuickPick(actions, {
      title: "Workspace Soundtrack",
      placeHolder: "Choose a workspace soundtrack action",
      matchOnDescription: true,
    });
    await choice?.run?.();
  }

  public async clearWorkspaceSoundtrack() {
    if (!this.getWorkspaceSoundtrack()) {
      vscode.window.showInformationMessage(
        "This workspace does not have an Apple Music soundtrack."
      );
      return;
    }
    await this.context.workspaceState.update(
      WORKSPACE_SOUNDTRACK_KEY,
      undefined
    );
    vscode.window.showInformationMessage("Cleared the workspace soundtrack.");
  }

  public async playWorkspaceSoundtrack() {
    const soundtrack = this.getWorkspaceSoundtrack();
    if (!soundtrack) {
      vscode.window.showInformationMessage(
        "Choose an Apple Music soundtrack for this workspace first."
      );
      return;
    }
    await this.playStoredWorkspaceSoundtrack(soundtrack);
  }

  public async startWorkspaceSoundtrackIfConfigured() {
    if (!this.autoPlayWorkspaceSoundtrack || !vscode.workspace.isTrusted) {
      return;
    }
    const soundtrack = this.getWorkspaceSoundtrack();
    if (!soundtrack) {
      return;
    }
    await this.playStoredWorkspaceSoundtrack(soundtrack);
  }

  public async checkSetup() {
    const rawResult = await this.appleScriptRunner.run("check-setup");
    const result = this.parseStatusResponse<SetupResponse>(
      rawResult,
      "setup check response"
    );
    if (result.status !== "ok") {
      throw new Error(
        result.message ||
          `Apple Music did not pass the setup check${
            result.code === undefined ? "" : ` (${result.code})`
          }.`
      );
    }
    await this.syncPlayerState();
    this.startRefreshTimer();
    const musicVersion =
      typeof result.version === "string" ? result.version : undefined;
    vscode.window.showInformationMessage(
      `Apple Music${musicVersion ? ` ${musicVersion}` : ""} is available, and Automation access is working.`
    );
  }

  public show() {
    this.visible = true;
    this.applyVisibility();
    void this.startRefresh().catch((error) => this.handleBackgroundError(error));
  }

  public hide() {
    this.visible = false;
    this.stopRefresh();
    this.previousTrackButton.hide();
    this.playPauseTrackButton.hide();
    this.nextTrackButton.hide();
    this.titleTrackButton.hide();
    this.muteUnmuteTrackButton.hide();
  }

  public toggleStatusBarControls() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.hide();
    this.previousTrackButton.dispose();
    this.playPauseTrackButton.dispose();
    this.nextTrackButton.dispose();
    this.titleTrackButton.dispose();
    this.muteUnmuteTrackButton.dispose();
    this.output.dispose();
    this.appleScriptRunner.dispose();
  }

  public async handleError(error: unknown) {
    const message = this.errorMessage(error);
    this.output.appendLine(`[${new Date().toISOString()}] ${message}`);

    if (
      message.includes("-1743") ||
      /not authorized|not permitted|automation/i.test(message)
    ) {
      const action = await vscode.window.showErrorMessage(
        "Apple Music control is blocked. Allow your editor to control Music in macOS System Settings → Privacy & Security → Automation.",
        "Open Automation Settings",
        "Retry"
      );
      if (action === "Open Automation Settings") {
        await vscode.env.openExternal(
          vscode.Uri.parse(
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"
          )
        );
      } else if (action === "Retry") {
        await vscode.commands.executeCommand(commands.checkSetup);
      }
      return;
    }

    const action = await vscode.window.showErrorMessage(
      `Apple Music: ${message}`,
      "Check Setup",
      "Show Log"
    );
    if (action === "Check Setup") {
      await vscode.commands.executeCommand(commands.checkSetup);
    } else if (action === "Show Log") {
      this.output.show(true);
    }
  }

  private readConfiguration() {
    const config = vscode.workspace.getConfiguration("vscodeAppleMusic");
    const configuredLayout = this.explicitConfigurationValue<unknown>(
      config,
      "statusBarLayout"
    );
    this.statusBarLayout = this.isStatusBarLayout(configuredLayout)
      ? configuredLayout
      : config.get<StatusBarLayout>("statusBarLayout", "compact");

    const legacyKeys = [
      "showTrackInStatusBar",
      "showPreviousButton",
      "showPlayPauseButton",
      "showNextButton",
      "showMuteButton",
    ];
    const hasLegacyConfiguration =
      configuredLayout === undefined &&
      legacyKeys.some(
        (key) =>
          this.explicitConfigurationValue<unknown>(config, key) !== undefined
      );
    this.legacyStatusBarVisibility = hasLegacyConfiguration
      ? {
          previous: config.get("showPreviousButton", true),
          playPause: config.get("showPlayPauseButton", true),
          next: config.get("showNextButton", true),
          track: config.get("showTrackInStatusBar", true),
          mute: config.get("showMuteButton", true),
        }
      : undefined;

    // Keep honoring the pre-1.8 polling setting while it is absent from the
    // public configuration surface. This compatibility path can be removed in 2.0.
    this.trackUpdateInterval = this.clamp(
      config.get("trackUpdateInterval", 1000),
      250,
      60_000
    );
    this.volumeStep = this.clamp(config.get("volumeStep", 6.25), 0.5, 100);
    this.seekStep = this.clamp(config.get("seekStep", 15), 1, 600);
    this.autoPlayWorkspaceSoundtrack = config.get(
      "autoPlayWorkspaceSoundtrack",
      false
    );
  }

  private applyVisibility() {
    if (!this.visible || this.disposed) {
      return;
    }
    const visibility =
      this.legacyStatusBarVisibility ?? this.statusBarVisibility();
    this.setStatusItemVisibility(
      this.previousTrackButton,
      visibility.previous
    );
    this.setStatusItemVisibility(
      this.playPauseTrackButton,
      visibility.playPause
    );
    this.setStatusItemVisibility(this.nextTrackButton, visibility.next);
    this.setStatusItemVisibility(this.titleTrackButton, visibility.track);
    this.setStatusItemVisibility(this.muteUnmuteTrackButton, visibility.mute);
  }

  private statusBarVisibility(): StatusBarVisibility {
    switch (this.statusBarLayout) {
      case "full":
        return {
          previous: true,
          playPause: true,
          next: true,
          track: true,
          mute: true,
        };
      case "trackOnly":
        return {
          previous: false,
          playPause: false,
          next: false,
          track: true,
          mute: false,
        };
      case "compact":
      default:
        return {
          previous: false,
          playPause: true,
          next: false,
          track: true,
          mute: false,
        };
    }
  }

  private setStatusItemVisibility(item: vscode.StatusBarItem, visible: boolean) {
    visible ? item.show() : item.hide();
  }

  private explicitConfigurationValue<T>(
    config: vscode.WorkspaceConfiguration,
    key: string
  ): T | undefined {
    const inspected = config.inspect<T>(key);
    return (
      inspected?.workspaceFolderValue ??
      inspected?.workspaceValue ??
      inspected?.globalValue
    );
  }

  private isStatusBarLayout(value: unknown): value is StatusBarLayout {
    return value === "compact" || value === "full" || value === "trackOnly";
  }

  private async setVolumeTo(volume: number) {
    const target = this.clamp(volume, 0, 100);
    await this.runAndSync("set-volume", `${target}`);
  }

  private async setFavorite(favorited: boolean, stateIsCurrent = false) {
    if (!stateIsCurrent && !(await this.ensureCurrentTrack())) {
      return;
    }
    const favoriteArgument = favorited ? "true" : "false";
    const response = await this.runAndSync(
      "set-favorite",
      [
        favoriteArgument,
        this.trackId ?? "",
        this.track ?? "",
        this.artist ?? "",
      ]
    );
    this.assertOk(
      response,
      favorited ? "favorite the current track" : "unfavorite the current track"
    );
    vscode.window.showInformationMessage(
      favorited ? "Favorited the current track." : "Unfavorited the current track."
    );
  }

  private async seekBy(seconds: number) {
    if (!(await this.ensureCurrentTrack())) {
      return;
    }
    const response = await this.runAndSync("seek", [
      "relative",
      `${seconds}`,
    ]);
    this.assertOk(response, "seek in the current track");
  }

  private async createPlaylist(name: string) {
    const result = await this.appleScriptRunner.run("create-playlist", name);
    return this.parseStatusResponse(result, "create-playlist response");
  }

  private async choosePlaylistForAddition() {
    const playlists = await this.getPlaylistRecords("user");
    const nameCounts = new Map<string, number>();
    for (const playlist of playlists) {
      nameCounts.set(playlist.name, (nameCounts.get(playlist.name) ?? 0) + 1);
    }
    const items: PlaylistItem[] = playlists.map((playlist) => ({
      label: `${icons.playlist} ${playlist.name}`,
      description:
        (nameCounts.get(playlist.name) ?? 0) > 1
          ? `Duplicate name · ID …${playlist.id.slice(-6)}`
          : undefined,
      playlist,
    }));
    const choice = await vscode.window.showQuickPick<PlaylistItem>(
      [
        {
          label: `${icons.plus} New Playlist`,
          playlist: undefined,
        },
        ...items,
      ],
      {
        title: "Add Current Track to Playlist",
        placeHolder: "Select a playlist",
      }
    );
    if (!choice) {
      return undefined;
    }
    if (choice.playlist) {
      return {
        playlist: choice.playlist.name,
        reference: "id" as const,
        value: choice.playlist.id,
        create: false,
      };
    }
    const playlist = await vscode.window.showInputBox({
      title: "Create Apple Music Playlist",
      prompt: "Enter a playlist title",
      placeHolder: "Playlist Title",
      validateInput: (value) =>
        value.trim() ? null : "Playlist title cannot be empty.",
    });
    if (!playlist?.trim()) {
      return undefined;
    }
    return {
      playlist: playlist.trim(),
      reference: "name" as const,
      value: playlist.trim(),
      create: true,
    };
  }

  private async choosePlaylist(title: string, scope: "all" | "user") {
    const playlists = await this.getPlaylistRecords(scope);
    if (playlists.length === 0) {
      vscode.window.showInformationMessage("No Apple Music playlists were found.");
      return undefined;
    }
    const nameCounts = new Map<string, number>();
    for (const playlist of playlists) {
      nameCounts.set(playlist.name, (nameCounts.get(playlist.name) ?? 0) + 1);
    }
    const choice = await vscode.window.showQuickPick<PlaylistRecordItem>(
      playlists.map((playlist) => ({
        label: `${icons.playlist} ${playlist.name}`,
        description:
          (nameCounts.get(playlist.name) ?? 0) > 1
            ? `Duplicate name · ID …${playlist.id.slice(-6)}`
            : undefined,
        playlist,
      })),
      {
        title,
        placeHolder: "Select a playlist",
        matchOnDescription: true,
      }
    );
    return choice?.playlist;
  }

  private async chooseWorkspacePlaylist() {
    return this.choosePlaylist("Choose a Workspace Soundtrack", "all");
  }

  private async getPlaylistRecords(scope: "all" | "user") {
    const rawResult = await this.appleScriptRunner.run(
      "get-playlist-records",
      scope
    );
    const parsed = this.parseJson<unknown>(
      rawResult,
      "playlist records response"
    );
    if (!Array.isArray(parsed)) {
      if (this.isRecord(parsed) && parsed.status === "error") {
        const message =
          typeof parsed.message === "string"
            ? parsed.message
            : "Unable to read Apple Music playlists.";
        const code =
          typeof parsed.code === "number" ? ` (${parsed.code})` : "";
        throw new Error(`${message}${code}`);
      }
      throw new Error("Apple Music returned invalid playlist records.");
    }
    const playlists: PlaylistRecord[] = parsed.flatMap((item) =>
      this.isRecord(item) &&
      typeof item.id === "string" &&
      item.id &&
      typeof item.name === "string" &&
      item.name
        ? [{ id: item.id, name: item.name }]
        : []
    );
    return playlists;
  }

  private async playPlaylistById(
    playlistId: string,
    shuffle: boolean | undefined,
    displayName: string
  ) {
    const response = await this.runAndSync("play-playlist", [
      playlistId,
      shuffle === undefined ? "preserve" : shuffle ? "true" : "false",
    ]);
    this.assertOk(response, `play “${displayName}”`);
  }

  private async playStoredWorkspaceSoundtrack(
    soundtrack: WorkspaceSoundtrack
  ) {
    await this.playPlaylistById(
      soundtrack.playlistId,
      soundtrack.shuffle,
      soundtrack.playlistName
    );
  }

  private stopRefresh() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private async startRefresh() {
    if (this.interval || !this.visible || this.disposed) {
      return;
    }
    await this.syncPlayerState();
    this.startRefreshTimer();
  }

  private startRefreshTimer() {
    if (this.interval || !this.visible || this.disposed) {
      return;
    }
    this.interval = setInterval(() => {
      void this.syncPlayerState().catch((error) =>
        this.handleBackgroundError(error)
      );
    }, this.trackUpdateInterval);
  }

  private async runAndSync(
    script: string,
    args?: string | readonly string[]
  ) {
    this.stopRefresh();
    try {
      const result = await this.appleScriptRunner.run(script, args);
      await this.syncPlayerState();
      return result;
    } finally {
      this.startRefreshTimer();
    }
  }

  private async syncPlayerState() {
    if (this.syncPromise) {
      return this.syncPromise;
    }
    const sync = this.readAndApplyPlayerState();
    this.syncPromise = sync;
    try {
      await sync;
    } finally {
      if (this.syncPromise === sync) {
        this.syncPromise = undefined;
      }
    }
  }

  private async readAndApplyPlayerState() {
    const results = await this.appleScriptRunner.run("get-status");
    const status = this.parsePlayerStatus(results);

    this.album = status.a;
    this.artist = status.m;
    this.track = status.t;
    this.trackId = status.i;
    this.artwork = status.d;
    this.playing = status.s === "playing";
    this.favorited = typeof status.f === "boolean" ? status.f : null;
    this.shuffleEnabled = typeof status.x === "boolean" ? status.x : null;
    this.repeatMode = this.isRepeatMode(status.r) ? status.r : null;

    if (typeof status.v === "number" && Number.isFinite(status.v)) {
      this.volume = this.clamp(status.v, 0, 100);
    }
    if (typeof status.u === "boolean") {
      this.muted = status.u;
    } else if (typeof status.v === "number") {
      this.muted = this.volume === 0;
    }

    this.renderStatusBar();
  }

  private renderStatusBar() {
    if (this.disposed) {
      return;
    }
    const renderKey = JSON.stringify([
      this.trackId,
      this.track,
      this.artist,
      this.album,
      this.artwork,
      this.favorited,
    ]);
    if (renderKey === this.lastNowPlayingRenderKey) {
      return;
    }
    this.lastNowPlayingRenderKey = renderKey;

    if (this.track) {
      const artist = this.artistLabel();
      const albumArtwork = this.artwork
        ? vscode.Uri.file(this.artwork).toString()
        : undefined;
      const tooltip = new vscode.MarkdownString();
      tooltip.supportHtml = true;
      tooltip.appendMarkdown(
        `<table>
          <tr>
            ${
              albumArtwork
                ? `<td><img src="${albumArtwork}" width="48" height="48" /></td>`
                : ""
            }
            <td>
              <div><b>${this.escapeHtml(this.track)}</b></div>
              <div><small>${this.escapeHtml(artist)}${
          this.album ? ` — ${this.escapeHtml(this.album)}` : ""
        }</small></div>
            </td>
          </tr>
        </table>`
      );
      let titleTrack = `${this.favorited ? "$(star-full) " : ""}${
        this.track
      } — ${artist}`;
      if (titleTrack.length > 50) {
        titleTrack = `${titleTrack.substring(0, 47)}...`;
      }
      this.titleTrackButton.text = titleTrack;
      this.titleTrackButton.tooltip = tooltip;
      this.titleTrackButton.accessibilityInformation = {
        label: `Now playing ${this.track} by ${artist}. Open Apple Music actions.`,
      };
    } else {
      this.titleTrackButton.text = "$(music) Not Playing";
      this.titleTrackButton.tooltip = "Open Apple Music actions";
      this.titleTrackButton.accessibilityInformation = {
        label: "Apple Music is not playing. Open Apple Music actions.",
      };
    }

    this.previousTrackButton.text = icons.previousTrack;
    this.previousTrackButton.tooltip = "Previous Track";
    this.previousTrackButton.accessibilityInformation = {
      label: "Apple Music previous track",
    };
    this.nextTrackButton.text = icons.nextTrack;
    this.nextTrackButton.tooltip = "Next Track";
    this.nextTrackButton.accessibilityInformation = {
      label: "Apple Music next track",
    };
  }

  private async ensureCurrentTrack() {
    await this.syncPlayerState();
    if (this.track) {
      return true;
    }
    vscode.window.showErrorMessage(notifications.noTrack);
    return false;
  }

  private getWorkspaceSoundtrack(): WorkspaceSoundtrack | undefined {
    const value = this.context.workspaceState.get<unknown>(
      WORKSPACE_SOUNDTRACK_KEY
    );
    if (!this.isRecord(value) || typeof value.shuffle !== "boolean") {
      return undefined;
    }
    if (
      value.version === 1 &&
      typeof value.playlistId === "string" &&
      value.playlistId &&
      typeof value.playlistName === "string" &&
      value.playlistName
    ) {
      return {
        version: 1,
        playlistId: value.playlistId,
        playlistName: value.playlistName,
        shuffle: value.shuffle,
      };
    }
    return undefined;
  }

  private workspaceSoundtrackDescription() {
    const soundtrack = this.getWorkspaceSoundtrack();
    if (!soundtrack) {
      return undefined;
    }
    return `${soundtrack.playlistName}${
      soundtrack.shuffle ? " · Shuffle" : ""
    }`;
  }

  private hasWorkspace() {
    return Boolean(
      vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length
    );
  }

  private assertOk(rawResponse: string, action: string) {
    const response = this.parseStatusResponse(
      rawResponse,
      `${action} response`
    );
    if (response.status !== "ok") {
      const detail = response.message
        ? `${response.message}${
            response.code === undefined ? "" : ` (${response.code})`
          }`
        : `Unable to ${action}.`;
      throw new Error(detail);
    }
  }

  private parseJson<T>(value: string, description: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(
        `Apple Music returned an invalid ${description}: ${this.errorMessage(
          error
        )}`
      );
    }
  }

  private parseStatusResponse<T extends StatusResponse = StatusResponse>(
    value: string,
    description: string
  ): T {
    const parsed = this.parseJson<unknown>(value, description);
    if (
      !this.isRecord(parsed) ||
      (parsed.status !== "ok" &&
        parsed.status !== "error" &&
        parsed.status !== "exists")
    ) {
      throw new Error(`Apple Music returned an invalid ${description}.`);
    }
    return parsed as T;
  }

  private parsePlayerStatus(value: string): Status {
    const parsed = this.parseJson<unknown>(value, "player status");
    if (!this.isRecord(parsed)) {
      throw new Error("Apple Music returned an invalid player status.");
    }
    return {
      a: this.nullableString(parsed.a),
      m: this.nullableString(parsed.m),
      t: this.nullableString(parsed.t),
      s: this.nullableString(parsed.s),
      v: this.nullableNumber(parsed.v),
      u: this.nullableBoolean(parsed.u),
      d: this.nullableString(parsed.d),
      f: this.nullableBoolean(parsed.f),
      x: this.nullableBoolean(parsed.x),
      r: this.isRepeatMode(parsed.r) ? parsed.r : null,
      i: this.nullableString(parsed.i),
    };
  }

  private nullableString(value: unknown) {
    return typeof value === "string" ? value : null;
  }

  private nullableNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private nullableBoolean(value: unknown) {
    return typeof value === "boolean" ? value : null;
  }

  private parseSearchResults(value: string): SearchResult[] {
    const parsed = this.parseJson<unknown>(value, "library search response");
    if (!Array.isArray(parsed)) {
      if (this.isRecord(parsed) && parsed.status === "error") {
        const message =
          typeof parsed.message === "string"
            ? parsed.message
            : "Unable to search the Apple Music library.";
        const code =
          typeof parsed.code === "number" ? ` (${parsed.code})` : "";
        throw new Error(`${message}${code}`);
      }
      throw new Error("Apple Music returned an invalid library search response.");
    }

    const results: SearchResult[] = [];
    for (const item of parsed) {
      if (
        !this.isRecord(item) ||
        typeof item.id !== "string" ||
        !item.id ||
        typeof item.name !== "string" ||
        !item.name
      ) {
        continue;
      }
      results.push({
        id: item.id,
        name: item.name,
        artist: typeof item.artist === "string" ? item.artist : "",
        album: typeof item.album === "string" ? item.album : "",
        duration:
          typeof item.duration === "number" && Number.isFinite(item.duration)
            ? item.duration
            : null,
        favorited:
          typeof item.favorited === "boolean" ? item.favorited : null,
      });
    }
    if (parsed.length > 0 && results.length === 0) {
      throw new Error(
        "Apple Music found matches, but none exposed playable library track details."
      );
    }
    return results;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private handleBackgroundError(error: unknown) {
    if (this.disposed) {
      return;
    }
    const message = this.errorMessage(error);
    this.output.appendLine(`[${new Date().toISOString()}] ${message}`);
    this.stopRefresh();
    this.lastNowPlayingRenderKey = undefined;
    this.titleTrackButton.text = "$(warning) Apple Music Unavailable";
    this.titleTrackButton.tooltip = "Run “Apple Music: Check Setup” for details.";
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private artistLabel() {
    return this.artist?.trim() || "Unknown Artist";
  }

  private formatDuration(seconds: number) {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
          .toString()
          .padStart(2, "0")}`
      : `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  private formatNumber(value: number) {
    return Number.isInteger(value)
      ? value.toString()
      : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  private repeatLabel(mode: RepeatMode | null) {
    switch (mode) {
      case "one":
        return "One";
      case "all":
        return "All";
      case "off":
        return "Off";
      default:
        return "Unknown";
    }
  }

  private isRepeatMode(value: unknown): value is RepeatMode {
    return value === "off" || value === "one" || value === "all";
  }

  private clamp(value: number, minimum: number, maximum: number) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  get muted() {
    return this._muted ?? false;
  }

  set muted(muted: boolean) {
    if (this._muted === muted) {
      return;
    }
    this._muted = muted;
    if (muted) {
      this.muteUnmuteTrackButton.text = icons.mute;
      this.muteUnmuteTrackButton.tooltip = "Unmute";
      this.muteUnmuteTrackButton.accessibilityInformation = {
        label: "Unmute Apple Music",
      };
    } else {
      this.muteUnmuteTrackButton.text = icons.unmute;
      this.muteUnmuteTrackButton.tooltip = "Mute";
      this.muteUnmuteTrackButton.accessibilityInformation = {
        label: "Mute Apple Music",
      };
    }
  }

  get playing() {
    return this._playing ?? false;
  }

  set playing(playing: boolean) {
    if (this._playing === playing) {
      return;
    }
    this._playing = playing;
    if (playing) {
      this.playPauseTrackButton.text = icons.pauseTrack;
      this.playPauseTrackButton.tooltip = "Pause";
      this.playPauseTrackButton.accessibilityInformation = {
        label: "Pause Apple Music",
      };
    } else {
      this.playPauseTrackButton.text = icons.playTrack;
      this.playPauseTrackButton.tooltip = "Play";
      this.playPauseTrackButton.accessibilityInformation = {
        label: "Play Apple Music",
      };
    }
  }
}
