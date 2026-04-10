from datetime import timedelta

from django.db import IntegrityError
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import Course, Equation, LearningEvent, UserProgress

PRO_TIER = "pro"
EQUATION_ATLAS_SLUG = "equations-that-changed-the-world"
from .serializers import (
    AuthProgressUpdateSerializer,
    BulkProgressItemSerializer,
    CourseDetailSerializer,
    EquationSerializer,
    EquationSummarySerializer,
    LogEventSerializer,
    ProgressUpdateSerializer,
    UserProgressSerializer,
)


class EquationViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve equations. Supports ?category= filtering."""

    queryset = Equation.objects.all()
    serializer_class = EquationSummarySerializer
    lookup_field = "sort_order"
    lookup_url_kwarg = "id"
    filterset_fields = ["category"]
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EquationSerializer
        return EquationSummarySerializer

    @method_decorator(cache_page(60 * 5))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class AnonymousProgressThrottle(AnonRateThrottle):
    scope = "anon_progress"


@api_view(["PATCH"])
@permission_classes([AllowAny])
@throttle_classes([AnonymousProgressThrottle])
def update_progress(request, id):
    """Mark progress on a single equation identified by sort_order."""
    try:
        equation = Equation.objects.get(sort_order=id)
    except Equation.DoesNotExist:
        return Response({"error": "Equation not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProgressUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    anon_id = serializer.validated_data["user_id"]
    try:
        progress, _ = UserProgress.objects.get_or_create(
            anon_id=anon_id,
            equation=equation,
            user=None,
        )
    except IntegrityError:
        # Two concurrent requests raced past get_or_create; retrieve the winner's row.
        progress = UserProgress.objects.get(anon_id=anon_id, equation=equation, user=None)
    vd = serializer.validated_data
    for field in ["completed", "lesson_step", "time_spent_seconds", "variables_explored", "notes", "bookmarked"]:
        if field in vd:
            setattr(progress, field, vd[field])
    progress.last_viewed = timezone.now()
    progress.save()

    return Response(UserProgressSerializer(progress).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def course_detail(request, slug):
    """Retrieve a course with its nested lessons."""
    try:
        course = Course.objects.prefetch_related("lessons").get(slug=slug)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(CourseDetailSerializer(course).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def search_equations(request):
    """Search equations by title, author, or category using ?q=<term>."""
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response(
            {"error": "Query parameter 'q' is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    equations = Equation.objects.filter(
        Q(title__icontains=q) | Q(author__icontains=q) | Q(category__icontains=q)
    )
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(equations, request)
    if page is not None:
        return paginator.get_paginated_response(EquationSummarySerializer(page, many=True).data)
    return Response(EquationSummarySerializer(equations, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Health check endpoint."""
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([AllowAny])
def equation_atlas_legacy(request):
    """Legacy alias that returns the full equation atlas in the original envelope shape.

    Kept for backward compatibility with the frontend while it migrates to /api/equations/.
    """
    try:
        course = Course.objects.prefetch_related("lessons").get(
            slug=EQUATION_ATLAS_SLUG
        )
    except Course.DoesNotExist:
        # Fall back to an empty payload if the DB hasn't been seeded yet.
        return Response(
            {
                "course": {},
                "equationAtlas": [],
            }
        )

    equations = Equation.objects.all()
    first_lesson = course.lessons.first()

    payload = {
        "course": {
            "slug": course.slug,
            "title": course.title,
            "progressPercent": course.progress_percent,
            "tone": course.tone,
        },
        "today": {
            "goal": first_lesson.objective if first_lesson else "",
            "durationMinutes": first_lesson.duration_minutes if first_lesson else 0,
        },
        "featuredLesson": {
            "title": first_lesson.title if first_lesson else "",
            "objective": first_lesson.objective if first_lesson else "",
            "steps": first_lesson.steps if first_lesson else [],
        },
        "equationAtlas": EquationSerializer(equations, many=True).data,
    }
    return Response(payload)


