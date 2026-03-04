#!/bin/sh
node server.js &
node mcp-server.js &
wait
