#!/bin/bash

echo "🗄️  MONGODB STATUS CHECK"
echo "========================"
echo ""

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is RUNNING"
    echo ""
    
    # Show MongoDB process
    ps aux | grep mongod | grep -v grep | awk '{print "   Process ID:", $2}'
    
    echo ""
    echo "📊 CONNECTION DETAILS:"
    echo "   Database: smart-agriculture"
    echo "   Connection: mongodb://localhost:27017/smart-agriculture"
    echo ""
    echo "🔌 CONNECT MONGODB COMPASS:"
    echo "   1. Open MongoDB Compass"
    echo "   2. Paste: mongodb://localhost:27017/smart-agriculture"
    echo "   3. Click 'Connect'"
    echo ""
    echo "📁 COLLECTIONS TO VIEW:"
    echo "   • sensordatas - All ESP32 sensor readings"
    echo "   • users - Farmer and agent accounts"
    echo "   • fields - Farm field information"
    echo ""
else
    echo "❌ MongoDB is NOT RUNNING"
    echo ""
    echo "🚀 STARTING MONGODB..."
    echo ""
    
    # Try to start MongoDB using Homebrew
    if command -v brew &> /dev/null; then
        brew services start mongodb-community
        
        if [ $? -eq 0 ]; then
            echo "✅ MongoDB started successfully!"
            echo ""
            echo "Waiting for MongoDB to initialize..."
            sleep 3
            
            if pgrep -x "mongod" > /dev/null; then
                echo "✅ MongoDB is now RUNNING"
                echo ""
                echo "📊 CONNECTION DETAILS:"
                echo "   Connection: mongodb://localhost:27017/smart-agriculture"
            else
                echo "⚠️  MongoDB may still be starting..."
                echo "   Wait a few seconds and check again"
            fi
        else
            echo "❌ Failed to start MongoDB"
            echo ""
            echo "Manual start:"
            echo "   mongod --config /usr/local/etc/mongod.conf"
        fi
    else
        echo "⚠️  Homebrew not found"
        echo ""
        echo "Manual start:"
        echo "   mongod --config /usr/local/etc/mongod.conf"
    fi
fi

echo ""
echo "========================"
echo ""
