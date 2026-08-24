use framework "Foundation"

on run
    try
        set trackID to missing value
        tell application "Music"
            set musicTrack to current track
            try
                set trackID to persistent ID of musicTrack
            end try
            reveal musicTrack
            activate
        end tell

        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"ok" forKey:"status"
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
