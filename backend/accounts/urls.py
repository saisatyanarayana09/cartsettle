from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    OwnerCustomerDetailView, RequestDeleteView, ApproveDeleteView, RejectDeleteView,
    PasswordResetRequestView, PasswordResetConfirmView, PasswordResetOTPConfirmView,
    PasswordResetVerifyOTPView, PasswordResetValidateTokenView,
    AdminUnlockUserView, AdminLockUserView, AdminActivateUserView,
    VerifyEmailView, ResendActivationEmailView, CustomerSignupView, CustomTokenObtainPairView, ProfileView,
    CustomerListView, AddressViewSet, WalletView, GoogleOwnerLoginView, admin_google_login,
    GoogleCustomerAuthView, GoogleDeliveryLoginView,
    ReferralLookupView, RecordDownloadReferralView, LogoutView, AgentManagementView
)

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [

    path('request-delete/', RequestDeleteView.as_view(), name='request-delete'),
    path('customers/<int:pk>/details/', OwnerCustomerDetailView.as_view(), name='customer-details'),
    path('customers/<int:user_id>/approve-delete/', ApproveDeleteView.as_view(), name='approve-delete'),
    path('customers/<int:user_id>/reject-delete/', RejectDeleteView.as_view(), name='reject-delete'),
    path('customers/<int:user_id>/unlock/', AdminUnlockUserView.as_view(), name='admin-unlock-user'),
    path('customers/<int:user_id>/lock/', AdminLockUserView.as_view(), name='admin-lock-user'),
    path('customers/<int:user_id>/activate/', AdminActivateUserView.as_view(), name='admin-activate-user'),

    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/validate-token/', PasswordResetValidateTokenView.as_view(), name='password-reset-validate-token'),
    path('password-reset/verify-otp/', PasswordResetVerifyOTPView.as_view(), name='password-reset-verify-otp'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password-reset/otp-confirm/', PasswordResetOTPConfirmView.as_view(), name='password-reset-otp-confirm'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-activation/', ResendActivationEmailView.as_view(), name='resend-activation'),

    path('signup/', CustomerSignupView.as_view(), name='signup'),
    path('referral-lookup/', ReferralLookupView.as_view(), name='referral-lookup'),
    path('record-download-referral/', RecordDownloadReferralView.as_view(), name='record-download-referral'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('google-login/', GoogleOwnerLoginView.as_view(), name='google-login'),
    path('google/customer/', GoogleCustomerAuthView.as_view(), name='google-customer-auth'),
    path('google/delivery/', GoogleDeliveryLoginView.as_view(), name='google-delivery-login'),
    path('admin-google-login/', admin_google_login, name='admin-google-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('customers/', CustomerListView.as_view(), name='customer-list'),
    path('agents/', AgentManagementView.as_view(), name='agent-management'),
    path('agents/<int:user_id>/', AgentManagementView.as_view(), name='agent-management-detail'),
    path('', include(router.urls)),
]
