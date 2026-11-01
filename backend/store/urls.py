from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StoreSettingsView,
    StorePublicSettingsView, 
    FeedbackViewSet, 
    HomepageSectionViewSet, 
    VoiceSearchView,
    StoreEmailSettingsView,
    TestStoreEmailView,
    StoreBackupStatsView,
    StoreBackupExportView,
    AgentChatView,
    AgentToolsView,
    SupplierPayoutView
)

router = DefaultRouter()
router.register(r'feedback', FeedbackViewSet, basename='feedback')
router.register(r'homepage-sections', HomepageSectionViewSet, basename='homepage-section')

urlpatterns = [
    path('public-settings/', StorePublicSettingsView.as_view(), name='store-public-settings'),
    path('settings/', StoreSettingsView.as_view(), name='store-settings'),
    path('email-settings/', StoreEmailSettingsView.as_view(), name='store-email-settings'),
    path('email-settings/test/', TestStoreEmailView.as_view(), name='store-email-settings-test'),
    path('voice-search/', VoiceSearchView.as_view(), name='store-voice-search'),
    path('backup/stats/', StoreBackupStatsView.as_view(), name='store-backup-stats'),
    path('backup/export/', StoreBackupExportView.as_view(), name='store-backup-export'),
    path('agent/chat/', AgentChatView.as_view(), name='agent-chat'),
    path('agent/tools/', AgentToolsView.as_view(), name='agent-tools'),
    path('payouts/create/', SupplierPayoutView.as_view(), name='supplier-payout'),

    path('', include(router.urls)),
]
