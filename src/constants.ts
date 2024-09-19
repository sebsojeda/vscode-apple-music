export const commands = {
  previousTrack: "vscode-apple-music.previousTrack",
  nextTrack: "vscode-apple-music.nextTrack",
  playPauseTrack: "vscode-apple-music.playPauseTrack",
  playTrack: "vscode-apple-music.playTrack",
  pauseTrack: "vscode-apple-music.pauseTrack",
  muteUnmuteTrack: "vscode-apple-music.muteUnmuteTrack",
  muteTrack: "vscode-apple-music.muteTrack",
  unmuteTrack: "vscode-apple-music.unmuteTrack",
  favoriteTrack: "vscode-apple-music.favoriteTrack",
  unfavoriteTrack: "vscode-apple-music.unfavoriteTrack",
  volumeUp: "vscode-apple-music.volumeUp",
  volumeDown: "vscode-apple-music.volumeDown",
  open: "vscode-apple-music.open",
  quit: "vscode-apple-music.quit",
  toggleShuffle: "vscode-apple-music.toggleShuffle",
  toggleRepeat: "vscode-apple-music.toggleRepeat",
  show: "vscode-apple-music.showPlayer",
  hide: "vscode-apple-music.hidePlayer",
  addToLibrary: "vscode-apple-music.addToLibrary",
  addToPlaylist: "vscode-apple-music.addToPlaylist",
};

export const icons = {
  previousTrack: "$(chevron-left)",
  nextTrack: "$(chevron-right)",
  pauseTrack: "$(debug-pause)",
  playTrack: "$(play)",
  mute: "$(mute)",
  unmute: "$(unmute)",
  favorite: "$(star-full)",
  unfavorite: "$(star)",
  playlist: "$(list-selection)",
  plus: "$(plus)",
};

export const notifications = {
  notPlaying: "Apple Music is not playing.",
  playlistExists: (p: string) => `Playlist '${p}' already exists.`,
  unableToCreatePlaylist: (p: string) => `Unable to create playlist '${p}'.`,
  unableToAddToPlaylist: (p: string) => `Unable to add to '${p}'.`,
  addingToPlaylist: (p: string) => `Adding to '${p}'.`,
  addedToPlaylist: (p: string) => `Added to '${p}'.`,
};
