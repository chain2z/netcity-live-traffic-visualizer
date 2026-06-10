"""Notes and utility entry point for preparing NetCity replay fixtures.

Expected sanitization steps:
- Replace source LAN addresses with private RFC1918 demo addresses.
- Replace MAC addresses or omit them.
- Keep protocol, byte count, port, and timing shape.
- Replace sensitive hostnames with representative demo domains.
- Keep only enough events for local demos and tests.
"""

from __future__ import annotations


def main() -> None:
    print(__doc__)


if __name__ == "__main__":
    main()
