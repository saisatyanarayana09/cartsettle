from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_category_display_order_product_display_order'),
    ]

    operations = [
        migrations.AlterField(
            model_name='category',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='is_in_stock',
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]
