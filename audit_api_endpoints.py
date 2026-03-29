import json
import os
import re
import csv
from pathlib import Path

# -----------------------------
# CONFIGURATION
# -----------------------------

OPENAPI_FILE = "openapi.json"
REPORT_MD_FILE = "api_audit_report.md"
REPORT_CSV_FILE = "api_audit_report.csv"

FRONTEND_PATHS = [
    "frontend/src",
    "frontend/userdashboard",
    "frontend/analystdashboard"
]

BACKEND_PATHS = [
    "backend"
]

ROUTES_PATH = "backend/app/routes"

EXCLUDED_DIRS = {
    "node_modules",
    ".next",
    "dist",
    "build",
    "venv",
    ".venv",
    "__pycache__",
    ".git",
}

# Known API base prefixes used by clients/wrappers
KNOWN_BASE_PREFIXES = [
    "/api/admin/dashboard",
    "/api/v1/admin",
    "/api/v1/analyst",
    "/api/v1/users/me",
    "/api/v1",
    "/api",
    "/auth",
    "/users",
]

# -----------------------------
# LOAD OPENAPI ENDPOINTS
# -----------------------------

def load_openapi():

    if not os.path.exists(OPENAPI_FILE):
        print("openapi.json not found. Export it first.")
        return []

    with open(OPENAPI_FILE) as f:
        spec = json.load(f)

    endpoints = []

    for path, methods in spec["paths"].items():
        for method in methods:
            endpoints.append((method.upper(), path))

    return endpoints


# -----------------------------
# DETECT ROUTES IN CODE
# -----------------------------

ROUTER_DEF_PATTERN = re.compile(
    r'(\w+)\s*=\s*APIRouter\((.*?)\)',
    re.DOTALL
)

ROUTER_PREFIX_PATTERN = re.compile(
    r'prefix\s*=\s*["\'](.*?)["\']'
)

ROUTE_PATTERN = re.compile(
    r'@(\w+)\.(get|post|put|delete|patch)\(["\'](.*?)["\']'
)


def _normalize_path(path: str) -> str:
    if not path:
        return "/"
    path = path.strip()
    if not path.startswith("/"):
        path = f"/{path}"
    path = re.sub(r"/{2,}", "/", path)
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path


def _path_to_flexible_regex(path: str) -> str:
    """
    Build a regex that matches route strings in code, including dynamic params.
    Example: /users/{user_id} should match /users/{user_id} and /users/${userId}
    """
    path = _normalize_path(path)
    if path == "/":
        return r"/"

    parts = [p for p in path.split("/") if p]
    pattern_parts = []
    for part in parts:
        if part.startswith("{") and part.endswith("}"):
            # FastAPI param in code, JS template param, or concrete segment
            pattern_parts.append(r"(?:\{[^}]+\}|\$\{[^}]+\}|[^/\s\"'`?]+)")
        else:
            pattern_parts.append(re.escape(part))

    return r"/?" + r"/".join(pattern_parts)


def _candidate_search_paths(path: str) -> list[str]:
    """
    Generate search variants for wrapper-style client usage.
    Example: /api/v1/admin/overview -> ['/api/v1/admin/overview', '/overview']
    when file already includes '/api/v1/admin' as a base URL.
    """
    path = _normalize_path(path)
    candidates = {path}

    for prefix in KNOWN_BASE_PREFIXES:
        if path == prefix:
            candidates.add("/")
        elif path.startswith(prefix + "/"):
            suffix = path[len(prefix):]
            candidates.add(_normalize_path(suffix))

    return sorted(candidates, key=len, reverse=True)


