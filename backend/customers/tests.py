from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Customer, CustomerTransaction, JewelDetail


class CustomerTransactionApiTests(APITestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        self.user = User.objects.create_user(username='testuser', password='testpassword')
        self.client.force_authenticate(user=self.user)
        
        self.customer = Customer.objects.create(
            amount=Decimal('1000.00'),
            date='2026-08-25',
            customer_name='Test Customer',
            guardian_name='Test Guardian',
            phone='9876543210',
            item_type='Ring',
            metal_type='Gold',
            purity='22K',
            weight=Decimal('10.00'),
        )

    def test_create_and_delete_transaction_removes_linked_jewel(self):
        create_response = self.client.post(
            reverse('customer-transaction-list-create', kwargs={'customer_pk': self.customer.pk}),
            {
                'amount': '2500.00',
                'date': '2026-08-25',
                'item_type': 'Chain',
                'metal_type': 'Gold',
                'purity': '22K',
                'weight': '15.50',
                'num_stones': '2',
                'remark': 'Test jewel',
            },
            format='multipart',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CustomerTransaction.objects.count(), 1)
        self.assertEqual(JewelDetail.objects.count(), 1)
        self.assertEqual(CustomerTransaction.objects.get().interest_amount, Decimal('62.50'))

        delete_response = self.client.delete(
            reverse('customer-transaction-delete', kwargs={'pk': create_response.data['id']}),
        )

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(CustomerTransaction.objects.count(), 0)
        self.assertEqual(JewelDetail.objects.count(), 0)
