on run argv
	tell application "Music"
		set shuffle enabled to true
		play playlist (item 1 of argv)
	end tell
end run