def _endpoint_used_in_content(path: str, content: str) -> bool:
    """Second-pass endpoint matcher with wrapper-awareness and param-flexible regex."""
    normalized = _normalize_path(path)

    # Pass 1: exact full-path substring (fast and precise)
    if normalized in content:
        return True

    # Pass 2: regex match for param segments on full path
    full_regex = _path_to_flexible_regex(normalized)
    if re.search(full_regex, content):
        return True

    # Pass 3: wrapper-aware suffix matching
    for candidate in _candidate_search_paths(normalized):
        if candidate == normalized:
            continue

        # Only attempt suffix matching if base prefix appears in the same file.
        # This avoids broad false positives for short fragments like '/overview'.
        base_in_file = False
        for prefix in KNOWN_BASE_PREFIXES:
            if normalized == prefix or normalized.startswith(prefix + "/"):
                if prefix in content:
                    base_in_file = True
                    break

        if not base_in_file:
            continue

        if candidate in content:
            return True

        candidate_regex = _path_to_flexible_regex(candidate)
        if re.search(candidate_regex, content):
            return True

    return False

def scan_router_definitions():

    routes = []

    for root, _, files in os.walk(ROUTES_PATH):

        for file in files:

            if file.endswith(".py"):

                full = os.path.join(root, file)

                try:

                    with open(full, "r", errors="ignore") as f:

                        content = f.read()

                        # Map APIRouter variable name -> prefix
                        router_prefixes = {}
                        for var_name, router_args in ROUTER_DEF_PATTERN.findall(content):
                            prefix_match = ROUTER_PREFIX_PATTERN.search(router_args)
                            prefix = prefix_match.group(1) if prefix_match else ""
                            router_prefixes[var_name] = prefix

                        matches = ROUTE_PATTERN.findall(content)

                        for router_name, method, path in matches:
                            prefix = router_prefixes.get(router_name, "")
                            full_path = _normalize_path(f"{prefix}{path}")
                            routes.append((method.upper(), full_path, full))

                except:
                    pass

    return routes


# -----------------------------
# SCAN PROJECT FOR USAGE
# -----------------------------

def scan_usage(endpoints):

    usage = {ep: [] for ep in endpoints}

    search_paths = FRONTEND_PATHS + BACKEND_PATHS

    for base in search_paths:

        for root, _, files in os.walk(base):
            # prune noisy/generated dirs
            parts = set(Path(root).parts)
            if EXCLUDED_DIRS.intersection(parts):
                continue

            for file in files:

                if file.endswith((".js",".ts",".tsx",".jsx",".py")):

                    full = os.path.join(root, file)

                    try:

                        with open(full, "r", errors="ignore") as f:

                            content = f.read()

                            for ep in endpoints:
                                method, path = ep
                                if _endpoint_used_in_content(path, content):
                                    usage[ep].append(full)

                    except:
                        pass

    return usage


# -----------------------------
# CLASSIFY ENDPOINTS
# -----------------------------

def classify(openapi_endpoints, usage, router_routes):

    report = {
        "active": [],
        "backend_only": [],
        "unused": [],
        "missing_from_openapi": []
    }

    # classification for openapi routes
    for ep, locations in usage.items():

        if not locations:

            report["unused"].append(ep)

        else:

            frontend_hit = any("frontend" in loc for loc in locations)

            if frontend_hit:

                report["active"].append((ep, locations))

            else:

                report["backend_only"].append((ep, locations))


    # detect router routes missing from openapi
    openapi_set = {(method.upper(), _normalize_path(path)) for method, path in openapi_endpoints}

    for method, path, file in router_routes:
        if (method.upper(), _normalize_path(path)) not in openapi_set:

            report["missing_from_openapi"].append((method, path, file))

    return report


# -----------------------------
# EXPORT REPORTS
# -----------------------------

def _rel(path: str) -> str:
    try:
        return str(Path(path).as_posix())
    except Exception:
        return path


