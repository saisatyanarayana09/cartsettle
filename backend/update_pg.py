import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection, transaction
try:
  with transaction.atomic():
    with connection.cursor() as cur:
      cur.execute("UPDATE orders_order SET id = REPLACE(id, '-', '') WHERE id LIKE '%-%';")
      print('orders updated')
      cur.execute("UPDATE orders_orderitem SET order_id = REPLACE(order_id, '-', '') WHERE order_id LIKE '%-%';")
      print('orderitems updated')
except Exception as e:
  print(e)
