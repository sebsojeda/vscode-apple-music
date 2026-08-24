on run argv
    set playlistName to item 1 of argv
    tell application "Music"
        try
            set currentTrack to current track
            set currentTrackID to persistent ID of currentTrack
            duplicate currentTrack to source "Library"

            set libraryTrack to missing value
            set maxAttempts to 5
            set attempts to 0

            repeat while (libraryTrack is missing value and attempts < maxAttempts)
                try
                    set libraryTrack to first track of library playlist 1 whose persistent ID is currentTrackID
                on error
                    set attempts to attempts + 1
                    delay 1
                end try
            end repeat

            if libraryTrack is missing value then
                return "{\"status\":\"error\"}"
            end if

            duplicate libraryTrack to user playlist playlistName
            return "{\"status\":\"ok\"}"
        on error
            return "{\"status\":\"error\"}"
        end try
    end tell
end run
