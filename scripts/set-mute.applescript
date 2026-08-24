use framework "Foundation"

on run argv
    try
        if (count of argv) < 1 then error "Expected true or false."
        set muteArgument to item 1 of argv as text
        if muteArgument is "true" then
            set targetMute to true
        else if muteArgument is "false" then
            set targetMute to false
        else
            error "Expected true or false."
        end if

        tell application "Music" to set mute to targetMute

        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"ok" forKey:"status"
        responseData's setObject:(current application's NSNumber's numberWithBool:targetMute) forKey:"muted"
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
