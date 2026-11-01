from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.testing import WebsocketCommunicator
from config.asgi import application
from orders.models import Order
from accounts.models import DeliveryPartnerProfile
from orders.ws_broadcast import (
    broadcast_order_created,
    broadcast_order_status,
    broadcast_rider_location,
    broadcast_order_ready_dispatch,
)

User = get_user_model()


class WebSocketIntegrationTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='9876543210',
            email='cust@example.com',
            first_name='Ramesh',
            is_customer=True
        )
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            first_name='Owner',
            is_owner=True
        )
        self.delivery_user = User.objects.create_user(
            username='8888888888',
            email='rider@example.com',
            first_name='Suresh',
            is_delivery_partner=True
        )
        self.delivery_profile = DeliveryPartnerProfile.objects.create(
            user=self.delivery_user,
            phone_number='8888888888',
            vehicle_type='Bike',
            is_active=True,
            is_online=True
        )
        self.order = Order.objects.create(
            customer=self.customer,
            total_amount=Decimal('250.00'),
            order_type='DELIVERY',
            delivery_address='Flat 101, Test Residency',
            delivery_otp='1234'
        )
        self.customer_token = str(AccessToken.for_user(self.customer))
        self.owner_token = str(AccessToken.for_user(self.owner))
        self.delivery_token = str(AccessToken.for_user(self.delivery_user))

    async def test_unauthenticated_connection_rejected(self):
        """Unauthenticated connections must be rejected with 4003 or connection refused."""
        communicator = WebsocketCommunicator(
            application,
            f"/ws/orders/{self.order.id}/tracking/"
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_authenticated_customer_tracking(self):
        """Authenticated customer connecting with JWT receives INITIAL_STATE and PONG."""
        communicator = WebsocketCommunicator(
            application,
            f"/ws/orders/{self.order.id}/tracking/?token={self.customer_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Should receive INITIAL_STATE snapshot
        response = await communicator.receive_json_from()
        self.assertEqual(response.get('type'), 'INITIAL_STATE')
        self.assertEqual(response.get('order', {}).get('id'), self.order.id)
        self.assertEqual(response.get('order', {}).get('delivery_otp'), '1234')

        # Test keep-alive PING/PONG
        await communicator.send_json_to({'type': 'PING'})
        pong = await communicator.receive_json_from()
        self.assertEqual(pong.get('type'), 'PONG')

        await communicator.disconnect()

    async def test_owner_orders_connection(self):
        """Store owner connecting with JWT receives connection confirmation."""
        communicator = WebsocketCommunicator(
            application,
            f"/ws/owner/orders/?token={self.owner_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        msg = await communicator.receive_json_from()
        self.assertEqual(msg.get('type'), 'CONNECTION_ESTABLISHED')

        await communicator.disconnect()

    async def test_broadcast_order_status_sync(self):
        """Broadcast status update sends event to customer tracking and owner dashboard simultaneously."""
        cust_comm = WebsocketCommunicator(
            application,
            f"/ws/orders/{self.order.id}/tracking/?token={self.customer_token}"
        )
        owner_comm = WebsocketCommunicator(
            application,
            f"/ws/owner/orders/?token={self.owner_token}"
        )
        cust_connected, _ = await cust_comm.connect()
        owner_connected, _ = await owner_comm.connect()
        self.assertTrue(cust_connected)
        self.assertTrue(owner_connected)

        # Clear initial messages
        await cust_comm.receive_json_from()  # INITIAL_STATE
        await owner_comm.receive_json_from()  # CONNECTION_ESTABLISHED

        # Broadcast order status update
        broadcast_order_status(self.order.id, 'PREPARING', delivery_otp='1234')

        # Customer receives ORDER_STATUS_UPDATE
        cust_msg = await cust_comm.receive_json_from()
        self.assertEqual(cust_msg.get('type'), 'ORDER_STATUS_UPDATE')
        self.assertEqual(cust_msg.get('status'), 'PREPARING')
        self.assertEqual(cust_msg.get('order_id'), self.order.id)

        # Owner receives ORDER_STATUS_CHANGED
        owner_msg = await owner_comm.receive_json_from()
        self.assertEqual(owner_msg.get('type'), 'ORDER_STATUS_CHANGED')
        self.assertEqual(owner_msg.get('status'), 'PREPARING')

        await cust_comm.disconnect()
        await owner_comm.disconnect()

    async def test_broadcast_order_created_to_owner(self):
        """Broadcast of newly created order arrives instantly at store owner dashboard."""
        owner_comm = WebsocketCommunicator(
            application,
            f"/ws/owner/orders/?token={self.owner_token}"
        )
        await owner_comm.connect()
        await owner_comm.receive_json_from()  # CONNECTION_ESTABLISHED

        broadcast_order_created(
            order=self.order,
            customer_name='Ramesh',
            customer_phone='9876543210',
            items_count=3
        )

        owner_msg = await owner_comm.receive_json_from()
        self.assertEqual(owner_msg.get('type'), 'NEW_ORDER')
        self.assertEqual(owner_msg.get('order', {}).get('id'), self.order.id)
        self.assertEqual(owner_msg.get('order', {}).get('customer_name'), 'Ramesh')

        await owner_comm.disconnect()

    async def test_rider_location_broadcast(self):
        """GPS coordinates streamed from delivery partner arrive at tracking customer in real-time."""
        cust_comm = WebsocketCommunicator(
            application,
            f"/ws/orders/{self.order.id}/tracking/?token={self.customer_token}"
        )
        await cust_comm.connect()
        await cust_comm.receive_json_from()  # INITIAL_STATE

        broadcast_rider_location(
            order_id=self.order.id,
            latitude=17.3850,
            longitude=78.4867,
            heading=90.0,
            speed=24.5
        )

        cust_msg = await cust_comm.receive_json_from()
        self.assertEqual(cust_msg.get('type'), 'RIDER_LOCATION_UPDATE')
        self.assertEqual(cust_msg.get('order_id'), self.order.id)
        self.assertAlmostEqual(cust_msg.get('latitude'), 17.3850, places=4)
        self.assertAlmostEqual(cust_msg.get('longitude'), 78.4867, places=4)

        await cust_comm.disconnect()

    async def test_delivery_dispatch_connection_and_ready_broadcast(self):
        """Delivery drivers receive instant dispatch broadcast when order is READY."""
        rider_comm = WebsocketCommunicator(
            application,
            f"/ws/delivery/dispatch/?token={self.delivery_token}"
        )
        connected, _ = await rider_comm.connect()
        self.assertTrue(connected)

        broadcast_order_ready_dispatch(self.order)

        dispatch_msg = await rider_comm.receive_json_from()
        self.assertEqual(dispatch_msg.get('type'), 'ORDER_READY_FOR_PICKUP')
        self.assertEqual(dispatch_msg.get('order', {}).get('id'), self.order.id)

        await rider_comm.disconnect()
