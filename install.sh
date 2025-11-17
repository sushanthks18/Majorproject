#!/bin/bash

echo "🌾 Smart Agriculture System - Installation Script"
echo "=================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check MongoDB
if ! command -v mongod &> /dev/null
then
    echo "⚠️  MongoDB is not installed. Please install MongoDB or use MongoDB Atlas."
    echo "   Download: https://www.mongodb.com/try/download/community"
else
    echo "✅ MongoDB is installed"
fi

echo ""
echo "📦 Installing Backend Dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend installation failed"
    exit 1
fi

echo ""
echo "📦 Installing Frontend Dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend installation failed"
    exit 1
fi

cd ..

echo ""
echo "✅ Installation Complete!"
echo ""
echo "Next Steps:"
echo "1. Start MongoDB (if using local):"
echo "   - macOS: brew services start mongodb-community"
echo "   - Linux: sudo systemctl start mongod"
echo ""
echo "2. Seed test data:"
echo "   cd backend && npm run seed"
echo ""
echo "3. Start backend (in one terminal):"
echo "   cd backend && npm run dev"
echo ""
echo "4. Start frontend (in another terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Open http://localhost:5173 in your browser"
echo ""
echo "📖 See QUICKSTART.md for detailed instructions"
