#!/bin/sh
set -e

# Start NGINX in foreground
exec nginx -g 'daemon off;'
