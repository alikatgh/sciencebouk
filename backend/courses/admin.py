from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect, render
from django.urls import path, reverse

from .importers import EquationImportError, import_equations_from_json
from .models import Course, Equation, Lesson, LearningEvent, UserProgress


class EquationJSONImportForm(forms.Form):
    json_file = forms.FileField(
        required=False,
        label="JSON file",
        help_text="Drop or choose the equations JSON file exported from the app content source.",
    )
    json_text = forms.CharField(
        required=False,
        label="Or paste JSON",
        widget=forms.Textarea(attrs={"rows": 14, "spellcheck": "false"}),
        help_text="Accepted shape: a JSON array, or an object with an 'equations' or 'equationAtlas' array.",
    )

    def clean(self):
        cleaned_data = super().clean()
        uploaded_file = cleaned_data.get("json_file")
        json_text = cleaned_data.get("json_text", "").strip()

        if uploaded_file:
            try:
                json_text = uploaded_file.read().decode("utf-8")
            except UnicodeDecodeError as exc:
                raise forms.ValidationError("The uploaded file must be UTF-8 JSON.") from exc

        if not json_text:
            raise forms.ValidationError("Upload a JSON file or paste JSON text.")

        cleaned_data["json_payload"] = json_text
        return cleaned_data


@admin.register(Equation)
class EquationAdmin(admin.ModelAdmin):
    change_list_template = "admin/courses/equation/change_list.html"
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

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "import-json/",
                self.admin_site.admin_view(self.import_json_view),
                name="courses_equation_import_json",
            ),
        ]
        return custom_urls + urls

    def import_json_view(self, request):
        opts = self.model._meta
        form = EquationJSONImportForm(request.POST or None, request.FILES or None)

        if request.method == "POST" and form.is_valid():
            try:
                result = import_equations_from_json(form.cleaned_data["json_payload"])
            except EquationImportError as exc:
                messages.error(request, str(exc))
            else:
                if result.total_changed:
                    messages.success(
                        request,
                        (
                            f"Imported equations JSON: {result.created} created, "
                            f"{result.updated} updated, {result.skipped} skipped."
                        ),
                    )
                else:
                    messages.info(request, f"No equation changes found. {result.skipped} rows skipped.")

                for error in result.errors:
                    messages.warning(request, error)

                changelist_url = reverse("admin:courses_equation_changelist")
                return redirect(changelist_url)

        context = {
            **self.admin_site.each_context(request),
            "title": "Import equations JSON",
            "opts": opts,
            "form": form,
            "changelist_url": reverse("admin:courses_equation_changelist"),
        }
        return render(request, "admin/courses/equation/import_json.html", context)


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
