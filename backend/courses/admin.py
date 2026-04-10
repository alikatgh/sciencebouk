from django.contrib import admin

from .models import Course, Equation, Lesson, LearningEvent, UserProgress


@admin.register(Equation)
class EquationAdmin(admin.ModelAdmin):
    list_display = ("sort_order", "title", "author", "year", "category", "stage", "slug")
    list_filter = ("category", "stage")
    search_fields = ("title", "author", "slug")
    ordering = ("sort_order",)
    list_editable = ("stage",)
    prepopulated_fields = {"slug": ("title",)}
    fieldsets = (
        (None, {"fields": ("sort_order", "slug", "title", "formula", "author", "year", "category", "stage", "description")}),
        ("Teaching Content", {"fields": ("hook", "hook_action", "variables_data", "presets_data", "lessons_data", "glossary_data"), "classes": ("collapse",)}),
    )


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "progress_percent", "tone")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "sort_order", "duration_minutes")
    list_filter = ("course",)
    ordering = ("course", "sort_order")


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "equation", "completed", "time_spent_seconds", "bookmarked", "last_viewed")
    list_filter = ("completed", "bookmarked")
    search_fields = ("user__email", "equation__title")
    readonly_fields = ("last_viewed",)
    list_select_related = ("user", "equation")


@admin.register(LearningEvent)
class LearningEventAdmin(admin.ModelAdmin):
    list_display = ("user", "equation", "event_type", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("user__email", "equation__title")
    readonly_fields = ("created_at",)
    list_select_related = ("user", "equation")
    date_hierarchy = "created_at"
