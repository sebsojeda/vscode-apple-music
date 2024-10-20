if application "Music" is running then
    tell application "Music"
        try
            set currentAlbumData to data of artwork 1 of current track

            set albumName to artist of current track & "_" & album of current track
            set safeAlbumName to my replace_chars(albumName, "/", "_")
            set safeAlbumName to my replace_chars(safeAlbumName, ":", "_")
            set safeAlbumName to my replace_chars(safeAlbumName, "\\", "_")
            set safeAlbumName to my replace_chars(safeAlbumName, " ", "_")
            set safeAlbumName to my replace_chars(safeAlbumName, "-", "_")

            set tempPath to POSIX path of (path to temporary items from user domain)
            set filePath to tempPath & safeAlbumName & ".jpg"

            tell application "System Events"
                set fileExists to exists file filePath
            end tell

            if not fileExists then
                try
                    set fileDescriptor to open for access filePath with write permission
                    set eof of fileDescriptor to 0
                    write currentAlbumData to fileDescriptor starting at eof
                    close access fileDescriptor
                on error
                    try
                        close access filePath
                    end try
                    error
                end try
            end if

            set albumnName to my escapeJSON(album of current track)
            set artistName to my escapeJSON(artist of current track)
            set trackName to my escapeJSON(name of current track)

            return "{\"a\":\"" & albumnName & "\",\"m\":\"" & artistName & "\",\"t\":\"" & trackName & "\",\"s\":\"" & player state & "\",\"v\":" & sound volume & ",\"d\":\"" & filePath & "\"}"
        on error
            return "{\"a\":null,\"m\":null,\"t\":null,\"s\":\"" & player state & "\",\"v\":" & sound volume & ",\"d\":null}"
        end try
    end tell
else
    return "{\"a\":null,\"m\":null,\"t\":null,\"s\":null,\"v\":null,\"d\":null}"
end if

on escapeJSON(value)
    set AppleScript's text item delimiters to "\""
    set value to text items of value
    set AppleScript's text item delimiters to "\\\""
    set value to value as text
    set AppleScript's text item delimiters to ""
    return value
end escapeJSON

on replace_chars(theText, searchString, replacementString)
    set AppleScript's text item delimiters to searchString
    set the itemList to every text item of theText
    set AppleScript's text item delimiters to replacementString
    set theText to the itemList as string
    set AppleScript's text item delimiters to "" -- Clear the delimiters
    return theText
end replace_chars
