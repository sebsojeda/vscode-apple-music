tell application "Music"
    try
        duplicate current track to source "Library"
        return "{\"status\":\"ok\"}"
    on error
        return "{\"status\":\"error\"}"
    end try
end tell