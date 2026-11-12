"""
Shared pricing + negotiation rules for CartSettle.

Single source of truth for:
- the catalog price of a product,
- the margin-protected floor price (never sell below MIN_MARGIN over cost),
- the *effective* price of a cart line (honours an active negotiated deal),
- bundle / single-item negotiation, and signed deal tokens so a client can
  only apply a deal the server actually offered.
"""
from decimal import Decimal, ROUND_CEILING, ROUND_DOWN

from django.core import signing
from django.utils import timezone

MIN_MARGIN = Decimal("0.12")          # store keeps at least 12% gross margin
DEAL_HOLD_SECONDS = 10 * 60           # a deal is held for 10 minutes
DEAL_SALT = "cartsettle-deal-v1"
_PAISE = Decimal("0.01")


def catalog_price(product):
    return product.offer_price if product.offer_price is not None else product.regular_price


def floor_price(product):
    """Lowest price we will accept while keeping MIN_MARGIN over cost."""
    selling = catalog_price(product)
    cost = product.cost_price if product.cost_price else selling * Decimal("0.80")
    floor = (cost / (Decimal("1") - MIN_MARGIN)).quantize(_PAISE, rounding=ROUND_CEILING)
    return min(selling, floor)


def clamp_to_deal_range(product, unit_price):
    """Clamp a requested unit price into [floor, catalog]."""
    price = Decimal(str(unit_price)).quantize(_PAISE, rounding=ROUND_DOWN)
    return max(floor_price(product), min(catalog_price(product), price))


def effective_price(item):
    """Unit price for a CartItem: active negotiated price, else catalog price."""
    base = catalog_price(item.product)
    negotiated = getattr(item, "negotiated_unit_price", None)
    until = getattr(item, "negotiated_until", None)
    if negotiated is not None and (until is None or until > timezone.now()):
        return clamp_to_deal_range(item.product, negotiated)
    return base


def round_up_to_5(amount):
    return (amount / Decimal("5")).to_integral_value(rounding=ROUND_CEILING) * Decimal("5")


def negotiate_lines(lines, target_total=None, target_pct=None):
    """
    lines: [{"product": Product, "quantity": int}]
    Returns a decision dict (see keys below). Prices are always computed from the
    database, never from client-supplied prices.
    """
    rows = []
    for ln in lines:
        p, qty = ln["product"], max(1, int(ln.get("quantity") or 1))
        rows.append({"product": p, "qty": qty, "catalog": catalog_price(p), "floor": floor_price(p)})

    original = sum((r["catalog"] * r["qty"] for r in rows), Decimal("0"))
    floor_total = sum((r["floor"] * r["qty"] for r in rows), Decimal("0"))
    headroom = original - floor_total

    requested_total = None
    if target_total is not None:
        requested_total = Decimal(str(target_total))
    elif target_pct is not None:
        requested_total = (original * (Decimal("1") - Decimal(str(target_pct)) / Decimal("100"))).quantize(_PAISE)

    if headroom <= 0:
        status, deal_total = "ALREADY_BEST", original
    elif requested_total is None:
        status, deal_total = "COUNTER_OFFER", min(original, round_up_to_5(floor_total))
    elif requested_total >= original:
        status, deal_total = "ALREADY_BEST", original
    elif requested_total >= floor_total:
        status, deal_total = "APPROVED", requested_total
    else:
        status, deal_total = "COUNTER_OFFER", min(original, round_up_to_5(floor_total))
    if status != "ALREADY_BEST" and deal_total >= original:
        status, deal_total = "ALREADY_BEST", original

    # Spread the discount over lines in proportion to each line's headroom.
    needed = original - deal_total
    frac = (needed / headroom) if headroom > 0 else Decimal("0")
    out = []
    for r in rows:
        unit = (r["catalog"] - (r["catalog"] - r["floor"]) * frac).quantize(_PAISE, rounding=ROUND_DOWN)
        out.append({**r, "unit": max(r["floor"], min(r["catalog"], unit))})
    # Give back rounding paise so the bundle lands exactly on the offered total.
    deficit = deal_total - sum((o["unit"] * o["qty"] for o in out), Decimal("0"))
    for o in sorted(out, key=lambda x: x["qty"]):
        step = _PAISE * o["qty"]
        while deficit >= step and o["unit"] < o["catalog"]:
            o["unit"] += _PAISE
            deficit -= step

    final_total = sum((o["unit"] * o["qty"] for o in out), Decimal("0"))
    savings = original - final_total
    savings_pct = (savings / original * 100).quantize(Decimal("0.1")) if original > 0 else Decimal("0.0")
    return {
        "status": status,
        "scope": "item" if len(out) == 1 else "cart",
        "original_total": float(original),
        "deal_total": float(final_total),
        "savings": float(savings),
        "savings_pct": float(savings_pct),
        "requested_total": float(requested_total) if requested_total is not None else None,
        "requested_pct": float(target_pct) if target_pct is not None else None,
        "lines": [
            {
                "id": o["product"].id,
                "name": o["product"].name,
                "quantity": o["qty"],
                "original_unit": float(o["catalog"]),
                "deal_unit": float(o["unit"]),
            }
            for o in out
        ],
        "expires_in_seconds": DEAL_HOLD_SECONDS,
    }


def sign_deal(decision, user_id=None):
    payload = {
        "u": user_id,
        "lines": [[ln.get("id") or ln.get("product_id"), f"{ln['deal_unit']:.2f}"] for ln in decision.get("lines", [])],
    }
    return signing.dumps(payload, salt=DEAL_SALT)


def read_deal(token, user_id=None):
    """Returns {product_id: Decimal unit price} or raises signing.BadSignature."""
    payload = signing.loads(token, salt=DEAL_SALT, max_age=DEAL_HOLD_SECONDS)
    if payload.get("u") not in (None, user_id):
        raise signing.BadSignature("Deal belongs to a different customer.")
    return {int(pid): Decimal(str(price)) for pid, price in payload.get("lines", [])}
