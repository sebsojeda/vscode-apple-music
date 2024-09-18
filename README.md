# Apple Music Player - Visual Studio Code

Apple Music client for Visual Studio Code.

![screen shot](images/screen-shot.png)

## Features

- Shows the currently playing song in the status bar.
- Provides commands for controlling Apple Music.
- Provides buttons for controlling Apple Music.

## Supported Commands

| Feature               | Available in Status Bar | Available as Command |
| --------------------- | :---------------------: | :------------------: |
| Play/Pause            |           ✅            |          ✅          |
| Mute/Unmute           |           ✅            |          ✅          |
| Previous Track        |           ✅            |          ✅          |
| Next Track            |           ✅            |          ✅          |
| Open                  |           ✅            |          ✅          |
| Quit                  |           ❌            |          ✅          |
| Preview Album Artwork |           ✅            |          ❌          |
| Play                  |           ❌            |          ✅          |
| Pause                 |           ❌            |          ✅          |
| Mute                  |           ❌            |          ✅          |
| Unmute                |           ❌            |          ✅          |
| Volume Up             |           ❌            |          ✅          |
| Volume Down           |           ❌            |          ✅          |
| Toggle Shuffle        |           ❌            |          ✅          |
| Toggle Repeat         |           ❌            |          ✅          |
| Show Player           |           ❌            |          ✅          |
| Hide Player           |           ❌            |          ✅          |

## Requirements

- macOS with Apple Music

## Release Notes

### 1.4.0

- Add show/hide commands
- Add quit command

### 1.3.0

- Add a ton of new commands
- Fix album artwork issue causing artwork to not display in certain cases

### 1.2.3

- Fix setInterval bug

### 1.2.2

- Add a tooltip with track and album art information
- Fix issue with volume when muting and unmuting

### 1.2.1

- Bug fix for stopped player state

### 1.2.0

- Fix issue where player state is not syncing correctly
- Make UI more responsive to actions
- Add activation events to extension

### 1.0.1

- Update `package.json` configuration for Azure Marketplace

### 1.0.0

- Initial release
