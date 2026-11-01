from django.urls import path
from .delivery_views import (
    DeliveryDashboardView,
    DeliveryToggleDutyView,
    DeliveryPickupOrderView,
    DeliveryNotifyArrivalView,
    DeliveryVerifyAndCompleteView,
    DeliveryHistoryView,
    OwnerDeliveryPartnersView,
    DeliveryUpdateLocationView,
)

urlpatterns = [
    path('dashboard/', DeliveryDashboardView.as_view(), name='delivery-dashboard'),
    path('toggle-duty/', DeliveryToggleDutyView.as_view(), name='delivery-toggle-duty'),
    path('location/update/', DeliveryUpdateLocationView.as_view(), name='delivery-location-update'),
    path('orders/<str:pk>/pickup/', DeliveryPickupOrderView.as_view(), name='delivery-order-pickup'),
    path('orders/<str:pk>/notify-arrival/', DeliveryNotifyArrivalView.as_view(), name='delivery-order-notify-arrival'),
    path('orders/<str:pk>/complete/', DeliveryVerifyAndCompleteView.as_view(), name='delivery-order-complete'),
    path('history/', DeliveryHistoryView.as_view(), name='delivery-history'),
    path('partners/', OwnerDeliveryPartnersView.as_view(), name='owner-delivery-partners'),
]