def export_csv_report(report, csv_file=REPORT_CSV_FILE):
    rows = []

    for (method, endpoint), locations in report["active"]:
        rows.append({
            "classification": "ACTIVE",
            "method": method,
            "endpoint": endpoint,
            "used_by": " | ".join(_rel(p) for p in locations),
            "router_file": "",
            "internal_usage_location": "",
            "recommendation": "",
        })

    for (method, endpoint), locations in report["backend_only"]:
        rows.append({
            "classification": "BACKEND_ONLY",
            "method": method,
            "endpoint": endpoint,
            "used_by": "",
            "router_file": "",
            "internal_usage_location": " | ".join(_rel(p) for p in locations),
            "recommendation": "",
        })

    for method, endpoint in report["unused"]:
        rows.append({
            "classification": "UNUSED",
            "method": method,
            "endpoint": endpoint,
            "used_by": "",
            "router_file": "",
            "internal_usage_location": "",
            "recommendation": "Review for deprecation/removal or move to internal service",
        })

    for method, endpoint, router_file in report["missing_from_openapi"]:
        rows.append({
            "classification": "MISSING_FROM_OPENAPI",
            "method": method,
            "endpoint": endpoint,
            "used_by": "",
            "router_file": _rel(router_file),
            "internal_usage_location": "",
            "recommendation": "Include in OpenAPI (or exclude intentionally if demo/internal)",
        })

    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "classification",
                "method",
                "endpoint",
                "used_by",
                "router_file",
                "internal_usage_location",
                "recommendation",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def export_markdown_report(report, md_file=REPORT_MD_FILE):
    lines = []
    lines.append("# API Audit Report")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- ACTIVE: {len(report['active'])}")
    lines.append(f"- BACKEND_ONLY: {len(report['backend_only'])}")
    lines.append(f"- UNUSED: {len(report['unused'])}")
    lines.append(f"- MISSING_FROM_OPENAPI: {len(report['missing_from_openapi'])}")
    lines.append("")

    lines.append("## ACTIVE ENDPOINTS")
    lines.append("")
    lines.append("method | endpoint | used_by")
    lines.append("---|---|---")
    for (method, endpoint), locations in report["active"]:
        used_by = " ; ".join(_rel(p) for p in locations)
        lines.append(f"{method} | {endpoint} | {used_by}")
    lines.append("")

    lines.append("## BACKEND ONLY ENDPOINTS")
    lines.append("")
    lines.append("method | endpoint | internal_usage_location")
    lines.append("---|---|---")
    for (method, endpoint), locations in report["backend_only"]:
        internal_usage = " ; ".join(_rel(p) for p in locations)
        lines.append(f"{method} | {endpoint} | {internal_usage}")
    lines.append("")

    lines.append("## UNUSED ENDPOINTS")
    lines.append("")
    lines.append("method | endpoint | recommendation")
    lines.append("---|---|---")
    for method, endpoint in report["unused"]:
        lines.append(f"{method} | {endpoint} | review for deprecation/removal or move internal")
    lines.append("")

    lines.append("## ROUTES MISSING FROM OPENAPI")
    lines.append("")
    lines.append("method | endpoint | router_file")
    lines.append("---|---|---")
    for method, endpoint, router_file in report["missing_from_openapi"]:
        lines.append(f"{method} | {endpoint} | {_rel(router_file)}")
    lines.append("")

    with open(md_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


# -----------------------------
# MAIN
# -----------------------------

def main():

    print("\nLoading OpenAPI spec...")
    openapi_endpoints = load_openapi()

    print(f"OpenAPI endpoints found: {len(openapi_endpoints)}")

    print("\nScanning router definitions...")
    router_routes = scan_router_definitions()

    print(f"Router routes detected in code: {len(router_routes)}")

    print("\nScanning project usage...")
    usage = scan_usage(openapi_endpoints)

    print("\nClassifying endpoints...")
    report = classify(openapi_endpoints, usage, router_routes)


    print("\n==============================")
    print("ACTIVE ENDPOINTS (Frontend)")
    print("==============================")

    for ep in report["active"]:
        print(ep)


    print("\n==============================")
    print("BACKEND ONLY ENDPOINTS")
    print("==============================")

    for ep in report["backend_only"]:
        print(ep)


    print("\n==============================")
    print("UNUSED ENDPOINTS")
    print("==============================")

    for ep in report["unused"]:
        print(ep)


    print("\n==============================")
    print("ROUTES MISSING FROM OPENAPI")
    print("==============================")

    for route in report["missing_from_openapi"]:
        print(route)

    export_csv_report(report)
    export_markdown_report(report)
    print(f"\nSaved: {REPORT_CSV_FILE}")
    print(f"Saved: {REPORT_MD_FILE}")


if __name__ == "__main__":
    main()
