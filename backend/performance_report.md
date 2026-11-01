# Backend Performance Optimization Report

I have thoroughly analyzed the Django backend and implemented speed optimizations targeting N+1 query issues, missing indexes on frequently filtered fields, and query caching. 

Here is a summary of the improvements made:

## 1. Query Caching
* **`s:\smart-kirana\backend\store\dashboard_views.py`**: Added a 60-second Redis/Memcached cache layer to the `APIDashboardDataView`. This view performs 4 separate massive aggregations (`Order.objects.aggregate`, `Product.objects.aggregate`, `User.objects.aggregate`, `Notification.objects.aggregate`). By caching this endpoint, the dashboard load time will decrease significantly and eliminate heavy read spikes on the database when multiple admins view the dashboard simultaneously.

## 2. N+1 Query Fixes (Eager Loading)
* **`s:\smart-kirana\backend\store\views.py`**: Added `select_related('customer')` to `FeedbackViewSet`. Previously, evaluating `customer.get_full_name()` in the `FeedbackSerializer` caused an N+1 query for every feedback item in the list view.
* **`s:\smart-kirana\backend\offers\views.py`**: Added `select_related('referrer_reward_product')` to `ReferralSettingsView` to optimize fetching the referral settings model and its linked reward product.
* Verified that critical high-traffic endpoints (`OrderViewSet`, `Cart.objects.prefetch_related`, `HomepageSectionViewSet`, `CustomerListView`) are already efficiently using `select_related` and `prefetch_related`.

## 3. Database Indexing
Added indexes to fields that are frequently used in filtering and sorting (especially on dashboard data queries):
* **`s:\smart-kirana\backend\accounts\models.py`**: 
  * Added `db_index=True` to `User.is_customer` to optimize filtering user lists for customers.
  * Added composite index `user_date_joined_idx` on `['-date_joined']` for sorting users by latest signup.
  * Added index `user_is_active_idx` on `is_active` to optimize active customer filtering.
* **`s:\smart-kirana\backend\offers\models.py`**: Added a composite index `promo_usage_pu_idx` on `['promo_code', 'user']` to `PromoUsage`. This optimizes cart checkout operations where `PromoUsage.objects.filter(promo_code=promo, user=request.user).count()` is evaluated to enforce max uses per user.

*Note: Migrations have been generated (`python manage.py makemigrations`) for the newly added database indexes.*
