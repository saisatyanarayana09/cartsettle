import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection, transaction
try:
  with transaction.atomic():
    with connection.cursor() as cur:
      cur.execute("UPDATE orders_order SET id = LEFT(id, LENGTH(id) - 4) WHERE LENGTH(id) = 15 AND id LIKE 'ORD%';")
      print('orders updated')
      cur.execute("UPDATE orders_orderitem SET order_id = LEFT(order_id, LENGTH(order_id) - 4) WHERE LENGTH(order_id) = 15 AND order_id LIKE 'ORD%';")
      print('orderitems updated')
except Exception as e:
  print(e)
