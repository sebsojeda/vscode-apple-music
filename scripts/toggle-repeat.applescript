tell application "Music"
    if song repeat is off then
        set song repeat to all
    else if song repeat is all then
        set song repeat to one
    else if song repeat is one then
        set song repeat to off
    end if
end tell