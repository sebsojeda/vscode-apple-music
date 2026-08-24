use framework "Foundation"
use scripting additions

set albumName to missing value
set artistName to missing value
set trackName to missing value
set playbackState to missing value
set playerVolume to missing value
set muteState to missing value
set artworkPath to missing value
set trackFavorited to missing value
set shuffleState to missing value
set repeatMode to missing value
set trackID to missing value

if application "Music" is running then
    tell application "Music"
        set musicTrack to missing value
        try
            set musicTrack to current track
        end try

        if musicTrack is not missing value then
            try
                set albumName to album of musicTrack
            end try
            try
                set artistName to artist of musicTrack
            end try
            try
                set trackName to name of musicTrack
            end try
            try
                set trackFavorited to favorited of musicTrack
            end try
            try
                set trackID to persistent ID of musicTrack
            end try
            try
                set currentAlbumData to data of artwork 1 of musicTrack
                set artworkID to persistent ID of musicTrack
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
        end if

        try
            if player state is playing then
                set playbackState to "playing"
            else if player state is paused then
                set playbackState to "paused"
            else
                set playbackState to "stopped"
            end if
        end try
        try
            set playerVolume to sound volume
        end try
        try
            set muteState to mute
        end try
        try
            set shuffleState to shuffle enabled
        end try
        try
            set currentRepeatMode to song repeat
            if currentRepeatMode is off then
                set repeatMode to "off"
            else if currentRepeatMode is one then
                set repeatMode to "one"
            else if currentRepeatMode is all then
                set repeatMode to "all"
            end if
        end try
    end tell
end if

return my serializeStatus(albumName, artistName, trackName, playbackState, playerVolume, muteState, artworkPath, trackFavorited, shuffleState, repeatMode, trackID)

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

on serializeStatus(albumName, artistName, trackName, playbackState, playerVolume, muteState, artworkPath, trackFavorited, shuffleState, repeatMode, trackID)
    set statusData to current application's NSMutableDictionary's dictionary()
    my setJSONString(statusData, "a", albumName)
    my setJSONString(statusData, "m", artistName)
    my setJSONString(statusData, "t", trackName)
    my setJSONString(statusData, "s", playbackState)
    my setJSONNumber(statusData, "v", playerVolume)
    my setJSONBoolean(statusData, "u", muteState)
    my setJSONString(statusData, "d", artworkPath)
    my setJSONBoolean(statusData, "f", trackFavorited)
    my setJSONBoolean(statusData, "x", shuffleState)
    my setJSONString(statusData, "r", repeatMode)
    my setJSONString(statusData, "i", trackID)
    return my serializeJSON(statusData)
end serializeStatus

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
