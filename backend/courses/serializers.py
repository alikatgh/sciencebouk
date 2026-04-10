from rest_framework import serializers

from .models import Course, Equation, Lesson, UserProgress


class EquationSummarySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="sort_order", read_only=True)

    class Meta:
        model = Equation
        fields = [
            "id", "slug", "title", "formula", "author", "year", "category",
            "description", "stage",
        ]


class EquationSerializer(EquationSummarySerializer):
    class Meta(EquationSummarySerializer.Meta):
        fields = [
            *EquationSummarySerializer.Meta.fields,
            "hook", "hook_action",
            "variables_data", "presets_data", "lessons_data", "glossary_data",
        ]


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ["id", "title", "objective", "steps", "duration_minutes", "sort_order"]


class CourseDetailSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ["slug", "title", "description", "progress_percent", "tone", "lessons"]


class UserProgressSerializer(serializers.ModelSerializer):
    equation_id = serializers.IntegerField(source="equation.sort_order", read_only=True)

    class Meta:
        model = UserProgress
        fields = [
            "equation_id", "completed", "completed_at", "lesson_step",
            "time_spent_seconds", "variables_explored", "notes",
            "bookmarked", "last_viewed", "created_at",
        ]


class ProgressUpdateSerializer(serializers.Serializer):
    """Validates a PATCH payload for UserProgress (anonymous endpoint — user_id required)."""
    user_id = serializers.CharField(required=True, max_length=100)
    completed = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    lesson_step = serializers.CharField(required=False, allow_blank=True, max_length=50)
    time_spent_seconds = serializers.IntegerField(required=False, min_value=0)
    variables_explored = serializers.ListField(child=serializers.JSONField(), required=False)
    bookmarked = serializers.BooleanField(required=False)


class AuthProgressUpdateSerializer(serializers.Serializer):
    """Validates a PATCH payload for UserProgress on authenticated endpoints (no user_id)."""
    completed = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    lesson_step = serializers.CharField(required=False, allow_blank=True, max_length=50)
    time_spent_seconds = serializers.IntegerField(required=False, min_value=0)
    variables_explored = serializers.ListField(child=serializers.JSONField(), required=False)
    bookmarked = serializers.BooleanField(required=False)


class BulkProgressItemSerializer(serializers.Serializer):
    """Validates a single item within a bulk_sync_progress request."""
    equation_id = serializers.IntegerField()
    completed = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    lesson_step = serializers.CharField(required=False, allow_blank=True, max_length=50)
    time_spent_seconds = serializers.IntegerField(required=False, min_value=0)
    variables_explored = serializers.ListField(child=serializers.JSONField(), required=False)
    bookmarked = serializers.BooleanField(required=False)


class LogEventSerializer(serializers.Serializer):
    """Validates a POST payload for log_event."""
    event_type = serializers.CharField(max_length=50)
    equation_id = serializers.IntegerField(required=False, allow_null=True)
    data = serializers.DictField(required=False, default=dict)
