import io
import os
import asyncio
from django.template.loader import get_template
from django.core.mail import EmailMessage
from django.conf import settings
from store.models import StoreSettings

def send_order_confirmation_email(order):
    """
    Send a simple order confirmation email without a PDF.
    """
    email_address = order.customer.email or order.customer.username
    if not email_address or '@' not in email_address:
        print(f"Customer has no email address for order {order.id}")
        return

    store_settings = StoreSettings.load()
    subject = f"Order Confirmation - {store_settings.store_name} (Order #{order.id})"
    
    body = f"""Hello {order.customer.first_name},

Thank you for your order! We have received your order #{order.id} and are currently processing it.

Order Summary:
Total Items: {order.items.count()}
Estimated Total: Rs. {order.total_amount}

We will notify you once your order is ready. If you have any questions, please contact us at {store_settings.store_phone or store_settings.store_email}.

Best regards,
{store_settings.store_name} Team
"""

    from store.email_service import send_store_email
    try:
        send_store_email(
            subject=subject,
            message=body,
            recipient_list=[email_address],
            fail_silently=False,
        )
        print(f"Sent confirmation email to {email_address}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_final_invoice_email(order):
    """
    Send an HTML email containing a link for the customer to view/download their invoice on the frontend.
    """
    email_address = order.customer.email or order.customer.username
    if not email_address or '@' not in email_address:
        print(f"Customer has no email address for order {order.id}")
        return

    # Fetch store settings
    store_settings = StoreSettings.load()

    # Calculate derived values
    subtotal = order.total_amount + order.discount_applied
    
    # The URL to the frontend invoice page
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    invoice_link = f"{frontend_url}/orders/{order.id}/invoice"

    # Prepare context for the template
    context = {
        'order': order,
        'items': order.items.all(),
        'settings': store_settings,
        'store_settings': store_settings,
        'subtotal': subtotal,
        'discount_applied': order.discount_applied,
        'invoice_link': invoice_link,
    }

    # Render HTML Email Body
    template = get_template('store/invoice_email.html')
    html_content = template.render(context)

    # Prepare email
    subject = f"Your Invoice from {store_settings.store_name} (Order #{order.id})"
    
    # Plain text fallback
    text_content = f"""Hello {order.customer.first_name},

Thank you for shopping with us! Your order #{order.id} is now complete.

You can view and download your official invoice here: {invoice_link}

We would love to hear about your experience! Please let us know how we did.

Best regards,
{store_settings.store_name} Team
"""

    from store.email_service import send_store_email
    try:
        send_store_email(
            subject=subject,
            message=text_content,
            recipient_list=[email_address],
            html_message=html_content,
            fail_silently=False,
        )
        print(f"Sent HTML invoice email to {email_address}")
    except Exception as e:
        print(f"Failed to send email: {e}")


def format_invoice_number(order):
    from django.utils import timezone
    created = getattr(order, 'created_at', None) or timezone.now()
    year = created.year
    order_id_str = str(getattr(order, 'id', '') or '')
    if order_id_str.startswith('ORD'):
        return f"INV-{year}-{order_id_str}"
    clean_id = ''.join(c for c in order_id_str if c.isdigit())
    seq = clean_id[-5:] if len(clean_id) >= 5 else clean_id.zfill(5)
    return f"INV-{year}-{seq}"


def build_order_tax_invoice_html(order):
    from decimal import Decimal
    from django.template.loader import render_to_string
    from django.utils import timezone
    from store.models import StoreSettings

    store_settings = StoreSettings.load()
    invoice_number = format_invoice_number(order)

    order_date_dt = timezone.localtime(order.created_at) if order.created_at else timezone.localtime(timezone.now())
    order_date = order_date_dt.strftime("%d %b %Y, %I:%M %p")
    invoice_date = timezone.localtime(timezone.now()).strftime("%d %b %Y, %I:%M %p")

    # Payment display
    raw_method = str(getattr(order, 'payment_method', '') or "COD").upper()
    total = order.total_amount or Decimal('0.00')
    wallet = getattr(order, 'wallet_discount', Decimal('0.00')) or Decimal('0.00')

    if raw_method == 'UPI':
        upi_id = getattr(order, 'upi_transaction_id', '')
        method_text = f"UPI (Ref: {upi_id})" if upi_id else "UPI Instant Payment"
    elif getattr(order, 'order_type', '') == 'PICKUP' and raw_method == 'COD':
        method_text = "Cash at Store Counter"
    elif raw_method == 'CARD':
        method_text = "Debit / Credit Card"
    else:
        method_text = "Cash on Delivery (COD)"

    if total == Decimal('0.00') and wallet > Decimal('0.00'):
        payment_method_display = "Wallet Balance (Full)"
    elif wallet > Decimal('0.00'):
        payment_method_display = f"Hybrid (Wallet + {method_text})"
    else:
        payment_method_display = method_text

    # Items
    items_list = []
    subtotal = Decimal('0.00')
    active_items_count = 0
    for item in order.items.all():
        is_rej = getattr(item, 'status', '') == 'REJECTED'
        price = Decimal(str(getattr(item, 'price_snapshot', 0) or '0'))
        sub = Decimal(str(getattr(item, 'subtotal', 0) or '0'))
        if not is_rej:
            subtotal += sub
            active_items_count += 1
        items_list.append({
            'name': getattr(item, 'product_name_snapshot', 'Item'),
            'unit': getattr(item, 'unit_snapshot', ''),
            'qty': getattr(item, 'quantity', 1),
            'rate': f"{price:.2f}",
            'amount': "0.00" if is_rej else f"{sub:.2f}",
            'is_rejected': is_rej,
        })

    # Terms
    raw_terms = getattr(store_settings, 'invoice_terms_and_conditions', None) or getattr(store_settings, 'terms_and_conditions', None) or ""
    if raw_terms and raw_terms.strip():
        terms_list = [line.strip() for line in raw_terms.split('\n') if line.strip()]
    else:
        terms_list = [
            "1. Goods once sold will not be taken back without original bill.",
            "2. Report any damaged or missing items within 24 hours of delivery.",
            "3. This is a computer-generated tax invoice and requires no physical signature."
        ]

    # Slot info
    slot_info = ""
    slot_label = getattr(order, 'delivery_slot_label', '')
    slot_date = getattr(order, 'delivery_slot_date', None)
    pickup_time = getattr(order, 'pickup_time', '')
    if slot_label:
        date_str = slot_date.strftime("%d %b %Y") if slot_date else ""
        slot_info = f"{date_str} ({slot_label})".strip()
    elif pickup_time:
        slot_info = pickup_time

    # Customer info
    customer = getattr(order, 'customer', None)
    customer_name = ""
    if customer:
        first = getattr(customer, 'first_name', '')
        last = getattr(customer, 'last_name', '')
        customer_name = f"{first} {last}".strip()
        if not customer_name:
            customer_name = getattr(customer, 'username', '')
    if not customer_name:
        customer_name = getattr(order, 'customer_name', '') or f"Customer #{customer.id if customer else order.id}"

    customer_phone = ""
    if customer and hasattr(customer, 'mobile_number') and customer.mobile_number:
        customer_phone = customer.mobile_number
    elif hasattr(order, 'customer_phone') and order.customer_phone:
        customer_phone = order.customer_phone

    # Signature
    signature_url = None
    sig_field = getattr(store_settings, 'invoice_signature', None)
    if sig_field:
        try:
            signature_url = sig_field.url
        except Exception:
            signature_url = None

    context = {
        'order': order,
        'store_name': getattr(store_settings, 'store_name', '') or "Narendra Kirana Store",
        'store_address': getattr(store_settings, 'store_address', '') or "",
        'store_phone': getattr(store_settings, 'store_phone', '') or "",
        'store_email': getattr(store_settings, 'store_email', '') or "",
        'gstin': getattr(store_settings, 'gstin', "") or "",
        'fssai': getattr(store_settings, 'fssai_license_number', "") or "",
        'invoice_number': invoice_number,
        'invoice_date': invoice_date,
        'order_date': order_date,
        'customer_name': customer_name,
        'customer_phone': customer_phone,
        'slot_info': slot_info,
        'items_list': items_list,
        'active_items_count': active_items_count,
        'subtotal': f"{subtotal:.2f}",
        'discount_applied': getattr(order, 'discount_applied', Decimal('0.00')) or Decimal('0.00'),
        'discount_applied_formatted': f"{(getattr(order, 'discount_applied', Decimal('0.00')) or Decimal('0.00')):.2f}",
        'promo_discount': getattr(order, 'promo_discount', Decimal('0.00')) or Decimal('0.00'),
        'promo_discount_formatted': f"{(getattr(order, 'promo_discount', Decimal('0.00')) or Decimal('0.00')):.2f}",
        'packaging_fee': getattr(order, 'packaging_fee', Decimal('0.00')) or Decimal('0.00'),
        'packaging_fee_formatted': f"{(getattr(order, 'packaging_fee', Decimal('0.00')) or Decimal('0.00')):.2f}",
        'delivery_fee': getattr(order, 'delivery_fee', Decimal('0.00')) or Decimal('0.00'),
        'delivery_fee_formatted': f"{(getattr(order, 'delivery_fee', Decimal('0.00')) or Decimal('0.00')):.2f}",
        'wallet_discount': getattr(order, 'wallet_discount', Decimal('0.00')) or Decimal('0.00'),
        'wallet_discount_formatted': f"{(getattr(order, 'wallet_discount', Decimal('0.00')) or Decimal('0.00')):.2f}",
        'payment_method_display': payment_method_display,
        'total_amount_formatted': f"{(getattr(order, 'total_amount', Decimal('0.00')) or Decimal('0.00')):.2f}",
        'terms_list': terms_list,
        'signature_url': signature_url,
    }

    return render_to_string('store/official_tax_invoice.html', context)

