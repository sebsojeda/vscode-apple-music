use framework "Foundation"

on run argv
    try
        if (count of argv) < 2 then error "Expected seek mode and seconds."
        set seekMode to item 1 of argv as text
        if seekMode is not "relative" and seekMode is not "absolute" then error "Expected seek mode to be relative or absolute."
        set requestedSeconds to item 2 of argv as real

        tell application "Music"
            set trackDuration to (duration of current track) as real
            if seekMode is "relative" then
                set targetPosition to ((player position) as real) + requestedSeconds
            else
                set targetPosition to requestedSeconds
            end if
            if targetPosition < 0 then set targetPosition to 0
            if targetPosition > trackDuration then set targetPosition to trackDuration
            set player position to targetPosition
        end tell

        return my serializeSuccess()
    on error errorMessage number errorNumber
        return my serializeError(errorMessage, errorNumber)
    end try
end run

on serializeSuccess()
    set responseData to current application's NSMutableDictionary's dictionary()
    responseData's setObject:"ok" forKey:"status"
    return my serializeJSON(responseData)
end serializeSuccess

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
