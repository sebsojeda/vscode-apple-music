use framework "Foundation"

on run argv
    try
        set playlistScope to "all"
        if (count of argv) > 0 then set playlistScope to item 1 of argv as text
        if playlistScope is not "all" and playlistScope is not "user" then error "Expected playlist scope to be all or user."

        tell application "Music"
            if playlistScope is "user" then
                set musicPlaylists to every user playlist
            else
                set musicPlaylists to every playlist
            end if
        end tell

        set resultData to current application's NSMutableArray's array()
        repeat with musicPlaylist in musicPlaylists
            tell application "Music"
                set playlistName to name of musicPlaylist as text
                set playlistKind to special kind of musicPlaylist
                set shouldInclude to playlistKind is not folder and playlistKind is not Library and playlistKind is not Music
                if playlistScope is "user" then
                    set shouldInclude to shouldInclude and class of musicPlaylist is user playlist
                    set shouldInclude to shouldInclude and smart of musicPlaylist is false
                    set shouldInclude to shouldInclude and genius of musicPlaylist is false
                    set shouldInclude to shouldInclude and playlistKind is none
                end if
                if shouldInclude then
                    set playlistID to persistent ID of musicPlaylist as text
                    set playlistData to current application's NSMutableDictionary's dictionary()
                    playlistData's setObject:playlistID forKey:"id"
                    playlistData's setObject:playlistName forKey:"name"
                    resultData's addObject:playlistData
                end if
            end tell
        end repeat
        return my serializeJSON(resultData)
    on error errorMessage number errorNumber
        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"error" forKey:"status"
        responseData's setObject:(errorMessage as text) forKey:"message"
        responseData's setObject:(current application's NSNumber's numberWithInteger:errorNumber) forKey:"code"
        return my serializeJSON(responseData)
    end try
end run

on serializeJSON(jsonValue)
    set jsonBytes to current application's NSJSONSerialization's dataWithJSONObject:jsonValue options:0 |error|:(missing value)
    set jsonString to current application's NSString's alloc()'s initWithData:jsonBytes encoding:(current application's NSUTF8StringEncoding)
    return jsonString as text
end serializeJSON
