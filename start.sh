#!/bin/bash

# Start backend server
node server/index.js &
SERVER_PID=$!

# Start frontend (React)
npm start &
CLIENT_PID=$!

trap "kill $SERVER_PID $CLIENT_PID" EXIT

wait
