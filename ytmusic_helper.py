import sys
import json
import os
import unicodedata
from ytmusicapi import YTMusic

def sanitize_text(text):
    if not text:
        return ""
    normalized = unicodedata.normalize('NFKD', text)
    return "".join([c for c in normalized if not unicodedata.combining(c)])

def main():
    import io
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    try:
        # Read all inputs from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"success": False, "error": "No input provided"}))
            return
        
        req = json.loads(input_data)
        action = req.get("action")
        
        if action == "setup_auth":
            headers_raw = req.get("headers_raw")
            # Create data folder if it doesn't exist
            os.makedirs("data", exist_ok=True)
            filepath = req.get("filepath", "data/browser.json")
            
            # Setup ytmusicapi browser authentication
            from ytmusicapi import setup
            setup(filepath=filepath, headers_raw=headers_raw)
            print(json.dumps({"success": True}))
            
        elif action == "get_account_info":
            auth_path = req.get("auth_path", "data/browser.json")
            if not os.path.exists(auth_path):
                print(json.dumps({"success": False, "error": f"Auth file not found at {auth_path}."}))
                return
            yt = YTMusic(auth_path)
            try:
                info = yt.get_account_info()
                print(json.dumps({
                    "success": True, 
                    "accountName": info.get("accountName"), 
                    "channelHandle": info.get("channelHandle"), 
                    "accountPhotoUrl": info.get("accountPhotoUrl")
                }))
            except Exception as e:
                print(json.dumps({"success": False, "error": str(e)}))
            
        elif action == "get_playlists":
            auth_path = req.get("auth_path", "data/browser.json")
            if not os.path.exists(auth_path):
                print(json.dumps({"success": False, "error": f"Auth file not found at {auth_path}. Please authenticate first."}))
                return
            
            yt = YTMusic(auth_path)
            playlists = yt.get_library_playlists(limit=None)
            
            result = []
            for p in playlists:
                result.append({
                    "id": p.get("playlistId"),
                    "title": p.get("title")
                })
            print(json.dumps({"success": True, "playlists": result}))
            
        elif action == "create_playlist":
            auth_path = req.get("auth_path", "data/browser.json")
            if not os.path.exists(auth_path):
                print(json.dumps({"success": False, "error": "Auth file not found. Please authenticate first."}))
                return
            
            yt = YTMusic(auth_path)
            title = sanitize_text(req.get("title"))
            description = sanitize_text(req.get("description", "Transferred from Spotify"))
            playlist_id = yt.create_playlist(title, description, privacy_status="PRIVATE")
            
            if isinstance(playlist_id, dict):
                playlist_id = playlist_id.get("playlistId") or playlist_id.get("id") or playlist_id
                
            print(json.dumps({"success": True, "playlist_id": playlist_id}))
            
        elif action == "get_playlist_tracks":
            auth_path = req.get("auth_path", "data/browser.json")
            if not os.path.exists(auth_path):
                print(json.dumps({"success": False, "error": "Auth file not found. Please authenticate first."}))
                return
                
            yt = YTMusic(auth_path)
            playlist_id = req.get("playlist_id")
            
            # Fetch all tracks from the playlist
            if playlist_id == "LM":
                playlist_data = yt.get_liked_songs(limit=None)
            else:
                playlist_data = yt.get_playlist(playlist_id, limit=None)
            tracks = playlist_data.get("tracks", [])
            
            formatted_tracks = []
            for t in tracks:
                artists = [a.get("name") for a in t.get("artists", []) if a.get("name")]
                artist_name = ", ".join(artists) if artists else "Unknown Artist"
                
                album_info = t.get("album") or {}
                album_name = album_info.get("name") if isinstance(album_info, dict) else ""
                
                thumbnails = t.get("thumbnails", [])
                thumbnail_url = thumbnails[0].get("url") if (thumbnails and isinstance(thumbnails, list)) else ""
                
                formatted_tracks.append({
                    "videoId": t.get("videoId"),
                    "videoType": t.get("videoType", ""),
                    "title": t.get("title"),
                    "artist": artist_name,
                    "album": album_name,
                    "duration_seconds": t.get("duration_seconds", 0),
                    "thumbnail": thumbnail_url
                })
                
            print(json.dumps({"success": True, "tracks": formatted_tracks}))
            
        elif action == "search_songs":
            auth_path = req.get("auth_path", "data/browser.json")
            # Can run search anonymously if browser.json does not exist yet
            if auth_path and os.path.exists(auth_path):
                yt = YTMusic(auth_path)
            else:
                yt = YTMusic()
            
            query = req.get("query")
            # Filter = "songs" retrieves only official audio tracks (no video clips)
            search_results = yt.search(query, filter="songs")
            if not search_results:
                # Fallback to videos if no official songs are found
                search_results = yt.search(query, filter="videos")
            
            formatted_results = []
            for r in search_results:
                artists = [a.get("name") for a in r.get("artists", []) if a.get("name")]
                artist_name = ", ".join(artists) if artists else "Unknown Artist"
                
                album_info = r.get("album") or {}
                album_name = album_info.get("name") if isinstance(album_info, dict) else ""
                
                thumbnails = r.get("thumbnails", [])
                thumbnail_url = thumbnails[0].get("url") if thumbnails else ""
                
                formatted_results.append({
                    "videoId": r.get("videoId"),
                    "title": r.get("title"),
                    "artist": artist_name,
                    "album": album_name,
                    "duration_seconds": r.get("duration_seconds", 0),
                    "thumbnail": thumbnail_url
                })
            print(json.dumps({"success": True, "results": formatted_results}))
            
        elif action == "add_tracks":
            auth_path = req.get("auth_path", "data/browser.json")
            if not os.path.exists(auth_path):
                print(json.dumps({"success": False, "error": "Auth file not found. Please authenticate first."}))
                return
                
            yt = YTMusic(auth_path)
            playlist_id = req.get("playlist_id")
            video_ids = req.get("video_ids", [])
            
            duplicates = req.get("duplicates", False)
            
            if not video_ids:
                print(json.dumps({"success": True, "message": "No tracks to add"}))
                return
                
            # Add to playlist. Appends to the end.
            import time
            optimize_audio = req.get("optimize_audio", False)
            tracks_info = req.get("tracks_info", [])
            
            def clean_title(title):
                """Remove common suffixes from title for comparison."""
                if not title:
                    return ""
                t = title.lower().strip()
                for suffix in ['(official video)', '(official music video)', '(lyrics)', 
                               '(audio)', '(clip officiel)', '(official)', '(hd)', '(hq)',
                               '(visualizer)', '(lyric video)', '(music video)', '[official video]',
                               '[official music video]', '(visualiser)', '(official audio)']:
                    t = t.replace(suffix, '').strip()
                return t
            
            def find_audio_version(yt_inst, video_id, title, artist):
                """Search for the audio-only version of a music video. Returns audioVideoId or original."""
                try:
                    query = f"{title} {artist}"
                    results = yt_inst.search(query, filter="songs", limit=5)
                    clean_src = clean_title(title)
                    artist_parts = [p.strip().lower() for p in artist.split(",")]
                    
                    for r in results:
                        r_title = clean_title(r.get("title", ""))
                        r_artists = [a.get("name", "").lower().strip() for a in r.get("artists", [])]
                        
                        # Check title similarity
                        title_match = (clean_src == r_title or clean_src in r_title or r_title in clean_src)
                        # Check artist match  
                        artist_match = any(
                            ap in ra or ra in ap
                            for ap in artist_parts
                            for ra in r_artists
                        )
                        
                        if title_match and artist_match:
                            return r.get("videoId", video_id)
                    
                    return video_id  # No match found, keep original
                except Exception:
                    return video_id  # On error, keep original
            
            converted_count = 0
            final_ids = []
            
            # Resolve audio versions if optimize_audio is enabled
            if optimize_audio and tracks_info:
                for t_info in tracks_info:
                    vid = t_info.get("videoId")
                    vtype = t_info.get("videoType", "")
                    title = t_info.get("title", "")
                    artist = t_info.get("artist", "")
                    
                    if vtype in ("MUSIC_VIDEO_TYPE_OMV", "MUSIC_VIDEO_TYPE_UGC"):
                        audio_vid = find_audio_version(yt, vid, title, artist)
                        if audio_vid != vid:
                            converted_count += 1
                        final_ids.append(audio_vid)
                        time.sleep(0.1)  # Small delay for search API
                    else:
                        final_ids.append(vid)
            else:
                final_ids = list(video_ids)
                
            if playlist_id == "LM":
                def rate_with_retry(yt_inst, video_id, index, total):
                    """Rate a single song with LIKE with retry logic."""
                    for attempt in range(5):
                        try:
                            yt_inst.rate_song(video_id, 'LIKE')
                            return True
                        except Exception as e:
                            if attempt == 4:
                                print(f"Failed to rate {video_id} ({index}/{total}) after 5 attempts: {e}", file=sys.stderr)
                                return False
                            wait_time = 2 * (attempt + 1)
                            print(f"Retry {attempt+1}/5 for {video_id}: {e}, waiting {wait_time}s...", file=sys.stderr)
                            time.sleep(wait_time)
                    return False
                
                success_count = 0
                failed_ids = []
                
                # Like each track sequentially
                for i, vid in enumerate(final_ids):
                    ok = rate_with_retry(yt, vid, i + 1, len(final_ids))
                    if ok:
                        success_count += 1
                    else:
                        failed_ids.append(vid)
                    
                    # Small delay between likes to avoid rate limiting
                    if i < len(final_ids) - 1:
                        time.sleep(0.5)
                
                status = {
                    "status": "STATUS_SUCCEEDED" if len(failed_ids) == 0 else "STATUS_PARTIAL",
                    "added": success_count,
                    "failed": len(failed_ids),
                    "failed_ids": failed_ids,
                    "converted": converted_count
                }
            else:
                status = yt.add_playlist_items(playlist_id, final_ids, duplicates=duplicates)
                if isinstance(status, dict) and status.get("status") == "STATUS_FAILED":
                    raise Exception(f"YouTube Music returned STATUS_FAILED. Response: {status}")
                
                if isinstance(status, dict):
                    status["converted"] = converted_count
                    status["added"] = len(final_ids)
                else:
                    status = {
                        "status": status,
                        "added": len(final_ids),
                        "failed": 0,
                        "converted": converted_count
                    }
            print(json.dumps({"success": True, "status": status}))
            
        elif action == "get_liked_tracks":
            auth_path = req.get("auth_path", "data/browser.json")
            if not os.path.exists(auth_path):
                print(json.dumps({"success": False, "error": "Auth file not found. Please authenticate first."}))
                return
                
            yt = YTMusic(auth_path)
            limit = req.get("limit")
            
            # Fetch all liked tracks
            liked_data = yt.get_liked_songs(limit=limit)
            tracks = liked_data.get("tracks", [])
            
            formatted_tracks = []
            for t in tracks:
                artists = [a.get("name") for a in t.get("artists", []) if a.get("name")]
                artist_name = ", ".join(artists) if artists else "Unknown Artist"
                
                album_info = t.get("album") or {}
                album_name = album_info.get("name") if isinstance(album_info, dict) else ""
                
                thumbnails = t.get("thumbnails", [])
                thumbnail_url = thumbnails[0].get("url") if (thumbnails and isinstance(thumbnails, list)) else ""
                
                formatted_tracks.append({
                    "videoId": t.get("videoId"),
                    "title": t.get("title"),
                    "artist": artist_name,
                    "album": album_name,
                    "duration_seconds": t.get("duration_seconds", 0),
                    "thumbnail": thumbnail_url
                })
                
            print(json.dumps({"success": True, "tracks": formatted_tracks}))
            
        elif action == "unlike_tracks":
            auth_path = req.get("auth_path", "data/browser.json")
            if not os.path.exists(auth_path):
                print(json.dumps({"success": False, "error": "Auth file not found. Please authenticate first."}))
                return
                
            yt = YTMusic(auth_path)
            video_ids = req.get("video_ids", [])
            
            if not video_ids:
                print(json.dumps({"success": True, "message": "No tracks to unlike"}))
                return
                
            import time
            
            def rate_single_song_indifferent(video_id, index, total):
                """Rate a single song with INDIFFERENT with retry logic."""
                for attempt in range(5):
                    try:
                        yt.rate_song(video_id, 'INDIFFERENT')
                        return True
                    except Exception as e:
                        if attempt == 4:
                            print(f"Failed to unlike song {video_id} ({index}/{total}) after 5 attempts: {e}", file=sys.stderr)
                            return False
                        wait_time = 2 * (attempt + 1)
                        print(f"Retry {attempt+1}/5 for unliking {video_id}: {e}, waiting {wait_time}s...", file=sys.stderr)
                        time.sleep(wait_time)
                return False
            
            success_count = 0
            failed_ids = []
            
            # Unlike each track sequentially
            for i, vid in enumerate(video_ids):
                ok = rate_single_song_indifferent(vid, i + 1, len(video_ids))
                if ok:
                    success_count += 1
                else:
                    failed_ids.append(vid)
                
                # Small delay between unlikes to avoid rate limiting
                if i < len(video_ids) - 1:
                    time.sleep(0.1)
            
            status = {
                "status": "STATUS_SUCCEEDED" if len(failed_ids) == 0 else "STATUS_PARTIAL",
                "unliked": success_count,
                "failed": len(failed_ids),
                "failed_ids": failed_ids
            }
            print(json.dumps({"success": True, "status": status}))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
            
    except Exception as e:
        import traceback
        print(json.dumps({"success": False, "error": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    main()
