use framework "Foundation"

on run argv
    try
        if (count of argv) < 1 then error "Expected true or false."

        set favoriteArgument to item 1 of argv as text
        if favoriteArgument is "true" then
            set targetFavorite to true
        else if favoriteArgument is "false" then
            set targetFavorite to false
        else
            error "Expected true or false."
        end if

        set trackID to missing value
        tell application "Music"
            set musicTrack to current track
            if (count of argv) > 1 then
                set expectedTrackID to item 2 of argv as text
                if expectedTrackID is not "" then
                    if (persistent ID of musicTrack as text) is not expectedTrackID then error "The current track changed before it could be updated."
                else if (count of argv) > 3 then
                    set expectedTrackName to item 3 of argv as text
                    set expectedArtistName to item 4 of argv as text
                    if (name of musicTrack as text) is not expectedTrackName or (artist of musicTrack as text) is not expectedArtistName then error "The current track changed before it could be updated."
                end if
            end if
            set favorited of musicTrack to targetFavorite
            try
                set trackID to persistent ID of musicTrack
            end try
        end tell

        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"ok" forKey:"status"
        responseData's setObject:(current application's NSNumber's numberWithBool:targetFavorite) forKey:"favorited"
        my setJSONString(responseData, "id", trackID)
        return my serializeJSON(responseData)
    on error errorMessage number errorNumber
        return my serializeError(errorMessage, errorNumber)
    end try
end run

on setJSONString(jsonData, jsonKey, jsonValue)
    if jsonValue is missing value then
        jsonData's setObject:(current application's NSNull's null()) forKey:jsonKey
    else
        jsonData's setObject:(jsonValue as text) forKey:jsonKey
    end if
end setJSONString

on serializeError(errorMessage, errorNumber)
    set responseData to current application's NSMutableDictionary's dictionary()
    responseData's setObject:"error" forKey:"status"
    responseData's setObject:(errorMessage as text) forKey:"message"
    responseData's setObject:(current application's NSNumber's numberWithInteger:errorNumber) forKey:"code"
    return my serializeJSON(responseData)
end serializeError

on serializeJSON(jsonValue)
    set jsonBytes to current application's NSJSONSerialization's dataWithJSONObject:jsonValue options:0 |error|:(missing value)
    set jsonString to current application's NSString's alloc()'s initWithData:jsonBytes encoding:(current application's NSUTF8StringEncoding)
    return jsonString as text
end serializeJSON
