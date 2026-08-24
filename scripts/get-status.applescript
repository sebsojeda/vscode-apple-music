use framework "Foundation"
use scripting additions

if application "Music" is running then
    tell application "Music"
        try
            set albumName to album of current track
            set artistName to artist of current track
            set trackName to name of current track
            if player state is playing then
                set playbackState to "playing"
            else if player state is paused then
                set playbackState to "paused"
            else
                set playbackState to "stopped"
            end if
            set playerVolume to sound volume
            set artworkPath to missing value

            try
                set currentAlbumData to data of artwork 1 of current track
                set artworkID to persistent ID of current track
                set tempPath to POSIX path of (path to temporary items from user domain)
                set filePath to tempPath & artworkID & ".jpg"

                tell application "System Events"
                    set fileExists to exists file filePath
                end tell

                if not fileExists then
                    my writeArtwork(currentAlbumData, filePath)
                end if
                set artworkPath to filePath
            end try

            return my serializeStatus(albumName, artistName, trackName, playbackState, playerVolume, artworkPath)
        on error
            return my serializeStatus(missing value, missing value, missing value, missing value, missing value, missing value)
        end try
    end tell
else
    return my serializeStatus(missing value, missing value, missing value, missing value, missing value, missing value)
end if

on writeArtwork(artworkData, filePath)
    set fileDescriptor to open for access filePath with write permission
    try
        set eof of fileDescriptor to 0
        write artworkData to fileDescriptor starting at eof
        close access fileDescriptor
    on error
        try
            close access fileDescriptor
        end try
        error
    end try
end writeArtwork

on serializeStatus(albumName, artistName, trackName, playbackState, playerVolume, artworkPath)
    set statusData to current application's NSMutableDictionary's dictionary()
    my setJSONString(statusData, "a", albumName)
    my setJSONString(statusData, "m", artistName)
    my setJSONString(statusData, "t", trackName)
    my setJSONString(statusData, "s", playbackState)
    my setJSONNumber(statusData, "v", playerVolume)
    my setJSONString(statusData, "d", artworkPath)
    return my serializeJSON(statusData)
end serializeStatus

on setJSONString(statusData, key, value)
    if value is missing value then
        statusData's setObject:(current application's NSNull's |null|()) forKey:key
    else
        set jsonString to current application's NSString's stringWithString:(value as text)
        statusData's setObject:jsonString forKey:key
    end if
end setJSONString

on setJSONNumber(statusData, key, value)
    if value is missing value then
        statusData's setObject:(current application's NSNull's |null|()) forKey:key
    else
        set jsonNumber to current application's NSNumber's numberWithDouble:(value as real)
        statusData's setObject:jsonNumber forKey:key
    end if
end setJSONNumber

on serializeJSON(value)
    set jsonData to current application's NSJSONSerialization's dataWithJSONObject:value options:0 |error|:(missing value)
    set jsonString to current application's NSString's alloc()'s initWithData:jsonData encoding:(current application's NSUTF8StringEncoding)
    return jsonString as text
end serializeJSON
