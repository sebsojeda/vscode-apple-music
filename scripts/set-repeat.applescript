use framework "Foundation"

on run argv
    try
        if (count of argv) < 1 then error "Expected off, one, or all."
        set repeatArgument to item 1 of argv as text

        tell application "Music"
            if repeatArgument is "off" then
                set song repeat to off
            else if repeatArgument is "one" then
                set song repeat to one
            else if repeatArgument is "all" then
                set song repeat to all
            else
                error "Expected off, one, or all."
            end if
        end tell

        set responseData to current application's NSMutableDictionary's dictionary()
        responseData's setObject:"ok" forKey:"status"
        responseData's setObject:repeatArgument forKey:"repeat"
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
