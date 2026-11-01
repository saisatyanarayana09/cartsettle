from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from store.views import BackendHealthView, RootDashboardView

from django.views.generic import RedirectView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('', RootDashboardView.as_view(), name='root-dashboard'),
    path('health/', BackendHealthView.as_view(), name='backend-health'),
    path('admin/', admin.site.urls),
    path('manage/', RedirectView.as_view(url='/admin/', permanent=False)),
    path('manage/<path:subpath>', RedirectView.as_view(url='/admin/%(subpath)s', permanent=False)),
    path('narendra_secure_vault_99/', RedirectView.as_view(url='/admin/', permanent=False)),
    path('narendra_secure_vault_99/<path:subpath>', RedirectView.as_view(url='/admin/%(subpath)s', permanent=False)),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/', include('products.urls')),
    path('api/v1/cart/', include('cart.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/offers/', include('offers.urls')),
    path('api/v1/store/', include('store.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/v1/delivery/', include('orders.delivery_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
