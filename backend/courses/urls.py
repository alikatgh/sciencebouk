from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EquationViewSet,
    bulk_sync_progress,
    course_detail,
    equation_atlas_legacy,
    health,
    learning_dashboard,
    log_event,
    my_progress,
    search_equations,
    update_my_progress,
    update_progress,
)

router = DefaultRouter()
router.register(r"equations", EquationViewSet, basename="equation")

urlpatterns = [
    path("health/", health, name="health"),
    path("", include(router.urls)),
    path("equations/<int:id>/progress/", update_progress, name="equation-progress"),
    path("search/", search_equations, name="search-equations"),
    # Pro: progress sync
    path("progress/sync/", bulk_sync_progress, name="bulk-sync-progress"),
    path("progress/<int:equation_id>/", update_my_progress, name="update-my-progress"),
    path("progress/", my_progress, name="my-progress"),
    # Pro: analytics
    path("analytics/dashboard/", learning_dashboard, name="learning-dashboard"),
    path("analytics/event/", log_event, name="log-event"),
    # Legacy aliases must come before the generic <slug> pattern so they take priority
    path("courses/equation-atlas/", equation_atlas_legacy, name="equation-atlas"),
    path("courses/foundational-algebra/", equation_atlas_legacy, name="foundational-algebra"),
    # Generic course detail — keep last so legacy slugs above are matched first
    path("courses/<slug:slug>/", course_detail, name="course-detail"),
]
