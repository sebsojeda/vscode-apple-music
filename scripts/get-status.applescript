if application "Music" is running then
    tell application "Music"
        try
            return "{\"a\":\"" & artist of current track & "\",\"n\":\"" & name of current track & "\",\"s\":\"" & player state & "\",\"v\":" & sound volume & "}"
        on error
            return "{\"a\":null,\"n\":null,\"s\":\"" & player state & "\",\"v\":" & sound volume & "}"
        end try
    end tell
else
    return "{\"a\":null,\"n\":null,\"s\":null,\"v\":null}"
end if
