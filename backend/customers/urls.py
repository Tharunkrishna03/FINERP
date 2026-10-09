from django.urls import path
from .views import ChangePasswordView, CreateUserView, CustomerListCreateView, CustomerProfileListCreateView, CustomerProfileRetrieveUpdateDestroyView, CustomerRetrieveUpdateDestroyView, CustomerTenureCallDoneAPIView, CustomerTransactionDestroyView, CustomerTransactionListCreateView, DeleteUserView, ListUsersView, UserProfileView, VerifyPasswordView, PaymentCreateAPIView

urlpatterns = [
    path('customer-profiles', CustomerProfileListCreateView.as_view(), name='customer-profile-list-create'),
    path('customer-profiles/', CustomerProfileListCreateView.as_view(), name='customer-profile-list-create-slash'),
    path('customer-profiles/<int:pk>', CustomerProfileRetrieveUpdateDestroyView.as_view(), name='customer-profile-detail'),
    path('customer-profiles/<int:pk>/', CustomerProfileRetrieveUpdateDestroyView.as_view(), name='customer-profile-detail-slash'),
    path('customers', CustomerListCreateView.as_view(), name='customer-list-create'),
    path('customers/', CustomerListCreateView.as_view(), name='customer-list-create-slash'),
    
    path('customers/<int:pk>', CustomerRetrieveUpdateDestroyView.as_view(), name='customer-detail'),
    path('customers/<int:pk>/', CustomerRetrieveUpdateDestroyView.as_view(), name='customer-detail-slash'),

    path('customers/<int:customer_pk>/tenure-reminder/call-done', CustomerTenureCallDoneAPIView.as_view(), name='customer-tenure-call-done'),
    path('customers/<int:customer_pk>/tenure-reminder/call-done/', CustomerTenureCallDoneAPIView.as_view(), name='customer-tenure-call-done-slash'),
    
    path('customers/<int:customer_pk>/payments', PaymentCreateAPIView.as_view(), name='customer-payment-create'),
    path('customers/<int:customer_pk>/payments/', PaymentCreateAPIView.as_view(), name='customer-payment-create-slash'),
    
    path('customers/<int:customer_pk>/transactions', CustomerTransactionListCreateView.as_view(), name='customer-transaction-list-create'),
    path('customers/<int:customer_pk>/transactions/', CustomerTransactionListCreateView.as_view(), name='customer-transaction-list-create-slash'),
    
    path('transactions/<int:pk>', CustomerTransactionDestroyView.as_view(), name='customer-transaction-delete'),
    path('transactions/<int:pk>/', CustomerTransactionDestroyView.as_view(), name='customer-transaction-delete-slash'),
    
    path('profile', UserProfileView.as_view(), name='user-profile'),
    path('profile/', UserProfileView.as_view(), name='user-profile-slash'),
    
    path('change-password', ChangePasswordView.as_view(), name='change-password'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password-slash'),
    
    path('verify-password', VerifyPasswordView.as_view(), name='verify-password'),
    path('verify-password/', VerifyPasswordView.as_view(), name='verify-password-slash'),
    
    path('users', ListUsersView.as_view(), name='user-list'),
    path('users/', ListUsersView.as_view(), name='user-list-slash'),
    path('users/create', CreateUserView.as_view(), name='user-create'),
    path('users/create/', CreateUserView.as_view(), name='user-create-slash'),
    path('users/<int:pk>/delete', DeleteUserView.as_view(), name='user-delete'),
    path('users/<int:pk>/delete/', DeleteUserView.as_view(), name='user-delete-slash'),
]
