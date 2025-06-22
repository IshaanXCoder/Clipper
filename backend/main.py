import yt_dlp
from moviepy import VideoFileClip, TextClip, CompositeVideoClip, vfx, afx
import os
import sys

def download_youtube_video(url, output_path="temp_video.mp4"):
    """Download YouTube video and return the local file path"""
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'outtmpl': output_path,
        'quiet': False,  # Show progress for debugging
        'no_warnings': False,
        # SSL fix for macOS
        'nocheckcertificate': True,
        # Additional options to help with download issues
        'extractaudio': False,
        'audioformat': 'mp3',
        'embed_subs': False,
        'writesubtitles': False,
        'writeautomaticsub': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # First get video info to check if it's available
            info = ydl.extract_info(url, download=False)
            print(f"Video title: {info.get('title', 'Unknown')}")
            print(f"Duration: {info.get('duration', 'Unknown')} seconds")
            
            # Now download
            ydl.download([url])
        return output_path
    except Exception as e:
        print(f"Error downloading video: {e}")
        print("Trying alternative method...")
        
        # Try with even more permissive settings
        backup_opts = {
            'format': 'worst[ext=mp4]/worst',  # Try lower quality first
            'outtmpl': output_path,
            'quiet': False,
            'nocheckcertificate': True,
            'prefer_insecure': True,
            'no_check_certificate': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(backup_opts) as ydl:
                ydl.download([url])
            return output_path
        except Exception as e2:
            print(f"Backup method also failed: {e2}")
            return None

def get_user_input():
    """Get YouTube URL and time ranges from user"""
    print("=== YouTube Video Trailer Creator ===")
    
    # Get YouTube URL
    youtube_url = input("Enter YouTube video URL: ").strip()
    
    # Get number of scenes
    num_scenes = int(input("How many scenes do you want? (default: 4): ") or 4)
    
    scenes = []
    texts = []
    
    print(f"\nEnter time ranges for {num_scenes} scenes:")
    print("Format: start_time end_time (in seconds)")
    print("Example: 30 36 (for a 6-second clip from 30s to 36s)")
    
    for i in range(num_scenes):
        while True:
            try:
                time_input = input(f"Scene {i+1} (start end): ").strip()
                start, end = map(float, time_input.split())
                if start >= end:
                    print("Start time must be less than end time!")
                    continue
                scenes.append((start, end))
                break
            except ValueError:
                print("Please enter two numbers separated by space (start end)")
    
    # Get text overlays
    print(f"\nEnter text overlays for each scene (press Enter for default text):")
    default_texts = [
        "Introducing the Vision",
        "Moments of Impact", 
        "The Core Message",
        "Join the Movement"
    ]
    
    for i in range(num_scenes):
        default_text = default_texts[i] if i < len(default_texts) else f"Scene {i+1}"
        text = input(f"Text for scene {i+1} (default: '{default_text}'): ").strip()
        texts.append(text if text else default_text)
    
    return youtube_url, scenes, texts

#################
# USER INPUT    #
#################
youtube_url, scene_times, scene_texts = get_user_input()

#################
# VIDEO LOADING #
#################
print("\nDownloading video...")
video_path = download_youtube_video(youtube_url)

if not video_path or not os.path.exists(video_path):
    print("Failed to download video. Exiting.")
    sys.exit(1)

print("Loading video...")
video = VideoFileClip(video_path)
duration = video.duration
print(f"Video duration: {duration:.2f} seconds")

##########################
# SCENES EXTRACTION      #
##########################
clips = []
for i, (start, end) in enumerate(scene_times):
    if end > duration:
        print(f"Warning: Scene {i+1} end time ({end}s) exceeds video duration ({duration:.2f}s)")
        end = min(end, duration)
    
    if start >= duration:
        print(f"Warning: Scene {i+1} start time ({start}s) exceeds video duration ({duration:.2f}s)")
        continue
        
    clip = video.subclipped(start, end)
    clips.append(clip)
    print(f"Extracted scene {i+1}: {start}s to {end}s ({end-start:.1f}s duration)")

###########################################
# TEXT CLIPS (overlay text on each scene) #
###########################################
text_clips = []
for i, text in enumerate(scene_texts[:len(clips)]):
    text_clip = TextClip(text=text, font_size=60, color='white').with_duration(3)
    text_clip = text_clip.with_position('center')
    text_clips.append(text_clip)

#############################
# ADDING FADE & AUDIO FX 🎬 #
#############################
for i in range(len(clips)):
    clips[i] = clips[i].with_effects([vfx.FadeIn(1), vfx.FadeOut(1), afx.AudioFadeIn(1), afx.AudioFadeOut(1)])

##########################
# POSITIONING & TIMING ⏱ #
##########################
# Stack clips sequentially
current_time = 0
final_clips = []

for i in range(len(clips)):
    # Position video clip
    clips[i] = clips[i].with_start(current_time)
    final_clips.append(clips[i])
    
    # Position text clip (starts 0.5s after video starts)
    text_clips[i] = text_clips[i].with_start(current_time + 0.5)
    final_clips.append(text_clips[i])
    
    current_time = clips[i].end

################################
# FINAL COMPOSITION & EXPORT 🚀 #
################################
print("\nCreating final composition...")
final = CompositeVideoClip(final_clips)

# Export
print("Exporting final trailer...")
output_filename = "final_trailer.mp4"
final.write_videofile(output_filename, fps=24)

# Cleanup
video.close()
if os.path.exists(video_path):
    os.remove(video_path)
    print(f"Cleaned up temporary file: {video_path}")

print(f"\n✅ Trailer created successfully: {output_filename}")