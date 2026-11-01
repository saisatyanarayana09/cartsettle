from django.urls import path
from .views import CartDetailView, CartItemCreateView, CartItemDetailView, ApplyPromoView, CartMergeView, CartClearView

urlpatterns = [
    path('', CartDetailView.as_view(), name='cart-detail'),
    path('items/', CartItemCreateView.as_view(), name='cart-item-create'),
    path('items/<int:pk>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('apply-promo/', ApplyPromoView.as_view(), name='apply-promo'),
    path('merge/', CartMergeView.as_view(), name='cart-merge'),
    path('clear/', CartClearView.as_view(), name='cart-clear'),
]

