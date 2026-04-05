from rest_framework import serializers

from .models import Course, Equation, Lesson, UserProgress


class EquationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="sort_order", read_only=True)

    class Meta:
        model = Equation
        fields = ["id", "title", "formula", "author", "year", "category", "description", "stage"]


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
            "bookmarked", "last_viewed",
        ]


class ProgressUpdateSerializer(serializers.Serializer):
    completed = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    user_id = serializers.CharField(required=True)
