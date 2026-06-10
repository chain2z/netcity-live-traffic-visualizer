from __future__ import annotations

import ctypes
import platform


def main() -> None:
    is_admin = False
    admin_error: str | None = None
    if platform.system() == "Windows":
        try:
            is_admin = bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception as exc:
            admin_error = str(exc)

    print(f"platform={platform.system()}")
    print(f"is_admin={is_admin}")
    if admin_error:
        print(f"admin_check_error={admin_error}")

    try:
        from scapy.all import conf, get_if_list, get_working_if  # type: ignore

        interfaces = get_if_list()
        print("scapy_import=ok")
        print(f"scapy_conf_iface={conf.iface}")
        print(f"scapy_working_if={get_working_if()}")
        print(f"scapy_interface_count={len(interfaces)}")
        for name in interfaces[:12]:
            print(f"interface={name}")
    except Exception as exc:
        print(f"scapy_import=failed: {exc}")


if __name__ == "__main__":
    main()
