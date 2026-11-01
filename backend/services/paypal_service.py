"""
CartSettle PayPal Integration Service
Targeting PayPal AI Hackathon 2026:
- PayPal Orders v2 (intent="AUTHORIZE")
- PayPal Payments v2 (Dynamic Partial CAPTURE with final_capture=True)
- PayPal Payments v2 (VOID authorization)
- PayPal Payouts v1 (Autonomous Wholesale Restock B2B Payouts)
"""

import os
import time
import base64
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class PayPalService:
    def __init__(self):
        settings_mode = getattr(settings, "PAYPAL_MODE", "sandbox") if settings.configured else "sandbox"
        self.mode = os.environ.get("PAYPAL_MODE", settings_mode).lower()
        
        settings_client_id = getattr(settings, "PAYPAL_CLIENT_ID", "") if settings.configured else ""
        self.client_id = os.environ.get("PAYPAL_CLIENT_ID", settings_client_id).strip()
        
        settings_secret = getattr(settings, "PAYPAL_CLIENT_SECRET", "") if settings.configured else ""
        self.client_secret = os.environ.get("PAYPAL_CLIENT_SECRET", settings_secret).strip()

        
        if self.mode == "live":
            self.base_url = "https://api-m.paypal.com"
        else:
            self.base_url = "https://api-m.sandbox.paypal.com"
            
        self._cached_token = None
        self._token_expires_at = 0

    def get_access_token(self, force_refresh=False):
        """Fetch or return cached OAuth 2.0 Bearer Token."""
        now = time.time()
        if not force_refresh and self._cached_token and now < (self._token_expires_at - 60):
            return self._cached_token

        if not self.client_id or not self.client_secret:
            raise ValueError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured.")

        auth_header = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode("utf-8")).decode("utf-8")
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}

        url = f"{self.base_url}/v1/oauth2/token"
        response = requests.post(url, headers=headers, data=data, timeout=15)
        
        if response.status_code != 200:
            logger.error("PayPal OAuth Token Failure: %s %s", response.status_code, response.text)
            raise RuntimeError(f"PayPal OAuth failed: {response.text}")

        res_json = response.json()
        self._cached_token = res_json.get("access_token")
        expires_in = int(res_json.get("expires_in", 3600))
        self._token_expires_at = now + expires_in
        return self._cached_token

    def _auth_headers(self):
        token = self.get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def create_order(self, amount, currency="USD", custom_id=None, description="CartSettle Grocery Order", return_url=None, cancel_url=None):
        """
        Creates a PayPal Order with intent="AUTHORIZE".
        This puts a hold on the shopper's card without charging yet,
        enabling packing-table dynamic partial capture.
        """
        url = f"{self.base_url}/v2/checkout/orders"
        
        formatted_amount = f"{float(amount):.2f}"
        purchase_unit = {
            "reference_id": "default",
            "description": description[:127],
            "amount": {
                "currency_code": currency,
                "value": formatted_amount
            }
        }
        if custom_id:
            purchase_unit["custom_id"] = str(custom_id)

        payload = {
            "intent": "AUTHORIZE",
            "purchase_units": [purchase_unit]
        }

        if return_url and cancel_url:
            payload["payment_source"] = {
                "paypal": {
                    "experience_context": {
                        "payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED",
                        "brand_name": "CartSettle",
                        "locale": "en-US",
                        "landing_page": "LOGIN",
                        "user_action": "CONTINUE",
                        "return_url": return_url,
                        "cancel_url": cancel_url
                    }
                }
            }

        response = requests.post(url, headers=self._auth_headers(), json=payload, timeout=20)
        if response.status_code not in (200, 201):
            logger.error("PayPal Create Order Error: %s %s", response.status_code, response.text)
            raise RuntimeError(f"PayPal Create Order Error: {response.text}")

        return response.json()

    def authorize_order(self, order_id):
        """
        Authorizes payment for the order after the buyer completes approval in PayPal.
        Returns the authorization object containing the authorization_id.
        """
        url = f"{self.base_url}/v2/checkout/orders/{order_id}/authorize"
        headers = self._auth_headers()
        # PayPal recommend empty json or omit body
        response = requests.post(url, headers=headers, json={}, timeout=20)
        
        if response.status_code not in (200, 201):
            logger.error("PayPal Authorize Order Error: %s %s", response.status_code, response.text)
            raise RuntimeError(f"PayPal Authorize Order Error: {response.text}")

        data = response.json()
        
        # Extract authorization ID from purchase_units payments
        authorization_id = None
        try:
            purchase_units = data.get("purchase_units", [])
            if purchase_units:
                authorizations = purchase_units[0].get("payments", {}).get("authorizations", [])
                if authorizations:
                    authorization_id = authorizations[0].get("id")
        except Exception as e:
            logger.warning("Could not extract authorization_id cleanly: %s", e)

        data["extracted_authorization_id"] = authorization_id
        return data

    def capture_authorization(self, authorization_id, amount, currency="USD", final_capture=True, note="Packing table adjustment"):
        """
        Captures authorized funds.
        Crucial Hackathon Feature:
        When final_capture=True and amount < authorized_amount, PayPal captures only `amount`
        and automatically releases the remaining held funds back to the buyer's card/balance!
        """
        url = f"{self.base_url}/v2/payments/authorizations/{authorization_id}/capture"
        formatted_amount = f"{float(amount):.2f}"
        
        payload = {
            "amount": {
                "currency_code": currency,
                "value": formatted_amount
            },
            "final_capture": final_capture,
            "note_to_payer": note[:255]
        }

        response = requests.post(url, headers=self._auth_headers(), json=payload, timeout=20)
        if response.status_code not in (200, 201):
            logger.error("PayPal Capture Authorization Error: %s %s", response.status_code, response.text)
            raise RuntimeError(f"PayPal Capture Authorization Error: {response.text}")

        return response.json()

    def void_authorization(self, authorization_id):
        """
        Voids an authorization entirely if an order is cancelled before packing.
        """
        url = f"{self.base_url}/v2/payments/authorizations/{authorization_id}/void"
        response = requests.post(url, headers=self._auth_headers(), json={}, timeout=20)
        if response.status_code not in (200, 204):
            logger.error("PayPal Void Authorization Error: %s %s", response.status_code, response.text)
            raise RuntimeError(f"PayPal Void Authorization Error: {response.text}")
        return {"status": "VOIDED", "authorization_id": authorization_id}

    def get_order_details(self, order_id):
        """Retrieves current order status and details from PayPal."""
        url = f"{self.base_url}/v2/checkout/orders/{order_id}"
        response = requests.get(url, headers=self._auth_headers(), timeout=15)
        if response.status_code != 200:
            logger.error("PayPal Get Order Error: %s %s", response.status_code, response.text)
            raise RuntimeError(f"PayPal Get Order Error: {response.text}")
        return response.json()

    def create_payout(self, recipient_email, amount, currency="USD", note="Supplier Restock Payment", sender_item_id=None):
        """
        PayPal Payouts v1 API for autonomous supplier restocking settlements.
        """
        url = f"{self.base_url}/v1/payments/payouts"
        formatted_amount = f"{float(amount):.2f}"
        batch_id = f"payout_{int(time.time())}_{sender_item_id or 'restock'}"

        payload = {
            "sender_batch_header": {
                "sender_batch_id": batch_id[:30],
                "email_subject": "CartSettle Supplier Restock Payout",
                "email_message": note
            },
            "items": [
                {
                    "recipient_type": "EMAIL",
                    "amount": {
                        "value": formatted_amount,
                        "currency": currency
                    },
                    "note": note,
                    "sender_item_id": str(sender_item_id or batch_id)[:30],
                    "receiver": recipient_email
                }
            ]
        }

        response = requests.post(url, headers=self._auth_headers(), json=payload, timeout=20)
        if response.status_code not in (200, 201):
            logger.error("PayPal Payout Error: %s %s", response.status_code, response.text)
            raise RuntimeError(f"PayPal Payout Error: {response.text}")

        return response.json()


# Global Singleton instance
paypal_service = PayPalService()
