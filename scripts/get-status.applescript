if application "Music" is running then
    tell application "Music"
        try
            set currentAlbumData to data of artwork 1 of current track
            set filePath to POSIX path of (path to temporary items from user domain) & album of current track & ".jpg"
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
            return "{\"a\":\"" & album of current track & "\",\"m\":\"" & artist of current track & "\",\"t\":\"" & name of current track & "\",\"s\":\"" & player state & "\",\"v\":" & sound volume & ",\"d\":\"" & filePath & "\"}"
        on error
            return "{\"a\":null,\"m\":null,\"t\":null,\"s\":\"" & player state & "\",\"v\":" & sound volume & ",\"d\":null}"
        end try
    end tell
else
    return "{\"a\":null,\"m\":null,\"t\":null,\"s\":null,\"v\":null,\"d\":null}"
end if
