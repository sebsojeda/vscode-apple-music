on run argv
	set targetVolume to (item 1 of argv) as real
	tell application "Music"
		set the sound volume to targetVolume
	end tell
end run