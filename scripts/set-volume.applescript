on run argv
	set targetVolume to (item 1 of argv) as real
		tell application "Music"
			set the sound volume to targetVolume
			if targetVolume > 0 then set mute to false
		end tell
	end run
