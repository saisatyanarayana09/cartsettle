from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, CustomerProfile

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_customer', 'is_owner', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Role Flags', {'fields': ('is_customer', 'is_owner')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role Flags', {'fields': ('is_customer', 'is_owner')}),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(CustomerProfile)
