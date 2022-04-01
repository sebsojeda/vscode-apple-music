set default to "{\"a\":null,\"n\":null,\"s\":null,\"v\":null}"
if application "Music" is running then
    tell application "Music"
        if player state is not stopped then
            return "{\"a\":\"" & artist of current track & "\",\"n\":\"" & name of current track & "\",\"s\":\"" & player state & "\",\"v\":" & sound volume & "}"
        else
            return default
        end if
    end tell
else
    return default
end if