# ---------------------------------------------------------------------------
# Pro / Authenticated endpoints
# ---------------------------------------------------------------------------


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def my_progress(request):
    """Get or clear all progress for the authenticated user."""
    if not hasattr(request.user, "profile") or request.user.profile.tier != PRO_TIER:
        return Response({"error": "Pro required"}, status=status.HTTP_403_FORBIDDEN)

    progress = UserProgress.objects.filter(user=request.user).order_by("equation__sort_order")
    if request.method == "DELETE":
        progress.delete()
        return Response({"ok": True})

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(progress, request)
    if page is not None:
        return paginator.get_paginated_response(UserProgressSerializer(page, many=True).data)
    return Response(UserProgressSerializer(progress, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_my_progress(request, equation_id):
    """Update progress for a specific equation. Pro users only for sync."""
    if not hasattr(request.user, "profile") or request.user.profile.tier != PRO_TIER:
        return Response({"error": "Pro required"}, status=status.HTTP_403_FORBIDDEN)

    try:
        equation = Equation.objects.get(sort_order=equation_id)
    except Equation.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = AuthProgressUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    vd = serializer.validated_data

    progress, _ = UserProgress.objects.get_or_create(
        user=request.user, equation=equation,
        defaults={"anon_id": ""},
    )
    progress.anon_id = ""
    for field in ["completed", "lesson_step", "time_spent_seconds", "variables_explored", "notes", "bookmarked"]:
        if field in vd:
            setattr(progress, field, vd[field])
    if vd.get("completed") and not progress.completed_at:
        progress.completed_at = timezone.now()
    elif vd.get("completed") is False:
        progress.completed_at = None
    progress.last_viewed = timezone.now()
    progress.save()
    return Response(UserProgressSerializer(progress).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_sync_progress(request):
    """Bulk sync progress from localStorage when user signs up for Pro."""
    if not hasattr(request.user, "profile") or request.user.profile.tier != PRO_TIER:
        return Response({"error": "Pro required"}, status=status.HTTP_403_FORBIDDEN)

    raw_items = request.data.get("items", [])
    if not isinstance(raw_items, list):
        return Response({"error": "'items' must be a list"}, status=status.HTTP_400_BAD_REQUEST)

    # Validate all items first so we can pre-fetch equations in one query (M14).
    valid_items = []
    errors = []
    for index, raw_item in enumerate(raw_items):
        item_serializer = BulkProgressItemSerializer(data=raw_item)
        if not item_serializer.is_valid():
            errors.append({"index": index, "errors": item_serializer.errors})
        else:
            valid_items.append((index, item_serializer.validated_data))

    equation_ids = [vd["equation_id"] for _, vd in valid_items]
    equations = {eq.sort_order: eq for eq in Equation.objects.filter(sort_order__in=equation_ids)}

    results = []
    for index, vd in valid_items:
        equation = equations.get(vd["equation_id"])
        if equation is None:
            continue

        progress, _ = UserProgress.objects.get_or_create(
            user=request.user, equation=equation,
            defaults={"anon_id": ""},
        )
        progress.anon_id = ""
        for field in ["completed", "lesson_step", "time_spent_seconds", "variables_explored", "notes", "bookmarked"]:
            if field in vd:
                setattr(progress, field, vd[field])
        if vd.get("completed") and not progress.completed_at:
            progress.completed_at = timezone.now()
        elif vd.get("completed") is False:
            progress.completed_at = None
        progress.last_viewed = timezone.now()
        progress.save()
        results.append(UserProgressSerializer(progress).data)

    if errors:
        return Response({"results": results, "errors": errors}, status=status.HTTP_207_MULTI_STATUS)
    return Response(results)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def learning_dashboard(request):
    """Return aggregated learning analytics for the authenticated Pro user."""
    user = request.user
    if not hasattr(user, "profile") or user.profile.tier != PRO_TIER:
        return Response({"error": "Pro required"}, status=status.HTTP_403_FORBIDDEN)

    progress = UserProgress.objects.filter(user=user)
    completed = progress.filter(completed=True).count()
    total_time = progress.aggregate(total=Sum("time_spent_seconds"))["total"] or 0

    # Streak: count consecutive days with activity
    event_timestamps = (
        LearningEvent.objects.filter(user=user)
        .order_by("-created_at")
        .values_list("created_at", flat=True)[:100]
    )
    dates = set(ts.date() for ts in event_timestamps)
    streak = 0
    day = timezone.now().date()
    while day in dates:
        streak += 1
        day -= timedelta(days=1)

    # Category completion — two aggregated queries, no per-row iteration
    completed_equation_ids = list(
        progress.filter(completed=True).values_list("equation_id", flat=True)
    )
    category_stats = Equation.objects.values("category").annotate(
        total=Count("id"),
        completed=Count("id", filter=Q(id__in=completed_equation_ids)),
    )
    categories = {
        row["category"]: {"total": row["total"], "completed": row["completed"]}
        for row in category_stats
    }

    # Recommendation: first uncompleted equation
    next_eq = Equation.objects.exclude(id__in=completed_equation_ids).first()

    return Response({
        "completedCount": completed,
        "totalEquations": Equation.objects.count(),
        "totalTimeMinutes": round(total_time / 60),
        "currentStreak": streak,
        "categories": categories,
        "nextRecommended": {
            "id": next_eq.sort_order,
            "title": next_eq.title,
        } if next_eq else None,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def log_event(request):
    """Log a learning event for analytics. Pro users only."""
    if not hasattr(request.user, "profile") or request.user.profile.tier != PRO_TIER:
        return Response({"error": "Pro subscription required"}, status=status.HTTP_403_FORBIDDEN)

    serializer = LogEventSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    vd = serializer.validated_data

    equation = None
    eq_id = vd.get("equation_id")
    if eq_id is not None:
        try:
            equation = Equation.objects.get(sort_order=eq_id)
        except Equation.DoesNotExist:
            return Response({"error": "Equation not found"}, status=status.HTTP_404_NOT_FOUND)

    LearningEvent.objects.create(
        user=request.user,
        equation=equation,
        event_type=vd["event_type"],
        data=vd["data"],
    )
    return Response({"ok": True}, status=status.HTTP_201_CREATED)
