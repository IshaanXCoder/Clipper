const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Store for tracking processing jobs
const jobs = new Map();

// Generate unique job ID
function generateJobId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Create a temporary Python script with user input
function createTempPythonScript(jobId, youtubeUrl, scenes) {
  const scriptContent = `
import yt_dlp
from moviepy import VideoFileClip, TextClip, CompositeVideoClip, vfx, afx
import os
import sys
import json

def download_youtube_video(url, output_path="temp_video_${jobId}.mp4"):
    """Download YouTube video and return the local file path"""
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'outtmpl': output_path,
        'quiet': False,
        'no_warnings': False,
        'nocheckcertificate': True,
        'extractaudio': False,
        'audioformat': 'mp3',
        'embed_subs': False,
        'writesubtitles': False,
        'writeautomaticsub': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            print(f"Video title: {info.get('title', 'Unknown')}")
            print(f"Duration: {info.get('duration', 'Unknown')} seconds")
            ydl.download([url])
        return output_path
    except Exception as e:
        print(f"Error downloading video: {e}")
        return None

# Input data
youtube_url = "${youtubeUrl}"
scene_times = ${JSON.stringify(scenes.map(s => [s.start, s.end]))}
scene_texts = ${JSON.stringify(scenes.map(s => s.text || `Scene ${scenes.indexOf(s) + 1}`))}

print("Downloading video...")
video_path = download_youtube_video(youtube_url)

if not video_path or not os.path.exists(video_path):
    print("Failed to download video. Exiting.")
    sys.exit(1)

print("Loading video...")
video = VideoFileClip(video_path)
duration = video.duration
print(f"Video duration: {duration:.2f} seconds")

# Extract scenes
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

# Create text clips
text_clips = []
for i, text in enumerate(scene_texts[:len(clips)]):
    text_clip = TextClip(text=text, font_size=60, color='white').with_duration(3)
    text_clip = text_clip.with_position('center')
    text_clips.append(text_clip)

# Add fade effects
for i in range(len(clips)):
    clips[i] = clips[i].with_effects([vfx.FadeIn(1), vfx.FadeOut(1), afx.AudioFadeIn(1), afx.AudioFadeOut(1)])

# Position clips sequentially
current_time = 0
final_clips = []

for i in range(len(clips)):
    clips[i] = clips[i].with_start(current_time)
    final_clips.append(clips[i])
    
    text_clips[i] = text_clips[i].with_start(current_time + 0.5)
    final_clips.append(text_clips[i])
    
    current_time = clips[i].end

print("Creating final composition...")
final = CompositeVideoClip(final_clips)

# Export
output_filename = "final_trailer_${jobId}.mp4"
print("Exporting final trailer...")
final.write_videofile(output_filename, fps=24)

# Cleanup
video.close()
if os.path.exists(video_path):
    os.remove(video_path)
    print(f"Cleaned up temporary file: {video_path}")

print(f"✅ Trailer created successfully: {output_filename}")

# Create result JSON
result = {
    "status": "success",
    "output_file": output_filename,
    "job_id": "${jobId}"
}

with open("result_${jobId}.json", "w") as f:
    json.dump(result, f)
`;

  const scriptPath = `temp_script_${jobId}.py`;
  fs.writeFileSync(scriptPath, scriptContent);
  return scriptPath;
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Clipper API is running' });
});

// Process video endpoint
app.post('/api/process-video', (req, res) => {
  const { youtubeUrl, scenes } = req.body;

  // Validate input
  if (!youtubeUrl || !scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ 
      error: 'Invalid input. Please provide youtubeUrl and scenes array.' 
    });
  }

  // Generate job ID
  const jobId = generateJobId();
  
  // Store job info
  jobs.set(jobId, {
    status: 'processing',
    startTime: new Date(),
    youtubeUrl,
    scenes
  });

  try {
    // Create temporary Python script
    const scriptPath = createTempPythonScript(jobId, youtubeUrl, scenes);
    
    // Spawn Python process using the virtual environment
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python');
    const pythonProcess = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: process.cwd() }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[Job ${jobId}] ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[Job ${jobId}] ERROR: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`[Job ${jobId}] Python process exited with code ${code}`);
      console.log(`[Job ${jobId}] Output: ${output}`);
      console.log(`[Job ${jobId}] Error output: ${errorOutput}`);
      
      // Clean up script file
      try {
        fs.unlinkSync(scriptPath);
      } catch (e) {
        console.error('Error cleaning up script file:', e);
      }

      if (code === 0) {
        // Check for result file
        const resultFile = `result_${jobId}.json`;
        if (fs.existsSync(resultFile)) {
          const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
          jobs.set(jobId, {
            ...jobs.get(jobId),
            status: 'completed',
            result,
            endTime: new Date()
          });
          fs.unlinkSync(resultFile);
        } else {
          jobs.set(jobId, {
            ...jobs.get(jobId),
            status: 'completed',
            result: { output_file: `final_trailer_${jobId}.mp4` },
            endTime: new Date()
          });
        }
      } else {
        const errorMessage = errorOutput || output || `Python process exited with code ${code}`;
        console.error(`[Job ${jobId}] Failed with error: ${errorMessage}`);
        jobs.set(jobId, {
          ...jobs.get(jobId),
          status: 'failed',
          error: errorMessage,
          endTime: new Date()
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`[Job ${jobId}] Process error:`, error);
      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: 'failed',
        error: error.message,
        endTime: new Date()
      });
    });

    // Return job ID immediately
    res.json({ 
      jobId, 
      status: 'processing', 
      message: 'Video processing started. Use /api/job-status/:jobId to check progress.' 
    });

  } catch (error) {
    console.error('Error starting video processing:', error);
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      endTime: new Date()
    });
    
    res.status(500).json({ 
      error: 'Failed to start video processing', 
      details: error.message 
    });
  }
});

// Check job status
app.get('/api/job-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// Download completed video
app.get('/api/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Job not completed yet' });
  }

  const filename = job.result?.output_file || `final_trailer_${jobId}.mp4`;
  const filePath = path.join(process.cwd(), filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Output file not found' });
  }

  res.download(filePath, `trailer_${jobId}.mp4`, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).json({ error: 'Error downloading file' });
    }
  });
});

// List all jobs (for debugging)
app.get('/api/jobs', (req, res) => {
  const jobList = Array.from(jobs.entries()).map(([id, job]) => ({
    id,
    ...job
  }));
  res.json(jobList);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Clipper API server is running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Jobs list: http://localhost:${PORT}/api/jobs`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Clean up any temporary files
  const files = fs.readdirSync(process.cwd());
  files.forEach(file => {
    if (file.startsWith('temp_script_') || 
        file.startsWith('temp_video_') || 
        file.startsWith('result_')) {
      try {
        fs.unlinkSync(file);
        console.log(`Cleaned up: ${file}`);
      } catch (e) {
        console.error(`Error cleaning up ${file}:`, e.message);
      }
    }
  });
  
  process.exit(0);
}); 