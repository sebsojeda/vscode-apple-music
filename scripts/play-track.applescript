use framework "Foundation"

on run argv
    try
        if (count of argv) < 1 then error "Expected a persistent track ID."
        set requestedID to item 1 of argv as text
        if requestedID is "" then error "Expected a persistent track ID."

        tell application "Music"
            set matchingTracks to every track of library playlist 1 whose persistent ID is requestedID
            if (count of matchingTracks) is 0 then error "Track not found."
            set musicTrack to item 1 of matchingTracks
            play musicTrack
        end tell

        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"ok" forKey:"status"
        responseData's setObject:requestedID forKey:"id"
        return my serializeJSON(responseData)
    on error errorMessage number errorNumber
        return my serializeError(errorMessage, errorNumber)
    end try
end run

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
