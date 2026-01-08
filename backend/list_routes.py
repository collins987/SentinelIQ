#!/usr/bin/env python3
"""
Run this script to list all API routes.
Usage: python list_routes.py
"""

import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.main import app
    
    print("=" * 60)
    print("SentinelIQ API Routes")
    print("=" * 60)
    
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ', '.join(route.methods - {'HEAD', 'OPTIONS'}) if route.methods else 'GET'
            routes.append((route.path, methods))
        elif hasattr(route, 'path'):
            routes.append((route.path, 'MOUNT'))
    
    # Sort by path
    routes.sort(key=lambda x: x[0])
    
    for path, methods in routes:
        print(f"{methods:20} {path}")
    
    print("=" * 60)
    print(f"Total routes: {len(routes)}")
    
except Exception as e:
    print(f"Error: {e}")
    print("\nTrying alternative method...")
    
    # Try to find routes by scanning files
    import glob
    
    print("\nSearching for route definitions in code...")
    for filepath in glob.glob("app/**/*.py", recursive=True):
        with open(filepath, 'r') as f:
            content = f.read()
            if '@router.' in content or '@app.' in content:
                print(f"\n--- {filepath} ---")
                for i, line in enumerate(content.split('\n')):
                    if '@router.' in line or '@app.' in line:
                        print(f"  Line {i+1}: {line.strip()}")
