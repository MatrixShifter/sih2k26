"""Reference codes for bid applications."""

from datetime import datetime, timezone


def bid_reference(tender_gem: str, bidder_id: int) -> str:
    stamp = datetime.now(timezone.utc).strftime("%y%m%d")
    gem_tail = tender_gem.replace("/", "")[-8:]
    return f"CG-{gem_tail}-{bidder_id:04d}-{stamp}"
