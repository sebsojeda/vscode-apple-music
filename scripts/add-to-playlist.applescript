on run argv
    if (count of argv) < 2 then return "{\"status\":\"error\"}"
    set lookupMode to item 1 of argv as text
    set lookupValue to item 2 of argv as text
    if lookupMode is not "id" and lookupMode is not "name" then return "{\"status\":\"error\"}"

    tell application "Music"
        try
            if lookupMode is "id" then
                set matchingPlaylists to every user playlist whose persistent ID is lookupValue
            else
                set matchingPlaylists to every user playlist whose name is lookupValue
            end if
            if (count of matchingPlaylists) is 0 then return "{\"status\":\"error\"}"
            set targetPlaylist to item 1 of matchingPlaylists

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

            duplicate libraryTrack to targetPlaylist
            return "{\"status\":\"ok\"}"
        on error
            return "{\"status\":\"error\"}"
        end try
    end tell
end run
