from django.http import JsonResponse
from django.views import View
from django.utils import timezone
from django.db.models import Count, Sum, Q
from datetime import timedelta
import psutil
import os
import sys


class APIDashboardDataView(View):
    """JSON endpoint that provides all dashboard data."""
    
    def get(self, request):
        if not request.user.is_authenticated or not (request.user.is_staff or getattr(request.user, 'is_owner', False)):
            return JsonResponse({'error': 'Forbidden'}, status=403)
        from django.core.cache import cache
        cache_key = 'admin_dashboard_data'
        cached_data = cache.get(cache_key)
        if cached_data:
            return JsonResponse(cached_data)

        from orders.models import Order
        from products.models import Product, Category
        from accounts.models import User
        from notifications.models import Notification
        
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # --- Orders (Single Aggregated Query instead of 8 separate queries) ---
        order_stats = Order.objects.aggregate(
            total=Count('id'),
            today=Count('id', filter=Q(created_at__gte=today_start)),
            pending=Count('id', filter=Q(status=Order.Status.NEW)),
            active=Count('id', filter=Q(status__in=[Order.Status.ACCEPTED, Order.Status.PREPARING, Order.Status.READY])),
            completed=Count('id', filter=Q(status=Order.Status.COMPLETED)),
            rejected=Count('id', filter=Q(status=Order.Status.REJECTED)),
            total_revenue=Sum('total_amount', filter=Q(status=Order.Status.COMPLETED)),
            today_revenue=Sum('total_amount', filter=Q(status=Order.Status.COMPLETED, created_at__gte=today_start)),
        )
        total_orders = order_stats['total']
        today_orders = order_stats['today']
        pending_orders = order_stats['pending']
        active_orders = order_stats['active']
        completed_orders = order_stats['completed']
        rejected_orders = order_stats['rejected']
        total_revenue = order_stats['total_revenue'] or 0
        today_revenue = order_stats['today_revenue'] or 0
        
        # --- Products (Single Aggregated Query instead of 3 separate queries) ---
        product_stats = Product.objects.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(is_active=True)),
            out_of_stock=Count('id', filter=Q(is_in_stock=False)),
        )
        total_products = product_stats['total']
        active_products = product_stats['active']
        out_of_stock = product_stats['out_of_stock']
        total_categories = Category.objects.count()
        
        # --- Users (Single Aggregated Query instead of 3 separate queries) ---
        user_stats = User.objects.aggregate(
            total=Count('id'),
            customers=Count('id', filter=Q(is_customer=True)),
            today_signups=Count('id', filter=Q(date_joined__gte=today_start)),
        )
        total_users = user_stats['total']
        total_customers = user_stats['customers']
        today_signups = user_stats['today_signups']
        
        # --- Notifications (Single Aggregated Query instead of 2 separate queries) ---
        notification_stats = Notification.objects.aggregate(
            total=Count('id'),
            unread=Count('id', filter=Q(is_read=False)),
        )
        total_notifications = notification_stats['total']
        unread_notifications = notification_stats['unread']
        
        # --- Recent Orders (last 10) ---
        recent_orders = list(
            Order.objects.select_related('customer')
            .order_by('-created_at')[:10]
            .values('id', 'status', 'total_amount', 'created_at', 'customer__first_name', 'customer__last_name')
        )
        for o in recent_orders:
            o['created_at'] = o['created_at'].isoformat()
            o['total_amount'] = float(o['total_amount'])
        
        # --- System Info ---
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=None)
            system_info = {
                'python_version': sys.version.split()[0],
                'cpu_percent': cpu_percent,
                'memory_total_gb': round(memory.total / (1024**3), 1),
                'memory_used_gb': round(memory.used / (1024**3), 1),
                'memory_percent': memory.percent,
                'pid': os.getpid(),
            }
        except Exception:
            system_info = {
                'python_version': sys.version.split()[0],
                'cpu_percent': 0,
                'memory_total_gb': 0,
                'memory_used_gb': 0,
                'memory_percent': 0,
                'pid': os.getpid(),
            }
        
        # --- API Endpoints ---
        endpoints = [
            {'method': 'POST', 'path': '/api/v1/auth/signup/', 'description': 'Customer signup', 'app': 'accounts'},
            {'method': 'POST', 'path': '/api/v1/auth/login/', 'description': 'JWT login', 'app': 'accounts'},
            {'method': 'POST', 'path': '/api/v1/auth/token/refresh/', 'description': 'Refresh JWT token', 'app': 'accounts'},
            {'method': 'GET/PUT', 'path': '/api/v1/auth/profile/', 'description': 'User profile', 'app': 'accounts'},
            {'method': 'GET', 'path': '/api/v1/auth/wallet/', 'description': 'Wallet balance & transactions', 'app': 'accounts'},
            {'method': 'GET', 'path': '/api/v1/auth/customers/', 'description': 'List customers (owner)', 'app': 'accounts'},
            {'method': 'CRUD', 'path': '/api/v1/auth/addresses/', 'description': 'Customer addresses', 'app': 'accounts'},
            {'method': 'CRUD', 'path': '/api/v1/categories/', 'description': 'Product categories', 'app': 'products'},
            {'method': 'CRUD', 'path': '/api/v1/products/', 'description': 'Products', 'app': 'products'},
            {'method': 'CRUD', 'path': '/api/v1/favorites/', 'description': 'Customer favorites', 'app': 'products'},
            {'method': 'GET', 'path': '/api/v1/cart/', 'description': 'View cart', 'app': 'cart'},
            {'method': 'POST', 'path': '/api/v1/cart/items/', 'description': 'Add item to cart', 'app': 'cart'},
            {'method': 'PATCH/DEL', 'path': '/api/v1/cart/items/{id}/', 'description': 'Update/remove cart item', 'app': 'cart'},
            {'method': 'POST', 'path': '/api/v1/cart/apply-promo/', 'description': 'Apply promo code', 'app': 'cart'},
            {'method': 'CRUD', 'path': '/api/v1/orders/', 'description': 'Orders', 'app': 'orders'},
            {'method': 'PATCH', 'path': '/api/v1/orders/{id}/status/', 'description': 'Update order status', 'app': 'orders'},
            {'method': 'PATCH', 'path': '/api/v1/orders/{id}/owner_note/', 'description': 'Add owner note', 'app': 'orders'},
            {'method': 'POST', 'path': '/api/v1/orders/{id}/reject_item/', 'description': 'Reject single item', 'app': 'orders'},
            {'method': 'GET', 'path': '/api/v1/orders/analytics/', 'description': 'Sales analytics', 'app': 'orders'},
            {'method': 'CRUD', 'path': '/api/v1/offers/banners/', 'description': 'Promotional banners', 'app': 'offers'},
            {'method': 'CRUD', 'path': '/api/v1/offers/promocodes/', 'description': 'Promo codes', 'app': 'offers'},
            {'method': 'GET/PUT', 'path': '/api/v1/offers/referral-settings/', 'description': 'Referral settings', 'app': 'offers'},
            {'method': 'CRUD', 'path': '/api/v1/offers/referral-milestones/', 'description': 'Referral milestones', 'app': 'offers'},
            {'method': 'GET', 'path': '/api/v1/offers/referrals/', 'description': 'Referral history', 'app': 'offers'},
            {'method': 'GET/PUT', 'path': '/api/v1/store/settings/', 'description': 'Store settings', 'app': 'store'},
            {'method': 'CRUD', 'path': '/api/v1/store/feedback/', 'description': 'Customer feedback', 'app': 'store'},
            {'method': 'CRUD', 'path': '/api/v1/store/homepage-sections/', 'description': 'Homepage sections', 'app': 'store'},
            {'method': 'CRUD', 'path': '/api/v1/notifications/', 'description': 'Notifications', 'app': 'notifications'},
            {'method': 'POST', 'path': '/api/v1/notifications/owner/send/', 'description': 'Owner send notification', 'app': 'notifications'},
        ]
        
        data = {
            'timestamp': now.isoformat(),
            'orders': {
                'total': total_orders,
                'today': today_orders,
                'pending': pending_orders,
                'active': active_orders,
                'completed': completed_orders,
                'rejected': rejected_orders,
            },
            'revenue': {
                'total': float(total_revenue),
                'today': float(today_revenue),
            },
            'products': {
                'total': total_products,
                'active': active_products,
                'out_of_stock': out_of_stock,
                'categories': total_categories,
            },
            'users': {
                'total': total_users,
                'customers': total_customers,
                'today_signups': today_signups,
            },
            'notifications': {
                'total': total_notifications,
                'unread': unread_notifications,
            },
            'recent_orders': recent_orders,
            'system': system_info,
            'endpoints': endpoints,
        }
        
        cache.set(cache_key, data, 60)
        return JsonResponse(data)
