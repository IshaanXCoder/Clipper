# 🎬 Clipper - YouTube Video Trailer Creator

A modern React Native app with Node.js backend that creates custom video trailers from YouTube videos with specified time ranges and text overlays.

## Features

- 📱 Beautiful React Native UI with modern design
- 🎥 Download YouTube videos automatically  
- ✂️ Extract custom scenes with precise timing
- 📝 Add custom text overlays to each scene
- 🎨 Professional fade and audio effects
- 🚀 Real-time processing status updates
- 📥 Download completed trailers

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with Express
- **Video Processing**: Python with MoviePy and yt-dlp
- **UI**: Modern Material Design inspired interface

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

### Important: Network Setup

- Make sure your phone and computer are on the **same WiFi network**
- The app is configured to connect to `192.168.1.33:3000`
- If your computer's IP is different, update the `API_BASE_URL` in `App.js`

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

## Project Structure

```
clipper/
├── App.js              # React Native main app
├── server.js           # Node.js backend API
├── main.py             # Python video processing script
├── package.json        # Node.js dependencies
├── requirements.txt    # Python dependencies
├── app.json           # Expo configuration
├── assets/            # App icons and images
└── venv/             # Python virtual environment
```

## Example Usage

### Input
- **YouTube URL**: `https://www.youtube.com/watch?v=NDI68Dcp4Gg`
- **Scene 1**: 5-10 seconds, text: "Introduction"
- **Scene 2**: 15-20 seconds, text: "Key Features"
- **Scene 3**: 30-35 seconds, text: "Call to Action"

### Output
- Professional trailer with fade effects
- Custom text overlays centered on screen
- Smooth audio transitions
- Final video: `final_trailer_[jobId].mp4`

## Troubleshooting

### Common Issues

1. **SSL Certificate Error (macOS)**
   ```bash
   /Applications/Python\ 3.*/Install\ Certificates.command
   ```

2. **Module Not Found**
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

4. **Expo Connection Issues**
   - Make sure phone and computer are on same WiFi
   - Try running `expo start --tunnel`

### YouTube Download Issues

- Ensure you have latest yt-dlp: `pip install --upgrade yt-dlp`
- Some videos may be region-restricted or private
- Try different video URLs if issues persist

## Development

### Adding New Features

1. **Frontend**: Modify `App.js` for UI changes
2. **Backend**: Update `server.js` for new API endpoints  
3. **Processing**: Enhance `main.py` for new video effects

### Testing

```bash
# Test backend API
curl http://localhost:3000/health

# Test video processing
curl -X POST http://localhost:3000/api/process-video \
  -H "Content-Type: application/json" \
  -d '{"youtubeUrl":"https://www.youtube.com/watch?v=example","scenes":[{"start":0,"end":5,"text":"Test"}]}'
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter any issues:
1. Check the troubleshooting section
2. Review the console logs
3. Ensure all dependencies are installed correctly
4. Try running components separately to isolate issues

---

**Made with ❤️ using React Native, Node.js, and Python** 