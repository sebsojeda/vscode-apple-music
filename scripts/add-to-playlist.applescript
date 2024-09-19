tell application "Music"
    try
        duplicate current track to source "Library"
        
        set artistName to artist of current track
        set trackName to name of current track
        
        set trackFound to false
        set maxAttempts to 5
        set attempts to 0
        
        repeat while (trackFound is false and attempts < maxAttempts)
            set foundTracks to (every track of library playlist 1 whose artist is artistName and name is trackName)
            if (count of foundTracks) > 0 then
                set trackFound to true
            else
                set attempts to attempts + 1
                delay 1
            end if
        end repeat
        
        if trackFound is true then
            repeat with theTrack in foundTracks
                duplicate theTrack to user playlist "$ARG$"
            end repeat
            return "{\"status\":\"ok\"}"
        else
            return "{\"status\":\"error\"}"
        end if
        
    on error
        return "{\"status\":\"error\"}"
    end try
end tell
