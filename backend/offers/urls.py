from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BannerViewSet, PromoCodeViewSet, ReferralSettingsView, ReferralMilestoneViewSet, ReferralHistoryViewSet

router = DefaultRouter()
router.register(r'banners', BannerViewSet, basename='banner')
router.register(r'promocodes', PromoCodeViewSet, basename='promocode')
router.register(r'referral-milestones', ReferralMilestoneViewSet, basename='referral-milestone')
router.register(r'referrals', ReferralHistoryViewSet, basename='referral')

urlpatterns = [
    path('', include(router.urls)),
    path('referral-settings/', ReferralSettingsView.as_view(), name='referral-settings'),
]
