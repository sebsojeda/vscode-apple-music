if application "Music" is running then
    tell application "Music"
        set playlistNames to name of playlists
        set playlistsJSON to "["
        set listCount to (count of playlistNames)

        repeat with i from 1 to listCount
            set playlistName to item i of playlistNames
            if (playlistName is not "Music") and (playlistName is not "Library") then
                set playlistsJSON to playlistsJSON & "\"" & playlistName & "\""        
                if i is not listCount then
                    set playlistsJSON to playlistsJSON & ", "
                end if
            end if
        end repeat

        set playlistsJSON to playlistsJSON & "]"
        return playlistsJSON
    end tell
else
    return "[]"
end if
