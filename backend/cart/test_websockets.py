from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.testing import WebsocketCommunicator
from config.asgi import application
from cart.models import Cart, CartItem
from products.models import Product

User = get_user_model()


class CartWebSocketIntegrationTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='9876543211',
            email='cartcust@example.com',
            first_name='Raju',
            is_customer=True
        )
        self.product = Product.objects.create(
            name='Sunflower Oil',
            unit='1 L',
            regular_price=Decimal('140.00'),
            offer_price=Decimal('130.00'),
            stock_quantity=20,
            max_order_quantity=5,
            is_active=True,
            is_in_stock=True
        )
        self.cart = Cart.objects.create(customer=self.customer)
        self.item = CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)
        self.token = str(AccessToken.for_user(self.customer))

    async def test_unauthenticated_cart_connection_rejected(self):
        """Unauthenticated connections to /ws/cart/ must be rejected with 4003."""
        communicator = WebsocketCommunicator(application, "/ws/cart/")
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_authenticated_cart_initial_state(self):
        """Authenticated customer connecting with JWT receives INITIAL_STATE with current cart."""
        communicator = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        msg = await communicator.receive_json_from()
        self.assertEqual(msg.get('type'), 'INITIAL_STATE')
        cart_data = msg.get('cart', {})
        self.assertEqual(len(cart_data.get('items', [])), 1)
        self.assertEqual(cart_data['items'][0]['product'], self.product.id)
        self.assertEqual(cart_data['items'][0]['quantity'], 2)

        # Test keep-alive PING/PONG
        await communicator.send_json_to({'type': 'PING'})
        pong = await communicator.receive_json_from()
        self.assertEqual(pong.get('type'), 'PONG')

        await communicator.disconnect()

    async def test_cart_add_item_over_websocket(self):
        """Adding a product via WebSocket emits CART_UPDATED with updated items and subtotal."""
        new_prod = await Product.objects.acreate(
            name='Wheat Flour',
            unit='5 kg',
            regular_price=Decimal('220.00'),
            stock_quantity=15,
            is_active=True,
            is_in_stock=True
        )

        communicator = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")
        await communicator.connect()
        await communicator.receive_json_from()  # INITIAL_STATE

        # Send ADD_ITEM command
        await communicator.send_json_to({
            'type': 'ADD_ITEM',
            'product_id': new_prod.id,
            'quantity': 1
        })

        update_msg = await communicator.receive_json_from()
        self.assertEqual(update_msg.get('type'), 'CART_UPDATED')
        cart_data = update_msg.get('cart', {})
        items = cart_data.get('items', [])
        self.assertEqual(len(items), 2)
        prod_ids = [i['product'] for i in items]
        self.assertIn(new_prod.id, prod_ids)

        await communicator.disconnect()

    async def test_cart_update_and_remove_over_websocket(self):
        """Updating quantity and removing an item over WebSocket broadcasts real-time cart state."""
        communicator = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")
        await communicator.connect()
        initial = await communicator.receive_json_from()  # INITIAL_STATE
        item_id = initial['cart']['items'][0]['id']

        # 1. Update quantity to 4
        await communicator.send_json_to({
            'type': 'UPDATE_QUANTITY',
            'item_id': item_id,
            'quantity': 4
        })

        update_msg = await communicator.receive_json_from()
        self.assertEqual(update_msg.get('type'), 'CART_UPDATED')
        self.assertEqual(update_msg['cart']['items'][0]['quantity'], 4)

        # 2. Remove item
        await communicator.send_json_to({
            'type': 'REMOVE_ITEM',
            'item_id': item_id
        })

        removed_msg = await communicator.receive_json_from()
        self.assertEqual(removed_msg.get('type'), 'CART_UPDATED')
        self.assertEqual(len(removed_msg['cart']['items']), 0)

        await communicator.disconnect()

    async def test_multi_client_cart_sync(self):
        """Modifying the cart from Client A broadcasts live update to Client B simultaneously."""
        comm_a = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")
        comm_b = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")

        connected_a, _ = await comm_a.connect()
        connected_b, _ = await comm_b.connect()
        self.assertTrue(connected_a)
        self.assertTrue(connected_b)

        await comm_a.receive_json_from()  # INITIAL_STATE
        await comm_b.receive_json_from()  # INITIAL_STATE

        # Client A updates item quantity
        await comm_a.send_json_to({
            'type': 'UPDATE_QUANTITY',
            'item_id': self.item.id,
            'quantity': 3
        })

        # Both Client A and Client B should receive the CART_UPDATED broadcast!
        msg_a = await comm_a.receive_json_from()
        msg_b = await comm_b.receive_json_from()

        self.assertEqual(msg_a.get('type'), 'CART_UPDATED')
        self.assertEqual(msg_b.get('type'), 'CART_UPDATED')
        self.assertEqual(msg_a['cart']['items'][0]['quantity'], 3)
        self.assertEqual(msg_b['cart']['items'][0]['quantity'], 3)

        await comm_a.disconnect()
        await comm_b.disconnect()

    async def test_merge_guest_cart_over_websocket(self):
        """Guest cart items sent over WebSocket merge seamlessly into user's account cart."""
        guest_prod = await Product.objects.acreate(
            name='Sugar',
            unit='1 kg',
            regular_price=Decimal('50.00'),
            stock_quantity=30,
            is_active=True,
            is_in_stock=True
        )

        communicator = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")
        await communicator.connect()
        await communicator.receive_json_from()  # INITIAL_STATE

        # Send MERGE_GUEST
        await communicator.send_json_to({
            'type': 'MERGE_GUEST',
            'items': [{'product': guest_prod.id, 'quantity': 3}]
        })

        merge_msg = await communicator.receive_json_from()
        self.assertEqual(merge_msg.get('type'), 'CART_UPDATED')
        items = merge_msg['cart']['items']
        self.assertEqual(len(items), 2)
        sugar_item = next(i for i in items if i['product'] == guest_prod.id)
        self.assertEqual(sugar_item['quantity'], 3)

        await communicator.disconnect()

    async def test_clear_cart_over_websocket(self):
        """Clearing the cart via WebSocket broadcasts empty cart state."""
        communicator = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")
        await communicator.connect()
        await communicator.receive_json_from()  # INITIAL_STATE

        await communicator.send_json_to({'type': 'CLEAR_CART'})
        msg = await communicator.receive_json_from()
        self.assertEqual(msg.get('type'), 'CART_UPDATED')
        self.assertEqual(len(msg['cart']['items']), 0)
        await communicator.disconnect()

    async def test_update_quantity_by_product_id_only(self):
        """When client sends product_id with null item_id, consumer handles it correctly."""
        communicator = WebsocketCommunicator(application, f"/ws/cart/?token={self.token}")
        await communicator.connect()
        await communicator.receive_json_from()  # INITIAL_STATE

        await communicator.send_json_to({
            'type': 'UPDATE_QUANTITY',
            'product_id': self.product.id,
            'item_id': None,
            'quantity': 4,
        })
        msg = await communicator.receive_json_from()
        self.assertEqual(msg.get('type'), 'CART_UPDATED')
        self.assertEqual(msg['cart']['items'][0]['quantity'], 4)
        await communicator.disconnect()
