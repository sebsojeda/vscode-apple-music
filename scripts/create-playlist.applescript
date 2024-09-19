tell application "Music"
    try
        set playlistName to "$ARG$"

        if not (exists user playlist playlistName) then
            make new user playlist with properties {name:playlistName}
            
            set maxAttempts to 5
            set attempts to 0
            repeat until (exists user playlist playlistName) or attempts > maxAttempts
                delay 1
                set attempts to attempts + 1
            end repeat

            if not (exists user playlist playlistName) then
                return "{\"status\":\"error\"}"
            end if
            
        else
            return "{\"status\":\"exists\"}"
        end if

        return "{\"status\":\"ok\"}"
    on error
        return "{\"status\":\"error\"}"
    end try
end tell
