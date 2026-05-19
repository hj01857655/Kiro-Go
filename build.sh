#!/bin/bash

echo "Building frontend..."
cd web
npm run build || exit 1

echo "Building backend..."
cd ..
go build -o kiro-go.exe || exit 1

echo "Build complete!"
echo "Run ./kiro-go.exe or ./start.ps1 to start the server"
