from rest_framework import serializers
from .models import Category, Product, ProductImage, Favorite

import re

EXTERNAL_URL_RE = re.compile(r'https?://(?:(?!res\.cloudinary\.com).)+$')

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_name = str(instance.image) if instance.image else ''
        if raw_name.startswith(('http://', 'https://')):
            data['image'] = raw_name
        elif data.get('image') and isinstance(data['image'], str):
            match = EXTERNAL_URL_RE.search(data['image'])
            if match:
                data['image'] = match.group(0)
        
        if data.get('image') and isinstance(data['image'], str):
            data['image'] = data['image'].replace('/media/media/', '/media/')

        return data

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'display_order']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_name = str(instance.image) if instance.image else ''
        if raw_name.startswith(('http://', 'https://')):
            data['image'] = raw_name
        elif data.get('image') and isinstance(data['image'], str):
            # Check if an external http/https was prefixed by Cloudinary or local storage
            match = EXTERNAL_URL_RE.search(data['image'])
            if match:
                data['image'] = match.group(0)
        
        if data.get('image') and isinstance(data['image'], str):
            data['image'] = data['image'].replace('/media/media/', '/media/')

        return data

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    gallery_images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_name = str(instance.image) if instance.image else ''
        if raw_name.startswith(('http://', 'https://')):
            data['image'] = raw_name
        elif data.get('image') and isinstance(data['image'], str):
            # Check if an external http/https was prefixed by Cloudinary or local storage
            match = EXTERNAL_URL_RE.search(data['image'])
            if match:
                data['image'] = match.group(0)
        
        if data.get('image') and isinstance(data['image'], str):
            data['image'] = data['image'].replace('/media/media/', '/media/')

        return data

class FavoriteSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'user', 'product', 'created_at', 'product_details']
        read_only_fields = ['user', 'created_at']
