from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .localization import get_requested_locale, resolve_request_locale_candidates
from .models import Course, Equation, LearningEvent, UserProgress

PRO_TIER = "pro"
EQUATION_ATLAS_SLUG = "equations-that-changed-the-world"
PROGRESS_MERGE_FIELDS = [
    "completed",
    "lesson_step",
    "time_spent_seconds",
    "variables_explored",
    "notes",
    "bookmarked",
]


def merge_progress_payload(target: dict, incoming: dict) -> dict:
    """Merge validated progress payloads for duplicate equation ids in bulk sync."""
    merged = dict(target)

    if incoming.get("completed"):
        merged["completed"] = True
    elif "completed" in incoming and not merged.get("completed"):
        merged["completed"] = False

    if incoming.get("lesson_step"):
        if not merged.get("lesson_step") or len(incoming["lesson_step"]) >= len(merged["lesson_step"]):
            merged["lesson_step"] = incoming["lesson_step"]

    if "time_spent_seconds" in incoming:
        merged["time_spent_seconds"] = max(
            merged.get("time_spent_seconds", 0),
            incoming["time_spent_seconds"],
        )

    if "variables_explored" in incoming:
        existing = list(merged.get("variables_explored") or [])
        for item in incoming["variables_explored"]:
            if item not in existing:
                existing.append(item)
        merged["variables_explored"] = existing

    if incoming.get("notes") and not merged.get("notes"):
        merged["notes"] = incoming["notes"]

    if incoming.get("bookmarked"):
        merged["bookmarked"] = True

    return merged


def apply_progress_merge(progress, vd):
    """Merge client progress into server state without downgrading monotonic fields."""
    if "completed" in vd:
        if vd["completed"]:
            progress.completed = True
        elif not progress.completed:
            progress.completed = False

    if "lesson_step" in vd and vd["lesson_step"]:
        if not progress.lesson_step or len(vd["lesson_step"]) >= len(progress.lesson_step):
            progress.lesson_step = vd["lesson_step"]

    if "time_spent_seconds" in vd:
        progress.time_spent_seconds = max(progress.time_spent_seconds, vd["time_spent_seconds"])

    if "variables_explored" in vd:
        merged = list(progress.variables_explored or [])
        for item in vd["variables_explored"]:
            if item not in merged:
                merged.append(item)
        progress.variables_explored = merged

    if "notes" in vd and vd["notes"]:
        if not progress.notes:
            progress.notes = vd["notes"]

    if "bookmarked" in vd:
        progress.bookmarked = progress.bookmarked or vd["bookmarked"]

    if progress.completed:
        if not progress.completed_at:
            progress.completed_at = timezone.now()
    elif vd.get("completed") is False:
        progress.completed_at = None
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

    queryset = Equation.objects.prefetch_related("translations").all()
    serializer_class = EquationSummarySerializer
    lookup_field = "sort_order"
    lookup_url_kwarg = "id"
    filterset_fields = ["category"]
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EquationSerializer
        return EquationSummarySerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["locale"] = get_requested_locale(self.request)
        return context

    @method_decorator(vary_on_headers("Accept-Language"))
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
        progress = UserProgress.objects.filter(anon_id=anon_id, equation=equation, user=None).first()
        if progress is None:
            progress, _ = UserProgress.objects.get_or_create(
                anon_id=anon_id,
                equation=equation,
                user=None,
            )
    vd = serializer.validated_data
    apply_progress_merge(progress, vd)
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

    locale_candidates = [
        candidate
        for candidate in resolve_request_locale_candidates(request)
        if candidate != "en"
    ]

    filters = (
        Q(title__icontains=q) | Q(author__icontains=q) | Q(category__icontains=q)
    )
    if locale_candidates:
        filters |= (
            Q(translations__title__icontains=q, translations__locale__in=locale_candidates)
            | Q(translations__description__icontains=q, translations__locale__in=locale_candidates)
            | Q(translations__hook__icontains=q, translations__locale__in=locale_candidates)
        )

    equations = Equation.objects.prefetch_related("translations").filter(filters).distinct()
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(equations, request)
    if page is not None:
        return paginator.get_paginated_response(
            EquationSummarySerializer(
                page,
                many=True,
                context={"locale": get_requested_locale(request)},
            ).data
        )
    return Response(
        EquationSummarySerializer(
            equations,
            many=True,
            context={"locale": get_requested_locale(request)},
        ).data
    )


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

    locale = get_requested_locale(request)
    equations = Equation.objects.prefetch_related("translations").all()
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
        "equationAtlas": EquationSerializer(
            equations,
            many=True,
            context={"locale": locale},
        ).data,
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
    apply_progress_merge(progress, vd)
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

    merged_items = {}
    for index, vd in valid_items:
        equation_id = vd["equation_id"]
        if equation_id in merged_items:
            merged_items[equation_id]["data"] = merge_progress_payload(
                merged_items[equation_id]["data"],
                vd,
            )
            continue
        merged_items[equation_id] = {"index": index, "data": dict(vd)}

    equation_ids = list(merged_items.keys())
    equations = {eq.sort_order: eq for eq in Equation.objects.filter(sort_order__in=equation_ids)}

    results = []
    with transaction.atomic():
        for equation_id, item in merged_items.items():
            equation = equations.get(equation_id)
            if equation is None:
                errors.append({
                    "index": item["index"],
                    "errors": {"equation_id": [f"Unknown equation id: {equation_id}"]},
                })
                continue

            progress, _ = UserProgress.objects.get_or_create(
                user=request.user, equation=equation,
                defaults={"anon_id": ""},
            )
            progress.anon_id = ""
            apply_progress_merge(progress, item["data"])
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
    total_time = progress.aggregate(total=Sum("time_spent_seconds"))["total"] or 0

    # Streak: count consecutive days with activity (distinct days, no event cap)
    dates = set(
        LearningEvent.objects.filter(user=user).dates("created_at", "day")
    )
    streak = 0
    day = timezone.now().date()
    while day in dates:
        streak += 1
        day -= timedelta(days=1)

    # The completed-equation set drives the count, the category stats AND the
    # recommendation — fetch it once rather than re-counting.
    completed_equation_ids = list(
        progress.filter(completed=True).values_list("equation_id", flat=True)
    )
    completed = len(completed_equation_ids)

    # Category completion — one aggregated query. Its per-category totals also
    # sum to the overall equation count, so no separate Equation.objects.count().
    category_rows = list(
        Equation.objects.values("category").annotate(
            total=Count("id"),
            completed=Count("id", filter=Q(id__in=completed_equation_ids)),
        )
    )
    categories = {
        row["category"]: {"total": row["total"], "completed": row["completed"]}
        for row in category_rows
    }
    total_equations = sum(row["total"] for row in category_rows)

    # Recommendation: first uncompleted equation
    next_eq = Equation.objects.exclude(id__in=completed_equation_ids).first()

    return Response({
        "completedCount": completed,
        "totalEquations": total_equations,
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
