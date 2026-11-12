from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from products.models import Product, Category
from orders.models import Order
from services.agent_service import agent_service
from decimal import Decimal
import datetime

User = get_user_model()

class GoldenAnswersTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test categories
        cls.cat_dairy = Category.objects.create(name="Dairy & Eggs", is_active=True)
        cls.cat_oil = Category.objects.create(name="Edible Oils & Ghee", is_active=True)
        cls.cat_instant = Category.objects.create(name="Instant Food & Noodles", is_active=True)

        # Create test products
        cls.p_butter = Product.objects.create(
            name="Amul Butter",
            category=cls.cat_dairy,
            regular_price=Decimal("275.00"),
            offer_price=Decimal("260.00"),
            cost_price=Decimal("240.00"),
            stock_quantity=60,
            unit="500 g Box",
            is_active=True,
            is_in_stock=True
        )
        cls.p_oil = Product.objects.create(
            name="Fortune Sunflower Oil",
            category=cls.cat_oil,
            regular_price=Decimal("145.00"),
            offer_price=Decimal("132.00"),
            cost_price=Decimal("115.00"),
            stock_quantity=70,
            unit="1 L Pouch",
            is_active=True,
            is_in_stock=True
        )
        cls.p_maggi = Product.objects.create(
            name="Maggi Masala Noodles",
            category=cls.cat_instant,
            regular_price=Decimal("14.00"),
            offer_price=Decimal("14.00"),
            cost_price=Decimal("11.00"),
            stock_quantity=120,
            unit="70 g Pack",
            is_active=True,
            is_in_stock=True
        )

        # Create test users
        cls.user_rahul = User.objects.create_user(
            username="customer_rahul",
            first_name="Rahul",
            last_name="Sharma",
            email="rahul@example.com"
        )
        cls.user_priya = User.objects.create_user(
            username="customer_priya",
            first_name="Priya",
            last_name="Sharma",
            email="priya@example.com"
        )
        cls.user_sai = User.objects.create_user(
            username="saisatyanarayana2004@gmail.com",
            first_name="K Sai Satyanarayana",
            last_name="Satyanarayana",
            email="saisatyanarayana2004@gmail.com"
        )

        # Create test orders
        # Rahul has 0 orders
        # Priya has 2 orders (1 today, 1 rejected)
        now = timezone.now()
        cls.order_1 = Order.objects.create(
            id="ORD202600101",
            customer=cls.user_priya,
            total_amount=Decimal("520.00"),
            status="ACCEPTED",
            created_at=now
        )
        cls.order_2 = Order.objects.create(
            id="ORD202600102",
            customer=cls.user_priya,
            total_amount=Decimal("264.00"),
            status="REJECTED",
            created_at=now - datetime.timedelta(days=2)
        )

    def test_customer_order_count_rahul_sharma_zero(self):
        """Rahul Sharma has 0 orders in database - must state 0 orders with 0 cards."""
        res = agent_service.chat("how many orders were made by Rahul Sharma", persona="owner")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("Rahul Sharma has placed 0 orders", reply)
        self.assertEqual(len(actions), 0)
        self.assertNotIn("$", reply)

    def test_customer_order_count_priya_sharma_two(self):
        """Priya Sharma has 2 orders in database - must state 2 orders."""
        res = agent_service.chat("how many orders were made by Priya Sharma", persona="owner")
        reply = res.get("reply", "")
        self.assertIn("Priya Sharma has placed 2 orders", reply)
        self.assertNotIn("$", reply)

    def test_show_rejected_orders(self):
        """Show rejected orders returns rejected orders card, NOT grocery products."""
        res = agent_service.chat("show me rejected orders", persona="owner")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("rejected orders", reply.lower())
        self.assertTrue(len(actions) > 0)
        self.assertEqual(actions[0].get("type"), "ORDERS_LIST_CARD")
        self.assertEqual(actions[0]["orders"][0]["id"], "ORD202600102")

    def test_cheapest_cooking_oil(self):
        """Cheapest cooking oil returns Fortune Sunflower Oil, NOT noodles or pasta."""
        res = agent_service.chat("cheapest cooking oil", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("Fortune Sunflower Oil", reply)
        self.assertIn("₹132", reply)
        self.assertTrue(len(actions) > 0)
        self.assertEqual(actions[0]["items"][0]["name"], "Fortune Sunflower Oil")

    def test_is_maggi_in_stock(self):
        """Is Maggi in stock returns stock lookup for Maggi, NOT a recipe dinner basket."""
        res = agent_service.chat("is Maggi in stock", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("Maggi Masala Noodles", reply)
        self.assertIn("120 in stock", reply)
        self.assertIn("₹14", reply)
        self.assertTrue(len(actions) > 0)
        self.assertEqual(actions[0]["items"][0]["name"], "Maggi Masala Noodles")

    def test_out_of_stock_count(self):
        """Out of stock count returns exact count of depleted products."""
        res = agent_service.chat("how many products are out of stock", persona="owner")
        reply = res.get("reply", "")
        self.assertIn("0 products are out of stock", reply)

    def test_out_of_scope_guardrail(self):
        """Universal intelligence: non-store technical questions are answered accurately with zero store actions."""
        res = agent_service.chat("Write Python code for fibonacci", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertTrue("fibonacci" in reply.lower() or "def " in reply)
        self.assertEqual(len(actions), 0)

    def test_bulk_update_inventory_confirmation(self):
        """Bulk update tools generate a CONFIRMATION_REQUIRED card."""
        from services.agent_service import AgentTools
        res = AgentTools.execute_tool("bulk_update_inventory", {"category": "Dairy", "price_pct_change": 5.0, "dry_run": True})
        self.assertEqual(res.get("status"), "CONFIRMATION_REQUIRED")
        self.assertIn("action_id", res)
        self.assertEqual(res.get("affected_count"), 1)

    def test_shopper_cannot_audit_other_customer_orders(self):
        """Shoppers cannot query other customers' order counts or history."""
        res = agent_service.chat("how many orders were made by Rahul Sharma", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("restricted", reply.lower())
        self.assertEqual(len(actions), 0)

    def test_shopper_cannot_view_sales_revenue(self):
        """Shoppers cannot query store revenue or sales analytics."""
        res = agent_service.chat("what is today's revenue", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("restricted", reply.lower())
        self.assertEqual(len(actions), 0)

    def test_shopper_cannot_settle_orders(self):
        """Shoppers cannot settle or pack orders."""
        res = agent_service.chat("settle order ORD202600101", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("restricted", reply.lower())
        self.assertEqual(len(actions), 0)

    def test_shopper_cannot_audit_storewide_rejected_orders(self):
        """Shoppers cannot view storewide rejected orders."""
        res = agent_service.chat("show rejected orders", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("restricted", reply.lower())
        self.assertEqual(len(actions), 0)

    def test_shopper_recent_orders_airgap(self):
        """Shoppers asking for recent orders never see other customers' orders or can_settle buttons."""
        res = agent_service.chat("show recent orders", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertEqual(len(actions), 0)
        self.assertIn("haven't placed any orders", reply.lower())

    def test_owner_query_customer_profile(self):
        """Owner asking about a customer returns customer profile card and dossier, NOT groceries."""
        res = agent_service.chat("what about the customer Priya Sharma", persona="owner")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("Priya Sharma", reply)
        self.assertIn("2 orders", reply)
        self.assertNotIn("Maggi", reply)
        self.assertNotIn("Noodles", reply)
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0].get("type"), "CUSTOMER_PROFILE_CARD")
        self.assertEqual(actions[0].get("customer", {}).get("name"), "Priya Sharma")

    def test_shopper_privacy_refuses_customer_inquiry(self):
        """Shoppers asking about another customer receive privacy refusal with 0 cards, NEVER groceries."""
        res = agent_service.chat("what about the customer Sai Satyanarayana", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("private", reply.lower())
        self.assertEqual(len(actions), 0)
        self.assertNotIn("Maggi", reply)
        self.assertNotIn("Noodles", reply)

    def test_what_about_sai_satyanarayana_no_customer_keyword(self):
        """Owner asking 'what about the sai satyanarayana' returns profile, NEVER Maggi Noodles."""
        res = agent_service.chat("what about the sai satyanarayana", persona="owner")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("Sai Satyanarayana", reply)
        self.assertNotIn("Maggi", reply)
        self.assertNotIn("Noodles", reply)
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0].get("type"), "CUSTOMER_PROFILE_CARD")

    def test_shopper_privacy_refuses_bare_person_query(self):
        """Shoppers asking 'what about the sai satyanarayana' receive privacy refusal with 0 cards."""
        res = agent_service.chat("what about the sai satyanarayana", persona="shopper")
        reply = res.get("reply", "")
        actions = res.get("actions", [])
        self.assertIn("private", reply.lower())
        self.assertEqual(len(actions), 0)
        self.assertNotIn("Maggi", reply)

    def test_who_is_rahul_sharma_owner_and_shopper(self):
        """'who is rahul sharma' returns profile for owner and privacy refusal for shopper."""
        res_owner = agent_service.chat("who is rahul sharma", persona="owner")
        self.assertIn("Rahul Sharma", res_owner.get("reply", ""))
        self.assertEqual(len(res_owner.get("actions", [])), 1)
        self.assertEqual(res_owner["actions"][0].get("type"), "CUSTOMER_PROFILE_CARD")

        res_shopper = agent_service.chat("who is rahul sharma", persona="shopper")
        self.assertIn("private", res_shopper.get("reply", "").lower())
        self.assertEqual(len(res_shopper.get("actions", [])), 0)

    def test_what_about_whole_wheat_bread_falls_through_to_products(self):
        """'what about whole wheat bread' safely falls through to product search, NOT customer privacy."""
        res = agent_service.chat("what about whole wheat bread", persona="shopper")
        reply = res.get("reply", "")
        self.assertNotIn("private", reply.lower())
        self.assertNotIn("restricted", reply.lower())

    def test_customer_inquiry_with_honorific(self):
        """Honorifics ('Dr.', 'Mr.') resolve the correct customer profile for owner."""
        res_dr = agent_service.chat("who is Dr. Sai Satyanarayana", persona="owner")
        self.assertIn("Sai Satyanarayana", res_dr.get("reply", ""))
        self.assertEqual(len(res_dr.get("actions", [])), 1)
        self.assertEqual(res_dr["actions"][0].get("type"), "CUSTOMER_PROFILE_CARD")

    def test_customer_inquiry_hyphenated(self):
        """Hyphenated name queries ('sai-satyanarayana') resolve the customer profile."""
        res = agent_service.chat("what about sai-satyanarayana", persona="owner")
        self.assertIn("Sai Satyanarayana", res.get("reply", ""))
        self.assertEqual(len(res.get("actions", [])), 1)
        self.assertEqual(res["actions"][0].get("type"), "CUSTOMER_PROFILE_CARD")

    def test_customer_inquiry_email_address(self):
        """Full email address query resolves the customer profile."""
        res = agent_service.chat("who is saisatyanarayana2004@gmail.com", persona="owner")
        self.assertIn("Sai Satyanarayana", res.get("reply", ""))
        self.assertEqual(len(res.get("actions", [])), 1)
        self.assertEqual(res["actions"][0].get("type"), "CUSTOMER_PROFILE_CARD")

    def test_system_accounts_and_common_terms_never_hijacked(self):
        """System accounts ('owner', 'shopper') and common words ('art', 'com') never return CUSTOMER_PROFILE_CARD."""
        for term in ["who is owner", "what about shopper", "what about art", "what about com"]:
            res = agent_service.chat(term, persona="owner")
            cards = [a.get("type") for a in res.get("actions", [])]
            self.assertNotIn("CUSTOMER_PROFILE_CARD", cards, f"Query '{term}' falsely triggered CUSTOMER_PROFILE_CARD")

    def test_what_about_amul_butter_returns_product(self):
        """'what about amul butter' returns Amul Butter product card, never privacy or error."""
        res = agent_service.chat("what about amul butter", persona="shopper")
        reply = res.get("reply", "")
        self.assertIn("Amul Butter", reply)
        self.assertNotIn("private", reply.lower())
        actions = res.get("actions", [])
        self.assertTrue(len(actions) > 0)
        self.assertEqual(actions[0].get("type"), "SEARCH_RESULTS")
