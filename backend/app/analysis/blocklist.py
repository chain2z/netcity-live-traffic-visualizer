from __future__ import annotations

from pathlib import Path


def load_blocklist(path: Path) -> set[str]:
    domains: set[str] = set()
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        host = parts[1].strip().lower().rstrip(".")
        if host in {"localhost", "local", "broadcasthost"}:
            continue
        if "." in host:
            domains.add(host)
    return domains


def matches_blocklist(host: str | None, blocklist: set[str]) -> bool:
    if not host:
        return False
    normalized = host.lower().rstrip(".")
    return any(normalized == domain or normalized.endswith(f".{domain}") for domain in blocklist)
