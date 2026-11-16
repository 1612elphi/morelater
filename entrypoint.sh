#!/bin/sh
node server.js &
node mcp-server.js &
# exit when either dies so Docker restarts the pair
wait -n
exit 1
