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
            if playlist_id == "LM":
                import time
                import threading
                from concurrent.futures import ThreadPoolExecutor, as_completed
                
                # Thread-local storage for YTMusic instances
                thread_local = threading.local()
                
                def get_yt_instance():
                    if not hasattr(thread_local, 'yt'):
                        thread_local.yt = YTMusic(auth_path)
                    return thread_local.yt
                
                def rate_single_song_like(video_id):
                    """Rate a single song with LIKE with retry logic. Returns (video_id, success)."""
                    yt_thread = get_yt_instance()
                    for attempt in range(3):
                        try:
                            yt_thread.rate_song(video_id, 'LIKE')
                            return (video_id, True)
                        except Exception as e:
                            if attempt == 2:
                                print(f"Failed to rate song {video_id} after 3 attempts: {e}", file=sys.stderr)
                                return (video_id, False)
                            else:
                                time.sleep(1 * (attempt + 1))
                    return (video_id, False)
                
                success_count = 0
                failed_ids = []
                
                # To preserve chronological order as much as possible, we reverse the batch
                # (so the oldest songs are submitted first).
                ordered_video_ids = list(video_ids)
                ordered_video_ids.reverse()
                
                # Process likes in parallel with a safe concurrency limit of 4 workers
                with ThreadPoolExecutor(max_workers=4) as executor:
                    futures = {executor.submit(rate_single_song_like, vid): vid for vid in ordered_video_ids}
                    
                    for future in as_completed(futures):
                        vid, ok = future.result()
                        if ok:
                            success_count += 1
                        else:
                            failed_ids.append(vid)
                
                status = {
                    "status": "STATUS_SUCCEEDED",
                    "added": success_count,
                    "failed": len(failed_ids),
                    "failed_ids": failed_ids
                }
            else:
                status = yt.add_playlist_items(playlist_id, video_ids, duplicates=duplicates)
                if isinstance(status, dict) and status.get("status") == "STATUS_FAILED":
                    raise Exception(f"YouTube Music returned STATUS_FAILED. Response: {status}")
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
            import threading
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            # Thread-local storage for YTMusic instances
            thread_local = threading.local()
            
            def get_yt_instance():
                if not hasattr(thread_local, 'yt'):
                    thread_local.yt = YTMusic(auth_path)
                return thread_local.yt
            
            def rate_single_song_indifferent(video_id):
                """Rate a single song with INDIFFERENT with retry logic. Returns (video_id, success)."""
                yt_thread = get_yt_instance()
                for attempt in range(3):
                    try:
                        yt_thread.rate_song(video_id, 'INDIFFERENT')
                        return (video_id, True)
                    except Exception as e:
                        if attempt == 2:
                            print(f"Failed to unlike song {video_id} after 3 attempts: {e}", file=sys.stderr)
                            return (video_id, False)
                        else:
                            time.sleep(1 * (attempt + 1))
                return (video_id, False)
            
            success_count = 0
            failed_ids = []
            
            # Process unlikes in parallel with a safe concurrency limit of 3 workers
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {executor.submit(rate_single_song_indifferent, vid): vid for vid in video_ids}
                
                for future in as_completed(futures):
                    vid, ok = future.result()
                    if ok:
                        success_count += 1
                    else:
                        failed_ids.append(vid)
            
            status = {
                "status": "STATUS_SUCCEEDED",
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
