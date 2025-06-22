# 🎬 Clipper - YouTube Video Trailer Creator

A modern React Native app with Node.js backend that creates custom video trailers from YouTube videos with specified time ranges and text overlays.

## Features

- 📱 Beautiful React Native UI with modern design
- 🎥 Download YouTube videos automatically  
- ✂️ Extract custom scenes with precise timing
- 📝 Add custom text overlays to each scene
- 🎨 Professional fade and audio effects

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- Expo CLI
- Virtual environment (recommended)

## Installation

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (activate virtual environment first)
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Setup SSL Certificates (macOS)

```bash
# Fix SSL certificate issues on macOS
/Applications/Python\ 3.*/Install\ Certificates.command
```

## Running the Application

### Option 1: Run Everything (Recommended)

```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the Expo React Native app
npx expo start
```

### Option 2: Python Script Only

```bash
# Activate virtual environment
source venv/bin/activate

# Run the Python script directly
python main.py
```

## Usage

### Using the Mobile App

1. **Start the backend server**: `npm run server`
2. **Start Expo**: `npx expo start`
3. **Open Expo Go app** on your phone
4. **Scan the QR code** displayed in terminal
5. **Enter YouTube URL** in the app
6. **Configure scenes**:
   - Set number of scenes (1-9)
   - Enter start and end times in seconds
   - Add custom text overlays (optional)
7. **Tap "Create Trailer"** to process
8. **Download link** will be provided when complete

### Using the Python Script Directly

1. Run `python main.py`
2. Enter YouTube URL when prompted
3. Specify number of scenes
4. Enter time ranges for each scene
5. Add custom text overlays
6. Wait for processing to complete

## API Endpoints

- `GET /health` - Health check
- `POST /api/process-video` - Start video processing
- `GET /api/job-status/:jobId` - Check processing status
- `GET /api/download/:jobId` - Download completed video
- `GET /api/jobs` - List all jobs (debug)

## Example Usage

### Check out this tweet 
- **X Url**: ``
