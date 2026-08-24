use framework "Foundation"

on run
    try
        tell application "Music"
            launch
            set musicVersion to version as text
        end tell

        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"ok" forKey:"status"
        responseData's setObject:musicVersion forKey:"version"
        return my serializeJSON(responseData)
    on error errorMessage number errorNumber
        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"error" forKey:"status"
        responseData's setObject:(current application's NSNull's null()) forKey:"version"
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
