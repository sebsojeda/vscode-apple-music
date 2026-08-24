use framework "Foundation"

on run argv
    try
        if (count of argv) < 2 then error "Expected a playlist ID and shuffle mode."
        set playlistID to item 1 of argv as text
        set shuffleArgument to item 2 of argv as text

        if shuffleArgument is "preserve" then
            set targetShuffle to missing value
        else if shuffleArgument is "true" then
            set targetShuffle to true
        else if shuffleArgument is "false" then
            set targetShuffle to false
        else
            error "Expected shuffle mode to be preserve, true, or false."
        end if

        tell application "Music"
            set matchingPlaylists to every playlist whose persistent ID is playlistID
            if (count of matchingPlaylists) is 0 then error "The requested playlist no longer exists."

            set targetPlaylist to item 1 of matchingPlaylists
            if targetShuffle is not missing value then set shuffle enabled to targetShuffle
            play targetPlaylist
        end tell

        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"ok" forKey:"status"
        return my serializeJSON(responseData)
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
