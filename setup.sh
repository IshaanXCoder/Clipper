#!/bin/bash

echo "🎬 Setting up Clipper project..."

echo "📦 Installing root dependencies..."
npm install

echo "📱 Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "⚙️ Installing backend dependencies..."
cd backend && npm install && cd ..

echo "🐍 Setting up Python environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "Or start components individually:"
echo "  Frontend: npm run start:frontend"
echo "  Backend:  npm run start:backend" 