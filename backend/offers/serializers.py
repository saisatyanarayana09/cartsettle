from rest_framework import serializers
from .models import Banner, PromoCode

class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = '__all__'

class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = '__all__'

from .models import ReferralSettings, ReferralMilestone, Referral

class ReferralSettingsSerializer(serializers.ModelSerializer):
    referrer_reward_product_name = serializers.CharField(source='referrer_reward_product.name', read_only=True)

    class Meta:
        model = ReferralSettings
        fields = '__all__'

class ReferralMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralMilestone
        fields = '__all__'

class ReferralSerializer(serializers.ModelSerializer):
    referrer_name = serializers.CharField(source='referrer.first_name', read_only=True)
    referred_name = serializers.CharField(source='referred_user.first_name', read_only=True)

    class Meta:
        model = Referral
        fields = '__all__'
