use framework "Foundation"

on run argv
    try
        if (count of argv) < 1 then return "[]"
        set searchQuery to item 1 of argv as text
        if searchQuery is "" then return "[]"

        tell application "Music"
            set matchingTracks to search library playlist 1 for searchQuery only all
        end tell

        set resultData to current application's NSMutableArray's array()
        set resultCount to count of matchingTracks
        if resultCount > 100 then set resultCount to 100

        repeat with resultIndex from 1 to resultCount
            set musicTrack to item resultIndex of matchingTracks
            resultData's addObject:(my serializeTrack(musicTrack))
        end repeat

        return my serializeJSON(resultData)
    on error errorMessage number errorNumber
        return my serializeError(errorMessage, errorNumber)
    end try
end run

on serializeTrack(musicTrack)
    set trackID to missing value
    set trackName to missing value
    set artistName to missing value
    set albumName to missing value
    set trackDuration to missing value
    set trackFavorited to missing value

    tell application "Music"
        try
            set trackID to persistent ID of musicTrack
        end try
        try
            set trackName to name of musicTrack
        end try
        try
            set artistName to artist of musicTrack
        end try
        try
            set albumName to album of musicTrack
        end try
        try
            set trackDuration to duration of musicTrack
        end try
        try
            set trackFavorited to favorited of musicTrack
        end try
    end tell

    set trackData to current application's NSMutableDictionary's dictionary()
    my setJSONString(trackData, "id", trackID)
    my setJSONString(trackData, "name", trackName)
    my setJSONString(trackData, "artist", artistName)
    my setJSONString(trackData, "album", albumName)
    my setJSONNumber(trackData, "duration", trackDuration)
    my setJSONBoolean(trackData, "favorited", trackFavorited)
    return trackData
end serializeTrack

on serializeError(errorMessage, errorNumber)
    set responseData to current application's NSMutableDictionary's dictionary()
    responseData's setObject:"error" forKey:"status"
    responseData's setObject:(errorMessage as text) forKey:"message"
    responseData's setObject:(current application's NSNumber's numberWithInteger:errorNumber) forKey:"code"
    return my serializeJSON(responseData)
end serializeError

on setJSONString(jsonData, jsonKey, jsonValue)
    if jsonValue is missing value then
        jsonData's setObject:(current application's NSNull's null()) forKey:jsonKey
    else
        set stringValue to current application's NSString's stringWithString:(jsonValue as text)
        jsonData's setObject:stringValue forKey:jsonKey
    end if
end setJSONString

on setJSONNumber(jsonData, jsonKey, jsonValue)
    if jsonValue is missing value then
        jsonData's setObject:(current application's NSNull's null()) forKey:jsonKey
    else
        set numberValue to current application's NSNumber's numberWithDouble:(jsonValue as real)
        jsonData's setObject:numberValue forKey:jsonKey
    end if
end setJSONNumber

on setJSONBoolean(jsonData, jsonKey, jsonValue)
    if jsonValue is missing value then
        jsonData's setObject:(current application's NSNull's null()) forKey:jsonKey
    else
        set booleanValue to current application's NSNumber's numberWithBool:(jsonValue as boolean)
        jsonData's setObject:booleanValue forKey:jsonKey
    end if
end setJSONBoolean

on serializeJSON(jsonValue)
    set jsonBytes to current application's NSJSONSerialization's dataWithJSONObject:jsonValue options:0 |error|:(missing value)
    set jsonString to current application's NSString's alloc()'s initWithData:jsonBytes encoding:(current application's NSUTF8StringEncoding)
    return jsonString as text
end serializeJSON
