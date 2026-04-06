from django.conf import settings
from django.db import models


class Equation(models.Model):
    CATEGORY_CHOICES = [
        ("geometry", "Geometry"),
        ("algebra", "Algebra"),
        ("calculus", "Calculus"),
        ("physics", "Physics"),
        ("complex_numbers", "Complex Numbers"),
        ("topology", "Topology"),
        ("statistics", "Statistics"),
        ("signal_processing", "Signal Processing"),
        ("fluid_dynamics", "Fluid Dynamics"),
        ("electromagnetism", "Electromagnetism"),
        ("thermodynamics", "Thermodynamics"),
        ("quantum_mechanics", "Quantum Mechanics"),
        ("information", "Information"),
        ("dynamical_systems", "Dynamical Systems"),
        ("finance", "Finance"),
    ]

    title = models.CharField(max_length=200)
    formula = models.TextField(help_text="LaTeX formula string")
    author = models.CharField(max_length=200)
    year = models.CharField(max_length=20)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True, default="")
    stage = models.CharField(max_length=20, default="live-demo")
    sort_order = models.PositiveIntegerField(unique=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.sort_order}. {self.title}"


class Course(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    progress_percent = models.PositiveIntegerField(default=0)
    tone = models.CharField(max_length=30, default="friendly")

    def __str__(self):
        return self.title


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=300)
    objective = models.TextField(blank=True, default="")
    steps = models.JSONField(default=list)
    duration_minutes = models.PositiveIntegerField(default=10)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.title


class UserProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="equation_progress",
    )
    anon_id = models.CharField(max_length=100, blank=True, default="", help_text="Legacy anonymous identifier")
    equation = models.ForeignKey(Equation, on_delete=models.CASCADE, related_name="progress")
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_viewed = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    time_spent_seconds = models.IntegerField(default=0)
    lesson_step = models.CharField(max_length=50, blank=True)
    variables_explored = models.JSONField(default=list)
    bookmarked = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "equation"],
                name="unique_user_equation",
                condition=models.Q(user__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["anon_id", "equation"],
                name="unique_anon_equation",
                condition=models.Q(user__isnull=True),
            ),
        ]

    def __str__(self):
        return f"{self.user or self.anon_id} - {self.equation.title}"


class LearningEvent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="learning_events",
    )
    equation = models.ForeignKey(Equation, on_delete=models.CASCADE, null=True, blank=True)
    event_type = models.CharField(max_length=50)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        eq_title = self.equation.title if self.equation else "N/A"
        return f"{self.user} - {self.event_type} - {eq_title}"
