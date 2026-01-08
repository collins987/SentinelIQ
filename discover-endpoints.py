#!/usr/bin/env python3
"""
Auto-discover backend API endpoints and generate frontend config
"""
import requests
import json
import sys

BACKEND_URL = "http://localhost:8000"

def discover_endpoints():
    """Fetch OpenAPI spec and extract all endpoints"""
    try:
        print(f"Fetching OpenAPI spec from {BACKEND_URL}/openapi.json...")
        response = requests.get(f"{BACKEND_URL}/openapi.json", timeout=5)
        response.raise_for_status()
        openapi = response.json()
        
        print("\n" + "="*80)
        print("DISCOVERED API ENDPOINTS")
        print("="*80)
        
        paths = openapi.get('paths', {})
        
        # Group by category
        categories = {
            'dashboard': [],
            'stats': [],
            'jobs': [],
            'users': [],
            'audit': [],
            'alerts': [],
            'auth': [],
            'health': [],
            'other': []
        }
        
        for path, methods in sorted(paths.items()):
            # Categorize
            path_lower = path.lower()
            if 'dashboard' in path_lower:
                categories['dashboard'].append(path)
            elif 'stat' in path_lower:
                categories['stats'].append(path)
            elif 'job' in path_lower:
                categories['jobs'].append(path)
            elif 'user' in path_lower:
                categories['users'].append(path)
            elif 'audit' in path_lower or 'log' in path_lower:
                categories['audit'].append(path)
            elif 'alert' in path_lower:
                categories['alerts'].append(path)
            elif 'auth' in path_lower or 'login' in path_lower or 'token' in path_lower:
                categories['auth'].append(path)
            elif 'health' in path_lower:
                categories['health'].append(path)
            else:
                categories['other'].append(path)
        
        # Print categorized endpoints
        for category, endpoints in categories.items():
            if endpoints:
                print(f"\n[{category.upper()}]")
                for endpoint in endpoints:
                    methods_list = list(paths[endpoint].keys())
                    print(f"  {', '.join(methods_list):20} {endpoint}")
        
        # Generate TypeScript config
        print("\n" + "="*80)
        print("SUGGESTED FRONTEND ENDPOINT CONFIGURATION")
        print("="*80)
        print("\n// Copy this to: frontend/src/services/api-endpoints.ts\n")
        
        print("export const API_ENDPOINTS = {")
        
        if categories['health']:
            print(f"  HEALTH: '{categories['health'][0]}',")
        
        if categories['auth']:
            print("  AUTH: {")
            for ep in categories['auth']:
                name = ep.split('/')[-1].upper()
                print(f"    {name}: '{ep}',")
            print("  },")
        
        if categories['dashboard'] or categories['stats']:
            all_dash = categories['dashboard'] + categories['stats']
            print("  DASHBOARD: {")
            if all_dash:
                print(f"    STATS: '{all_dash[0]}',")
            print("  },")
        
        if categories['jobs']:
            print("  JOBS: {")
            list_ep = next((ep for ep in categories['jobs'] if '{' not in ep), categories['jobs'][0])
            print(f"    LIST: '{list_ep}',")
            detail_ep = next((ep for ep in categories['jobs'] if '{' in ep), None)
            if detail_ep:
                param = detail_ep.split('{')[1].split('}')[0]
                print(f"    DETAIL: (id: string) => '{detail_ep.replace('{' + param + '}', '${{id}}')}',")
            print("  },")
        
        if categories['users']:
            print("  USERS: {")
            list_ep = next((ep for ep in categories['users'] if '{' not in ep), categories['users'][0])
            print(f"    LIST: '{list_ep}',")
            detail_ep = next((ep for ep in categories['users'] if '{' in ep), None)
            if detail_ep:
                param = detail_ep.split('{')[1].split('}')[0]
                print(f"    DETAIL: (id: string) => '{detail_ep.replace('{' + param + '}', '${{id}}')}',")
            print("  },")
        
        if categories['audit']:
            print("  AUDIT: {")
            print(f"    LIST: '{categories['audit'][0]}',")
            print("  },")
        
        if categories['alerts']:
            print("  ALERTS: {")
            list_ep = next((ep for ep in categories['alerts'] if '{' not in ep), categories['alerts'][0])
            print(f"    LIST: '{list_ep}',")
            print("  },")
        
        print("} as const;")
        
        print("\n" + "="*80)
        
        # Return key endpoints for validation
        return {
            'dashboard': categories['dashboard'][0] if categories['dashboard'] else categories['stats'][0] if categories['stats'] else None,
            'jobs': next((ep for ep in categories['jobs'] if '{' not in ep), None),
            'users': next((ep for ep in categories['users'] if '{' not in ep), None),
            'audit': categories['audit'][0] if categories['audit'] else None,
        }
        
    except requests.exceptions.ConnectionError:
        print(f"\n❌ ERROR: Cannot connect to backend at {BACKEND_URL}")
        print("   Make sure the backend server is running.")
        return None
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return None

if __name__ == "__main__":
    endpoints = discover_endpoints()
    
    if endpoints:
        print("\n✅ Endpoint discovery complete!")
        print("\nNext steps:")
        print("1. Copy the API_ENDPOINTS config above")
        print("2. Update frontend/src/services/api-endpoints.ts")
        print("3. Update your page components to use correct endpoints")
    else:
        print("\n❌ Failed to discover endpoints")
        sys.exit(1)
