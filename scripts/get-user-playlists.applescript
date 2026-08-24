use framework "Foundation"

if application "Music" is running then
    tell application "Music" to set playlistNames to name of user playlists
    set selectablePlaylists to {}

    repeat with playlistName in playlistNames
        set playlistName to playlistName as text
        if (playlistName is not "Music") and (playlistName is not "Favorite Songs") then
            set end of selectablePlaylists to playlistName
        end if
    end repeat

    return my serializeJSON(selectablePlaylists)
else
    return "[]"
end if

on serializeJSON(value)
    set jsonData to current application's NSJSONSerialization's dataWithJSONObject:value options:0 |error|:(missing value)
    set jsonString to current application's NSString's alloc()'s initWithData:jsonData encoding:(current application's NSUTF8StringEncoding)
    return jsonString as text
end serializeJSON
