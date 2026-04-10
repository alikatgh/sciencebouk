from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from io import StringIO
from rest_framework.test import APIClient

from .models import Course, Equation, Lesson, LearningEvent, UserProgress


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_equation(**kwargs):
    """Create a minimal valid Equation, merging caller overrides."""
    defaults = {
        "sort_order": 1,
        "title": "Test Equation",
        "formula": "a^2 + b^2 = c^2",
        "author": "Test Author",
        "year": "2000",
        "category": "geometry",
        "description": "A test equation.",
        "stage": "live-demo",
    }
    defaults.update(kwargs)
    return Equation.objects.create(**defaults)


def make_course(**kwargs):
    """Create a minimal valid Course."""
    defaults = {
        "slug": "test-course",
        "title": "Test Course",
        "description": "A test course.",
        "progress_percent": 0,
        "tone": "friendly",
    }
    defaults.update(kwargs)
    return Course.objects.create(**defaults)


def make_lesson(course, **kwargs):
    """Create a minimal valid Lesson for the given course."""
    defaults = {
        "title": "Test Lesson",
        "objective": "Learn something.",
        "steps": ["Step one", "Step two"],
        "duration_minutes": 10,
        "sort_order": 1,
    }
    defaults.update(kwargs)
    return Lesson.objects.create(course=course, **defaults)


# ---------------------------------------------------------------------------
# Model Tests
# ---------------------------------------------------------------------------

class EquationModelTests(TestCase):
    def test_create_equation_with_required_fields(self):
        eq = make_equation()
        self.assertEqual(eq.title, "Test Equation")
        self.assertEqual(eq.category, "geometry")
        self.assertEqual(eq.stage, "live-demo")

    def test_equation_str(self):
        eq = make_equation(sort_order=3, title="Calculus")
        self.assertEqual(str(eq), "3. Calculus")

    def test_equation_description_defaults_to_empty_string(self):
        eq = Equation.objects.create(
            sort_order=99,
            title="No Desc",
            formula="x=1",
            author="Nobody",
            year="1900",
            category="algebra",
        )
        self.assertEqual(eq.description, "")

    def test_equation_ordering_by_sort_order(self):
        make_equation(sort_order=10, title="Last")
        make_equation(sort_order=2, title="Second")
        make_equation(sort_order=1, title="First")
        titles = list(Equation.objects.values_list("title", flat=True))
        self.assertEqual(titles, ["First", "Second", "Last"])

    def test_sort_order_is_unique(self):
        make_equation(sort_order=1)
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            make_equation(sort_order=1, title="Duplicate")

    def test_category_choices_are_enforced_at_serializer_level(self):
        # Django does not enforce choices at the DB level; valid value saves fine.
        eq = make_equation(category="physics")
        self.assertEqual(eq.category, "physics")


class CourseModelTests(TestCase):
    def test_create_course(self):
        course = make_course()
        self.assertEqual(course.slug, "test-course")
        self.assertEqual(course.progress_percent, 0)

    def test_course_str(self):
        course = make_course(title="My Course")
        self.assertEqual(str(course), "My Course")

    def test_course_slug_is_unique(self):
        make_course(slug="unique-slug")
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            make_course(slug="unique-slug")

    def test_course_description_defaults_to_empty_string(self):
        course = Course.objects.create(slug="bare-course", title="Bare")
        self.assertEqual(course.description, "")


class LessonModelTests(TestCase):
    def setUp(self):
        self.course = make_course()

    def test_create_lesson(self):
        lesson = make_lesson(self.course)
        self.assertEqual(lesson.course, self.course)
        self.assertEqual(lesson.duration_minutes, 10)

    def test_lesson_str(self):
        lesson = make_lesson(self.course, title="Intro Lesson")
        self.assertEqual(str(lesson), "Intro Lesson")

    def test_lesson_steps_is_json_list(self):
        lesson = make_lesson(self.course, steps=["a", "b", "c"])
        self.assertIsInstance(lesson.steps, list)
        self.assertEqual(len(lesson.steps), 3)

    def test_lesson_ordering_by_sort_order(self):
        make_lesson(self.course, title="Second", sort_order=2)
        make_lesson(self.course, title="First", sort_order=1)
        titles = list(self.course.lessons.values_list("title", flat=True))
        self.assertEqual(titles, ["First", "Second"])

    def test_lesson_cascade_deletes_with_course(self):
        make_lesson(self.course)
        self.assertEqual(Lesson.objects.count(), 1)
        self.course.delete()
        self.assertEqual(Lesson.objects.count(), 0)


class UserProgressModelTests(TestCase):
    def setUp(self):
        self.equation = make_equation()

    def test_create_progress(self):
        progress = UserProgress.objects.create(
            anon_id="user-abc",
            equation=self.equation,
            completed=False,
        )
        self.assertEqual(progress.anon_id, "user-abc")
        self.assertFalse(progress.completed)

    def test_progress_str(self):
        progress = UserProgress.objects.create(
            anon_id="user-xyz",
            equation=self.equation,
        )
        self.assertIn("user-xyz", str(progress))
        self.assertIn(self.equation.title, str(progress))

    def test_progress_notes_defaults_to_empty_string(self):
        progress = UserProgress.objects.create(
            anon_id="user-1",
            equation=self.equation,
        )
        self.assertEqual(progress.notes, "")

    def test_unique_together_anon_id_and_equation_without_user(self):
        # Anonymous progress is unique per anon_id + equation so repeated updates
        # can safely use get_or_create without creating duplicate rows.
        from django.db import IntegrityError

        UserProgress.objects.create(anon_id="user-1", equation=self.equation)
        with self.assertRaises(IntegrityError):
            UserProgress.objects.create(anon_id="user-1", equation=self.equation)

    def test_progress_cascade_deletes_with_equation(self):
        UserProgress.objects.create(anon_id="user-1", equation=self.equation)
        self.assertEqual(UserProgress.objects.count(), 1)
        self.equation.delete()
        self.assertEqual(UserProgress.objects.count(), 0)


# ---------------------------------------------------------------------------
# API Endpoint Tests — shared setUp
# ---------------------------------------------------------------------------

class BaseAPITest(TestCase):
    """Creates a realistic dataset used by all API test classes."""

    def setUp(self):
        self.client = APIClient()

        # Three equations across two categories
        self.eq_geometry = make_equation(
            sort_order=1,
            title="Pythagoras's Theorem",
            formula="a^2 + b^2 = c^2",
            author="Pythagoras",
            year="530 BC",
            category="geometry",
        )
        self.eq_physics_1 = make_equation(
            sort_order=4,
            title="Law of Gravity",
            formula="F=G m_1 m_2 / r^2",
            author="Newton",
            year="1687",
            category="physics",
        )
        self.eq_physics_2 = make_equation(
            sort_order=13,
            title="Relativity",
            formula="E=mc^2",
            author="Einstein",
            year="1905",
            category="physics",
        )

        # Course with one lesson
        self.course = make_course(
            slug="equations-that-changed-the-world",
            title="The Equations That Changed the World",
        )
        self.lesson = make_lesson(
            self.course,
            title="Pythagoras's Theorem",
            objective="Understand the theorem.",
            steps=["Draw a right triangle.", "Label sides a, b, c."],
            duration_minutes=12,
            sort_order=1,
        )


# ---------------------------------------------------------------------------
# Health Endpoint
# ---------------------------------------------------------------------------

class HealthEndpointTests(BaseAPITest):
    def test_health_returns_200(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)

    def test_health_returns_ok_status(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.json(), {"status": "ok"})


# ---------------------------------------------------------------------------
# Equation List
# ---------------------------------------------------------------------------

class EquationListTests(BaseAPITest):
    def test_list_returns_200(self):
        response = self.client.get("/api/equations/")
        self.assertEqual(response.status_code, 200)

    def test_list_returns_paginated_envelope(self):
        response = self.client.get("/api/equations/")
        data = response.json()
        self.assertIn("count", data)
        self.assertIn("results", data)

    def test_list_count_matches_db(self):
        response = self.client.get("/api/equations/")
        self.assertEqual(response.json()["count"], 3)

    def test_list_result_contains_expected_fields(self):
        response = self.client.get("/api/equations/")
        first = response.json()["results"][0]
        for field in ["id", "title", "formula", "author", "year", "category", "description", "stage"]:
            self.assertIn(field, first)

    def test_list_ordered_by_sort_order(self):
        response = self.client.get("/api/equations/")
        ids = [eq["id"] for eq in response.json()["results"]]
        self.assertEqual(ids, sorted(ids))

    def test_list_id_field_maps_to_sort_order(self):
        response = self.client.get("/api/equations/")
        first = response.json()["results"][0]
        self.assertEqual(first["id"], self.eq_geometry.sort_order)


# ---------------------------------------------------------------------------
# Equation Detail
# ---------------------------------------------------------------------------

class EquationDetailTests(BaseAPITest):
    def test_detail_returns_200_for_existing_equation(self):
        response = self.client.get("/api/equations/1/")
        self.assertEqual(response.status_code, 200)

    def test_detail_returns_correct_equation(self):
        response = self.client.get("/api/equations/1/")
        data = response.json()
        self.assertEqual(data["title"], "Pythagoras's Theorem")
        self.assertEqual(data["id"], 1)

    def test_detail_returns_404_for_nonexistent_equation(self):
        response = self.client.get("/api/equations/999/")
        self.assertEqual(response.status_code, 404)

    def test_detail_returns_all_expected_fields(self):
        response = self.client.get("/api/equations/4/")
        data = response.json()
        self.assertEqual(data["author"], "Newton")
        self.assertEqual(data["category"], "physics")


# ---------------------------------------------------------------------------
# Category Filtering
# ---------------------------------------------------------------------------

class EquationCategoryFilterTests(BaseAPITest):
    def test_filter_by_physics_returns_only_physics_equations(self):
        response = self.client.get("/api/equations/?category=physics")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertTrue(len(results) > 0)
        for eq in results:
            self.assertEqual(eq["category"], "physics")

    def test_filter_by_physics_returns_correct_count(self):
        response = self.client.get("/api/equations/?category=physics")
        self.assertEqual(response.json()["count"], 2)

    def test_filter_by_geometry_returns_correct_count(self):
        response = self.client.get("/api/equations/?category=geometry")
        self.assertEqual(response.json()["count"], 1)

    def test_filter_by_unknown_category_returns_400(self):
        # django-filters validates choices fields; an unrecognised value yields 400.
        response = self.client.get("/api/equations/?category=nonexistent")
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class SearchEquationsTests(BaseAPITest):
    def test_search_without_q_returns_400(self):
        response = self.client.get("/api/search/")
        self.assertEqual(response.status_code, 400)

    def test_search_without_q_returns_error_message(self):
        response = self.client.get("/api/search/")
        self.assertIn("error", response.json())

    def test_search_by_author_newton_returns_gravity(self):
        response = self.client.get("/api/search/?q=newton")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("results", payload)
        results = payload["results"]
        titles = [eq["title"] for eq in results]
        self.assertIn("Law of Gravity", titles)

    def test_search_by_author_einstein_returns_relativity(self):
        response = self.client.get("/api/search/?q=einstein")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Relativity")

    def test_search_by_title_substring(self):
        response = self.client.get("/api/search/?q=pythagoras")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Pythagoras's Theorem")

    def test_search_by_category_term(self):
        response = self.client.get("/api/search/?q=physics")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        for eq in results:
            self.assertEqual(eq["category"], "physics")

    def test_search_with_no_matches_returns_empty_list(self):
        response = self.client.get("/api/search/?q=zzznomatch")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"], [])

    def test_search_is_case_insensitive(self):
        response_lower = self.client.get("/api/search/?q=newton")
        response_upper = self.client.get("/api/search/?q=NEWTON")
        self.assertEqual(
            len(response_lower.json()["results"]),
            len(response_upper.json()["results"]),
        )

    def test_search_with_whitespace_only_q_returns_400(self):
        response = self.client.get("/api/search/?q=   ")
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# Course Detail
# ---------------------------------------------------------------------------

class CourseDetailTests(BaseAPITest):
    def test_course_detail_returns_200(self):
        response = self.client.get("/api/courses/equations-that-changed-the-world/")
        self.assertEqual(response.status_code, 200)

    def test_course_detail_returns_correct_slug(self):
        response = self.client.get("/api/courses/equations-that-changed-the-world/")
        self.assertEqual(response.json()["slug"], "equations-that-changed-the-world")

    def test_course_detail_returns_lessons(self):
        response = self.client.get("/api/courses/equations-that-changed-the-world/")
        lessons = response.json()["lessons"]
        self.assertIsInstance(lessons, list)
        self.assertEqual(len(lessons), 1)

    def test_course_detail_lesson_has_expected_fields(self):
        response = self.client.get("/api/courses/equations-that-changed-the-world/")
        lesson = response.json()["lessons"][0]
        for field in ["id", "title", "objective", "steps", "duration_minutes", "sort_order"]:
            self.assertIn(field, lesson)

    def test_course_detail_lesson_steps_is_list(self):
        response = self.client.get("/api/courses/equations-that-changed-the-world/")
        lesson = response.json()["lessons"][0]
        self.assertIsInstance(lesson["steps"], list)

    def test_course_detail_nonexistent_slug_returns_404(self):
        response = self.client.get("/api/courses/nonexistent/")
        self.assertEqual(response.status_code, 404)

    def test_course_detail_nonexistent_slug_returns_error_message(self):
        response = self.client.get("/api/courses/nonexistent/")
        self.assertIn("error", response.json())

    def test_course_detail_contains_progress_percent(self):
        response = self.client.get("/api/courses/equations-that-changed-the-world/")
        self.assertIn("progress_percent", response.json())


# ---------------------------------------------------------------------------
# Progress Update (PATCH)
# ---------------------------------------------------------------------------

class ProgressUpdateTests(BaseAPITest):
    def test_patch_progress_returns_200(self):
        response = self.client.patch(
            "/api/equations/1/progress/",
            {"user_id": "user-test", "completed": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_patch_progress_creates_user_progress_record(self):
        self.client.patch(
            "/api/equations/1/progress/",
            {"user_id": "user-new", "completed": True},
            format="json",
        )
        self.assertTrue(
            UserProgress.objects.filter(anon_id="user-new", equation=self.eq_geometry).exists()
        )

    def test_patch_progress_sets_completed_true(self):
        self.client.patch(
            "/api/equations/1/progress/",
            {"user_id": "user-a", "completed": True},
            format="json",
        )
        progress = UserProgress.objects.get(anon_id="user-a", equation=self.eq_geometry)
        self.assertTrue(progress.completed)

    def test_patch_progress_sets_completed_false(self):
        UserProgress.objects.create(anon_id="user-b", equation=self.eq_geometry, completed=True)
        self.client.patch(
            "/api/equations/1/progress/",
            {"user_id": "user-b", "completed": False},
            format="json",
        )
        progress = UserProgress.objects.get(anon_id="user-b", equation=self.eq_geometry)
        self.assertFalse(progress.completed)

    def test_patch_progress_updates_notes(self):
        self.client.patch(
            "/api/equations/1/progress/",
            {"user_id": "user-c", "notes": "Great theorem!"},
            format="json",
        )
        progress = UserProgress.objects.get(anon_id="user-c", equation=self.eq_geometry)
        self.assertEqual(progress.notes, "Great theorem!")

    def test_patch_progress_response_contains_expected_fields(self):
        response = self.client.patch(
            "/api/equations/1/progress/",
            {"user_id": "user-d"},
            format="json",
        )
        data = response.json()
        for field in ["equation_id", "completed", "last_viewed", "notes"]:
            self.assertIn(field, data)

    def test_patch_progress_response_equation_id_matches(self):
        response = self.client.patch(
            "/api/equations/1/progress/",
            {"user_id": "user-e"},
            format="json",
        )
        self.assertEqual(response.json()["equation_id"], 1)

    def test_patch_progress_nonexistent_equation_returns_404(self):
        response = self.client.patch(
            "/api/equations/999/progress/",
            {"user_id": "user-f"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_progress_without_user_id_returns_400(self):
        response = self.client.patch(
            "/api/equations/1/progress/",
            {"completed": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_patch_progress_is_idempotent_for_same_user(self):
        """Calling PATCH twice for the same user/equation should upsert, not duplicate."""
        payload = {"user_id": "user-idem", "completed": True}
        self.client.patch("/api/equations/1/progress/", payload, format="json")
        self.client.patch("/api/equations/1/progress/", payload, format="json")
        self.assertEqual(
            UserProgress.objects.filter(anon_id="user-idem", equation=self.eq_geometry).count(),
            1,
        )


# ---------------------------------------------------------------------------
# Legacy Course Aliases
# ---------------------------------------------------------------------------

class LegacyCourseAliasTests(BaseAPITest):
    def test_equation_atlas_alias_returns_200(self):
        response = self.client.get("/api/courses/equation-atlas/")
        self.assertEqual(response.status_code, 200)

    def test_equation_atlas_alias_returns_course_key(self):
        response = self.client.get("/api/courses/equation-atlas/")
        self.assertIn("course", response.json())

    def test_equation_atlas_alias_returns_equation_atlas_key(self):
        response = self.client.get("/api/courses/equation-atlas/")
        self.assertIn("equationAtlas", response.json())

    def test_equation_atlas_alias_equation_atlas_is_list(self):
        response = self.client.get("/api/courses/equation-atlas/")
        self.assertIsInstance(response.json()["equationAtlas"], list)

    def test_foundational_algebra_alias_returns_200(self):
        response = self.client.get("/api/courses/foundational-algebra/")
        self.assertEqual(response.status_code, 200)

    def test_equation_atlas_without_seeded_course_returns_empty_payload(self):
        """When the DB is empty the legacy view should still return 200 with empty shells."""
        Course.objects.all().delete()
        Equation.objects.all().delete()
        response = self.client.get("/api/courses/equation-atlas/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["course"], {})
        self.assertEqual(data["equationAtlas"], [])


# ---------------------------------------------------------------------------
# Seed Management Command
# ---------------------------------------------------------------------------

class SeedEquationsCommandTests(TestCase):
    def test_seed_command_runs_without_errors(self):
        out = StringIO()
        call_command("seed_equations", stdout=out)
        output = out.getvalue()
        self.assertIn("Seeded", output)

    def test_seed_command_creates_17_equations(self):
        call_command("seed_equations", stdout=StringIO())
        self.assertEqual(Equation.objects.count(), 17)

    def test_seed_command_creates_course(self):
        call_command("seed_equations", stdout=StringIO())
        self.assertTrue(
            Course.objects.filter(slug="equations-that-changed-the-world").exists()
        )

    def test_seed_command_creates_at_least_one_lesson(self):
        call_command("seed_equations", stdout=StringIO())
        course = Course.objects.get(slug="equations-that-changed-the-world")
        self.assertGreater(course.lessons.count(), 0)

    def test_seed_command_is_idempotent(self):
        """Running the command twice should not duplicate records."""
        call_command("seed_equations", stdout=StringIO())
        call_command("seed_equations", stdout=StringIO())
        self.assertEqual(Equation.objects.count(), 17)
        self.assertEqual(Course.objects.filter(slug="equations-that-changed-the-world").count(), 1)

    def test_seed_command_equations_have_valid_categories(self):
        call_command("seed_equations", stdout=StringIO())
        valid_categories = {choice[0] for choice in Equation.CATEGORY_CHOICES}
        for eq in Equation.objects.all():
            self.assertIn(
                eq.category,
                valid_categories,
                msg=f"Equation '{eq.title}' has invalid category '{eq.category}'",
            )

    def test_seed_command_equations_have_unique_sort_orders(self):
        call_command("seed_equations", stdout=StringIO())
        sort_orders = list(Equation.objects.values_list("sort_order", flat=True))
        self.assertEqual(len(sort_orders), len(set(sort_orders)))


# ---------------------------------------------------------------------------
# Authenticated Progress Endpoints — helper base
# ---------------------------------------------------------------------------

def make_auth_user(email='user@example.com', password='testpass123', pro=False):
    """Create a user and optionally upgrade them to Pro."""
    user = User.objects.create_user(username=email, email=email, password=password)
    if pro:
        user.profile.tier = 'pro'
        user.profile.save()
    return user


class AuthProgressBase(TestCase):
    """Base that sets up two users (free + pro) and two equations."""

    PASSWORD = 'testpass123'

    def setUp(self):
        self.client = APIClient()
        self.free_user = make_auth_user(email='free@example.com', password=self.PASSWORD)
        self.pro_user = make_auth_user(email='pro@example.com', password=self.PASSWORD, pro=True)

        self.eq1 = make_equation(sort_order=1, title='Pythagoras', category='geometry')
        self.eq2 = make_equation(sort_order=2, title='Relativity', category='physics')

    def _get_token(self, user):
        response = self.client.post('/api/auth/login/', {
            'username': user.username,
            'password': self.PASSWORD,
        }, format='json')
        return response.json()['access']

    def _auth_as(self, user):
        token = self._get_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


# ---------------------------------------------------------------------------
# GET /api/progress/ — list user progress
# ---------------------------------------------------------------------------

class MyProgressListTests(AuthProgressBase):
    def test_list_progress_authenticated_returns_200(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/progress/')
        self.assertEqual(response.status_code, 200)

    def test_list_progress_unauthenticated_returns_401(self):
        response = self.client.get('/api/progress/')
        self.assertEqual(response.status_code, 401)

    def test_list_progress_free_user_returns_403(self):
        self._auth_as(self.free_user)
        response = self.client.get('/api/progress/')
        self.assertEqual(response.status_code, 403)

    def test_list_progress_returns_empty_list_for_new_pro_user(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/progress/')
        self.assertEqual(response.json()["results"], [])

    def test_list_progress_returns_only_current_users_records(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, completed=True)
        UserProgress.objects.create(user=self.free_user, equation=self.eq2, completed=False)
        self._auth_as(self.pro_user)
        response = self.client.get('/api/progress/')
        data = response.json()["results"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['equation_id'], self.eq1.sort_order)

    def test_list_progress_record_has_expected_fields(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1)
        self._auth_as(self.pro_user)
        response = self.client.get('/api/progress/')
        payload = response.json()
        self.assertIn("count", payload)
        self.assertIn("results", payload)
        record = payload["results"][0]
        for field in ['equation_id', 'completed', 'completed_at', 'lesson_step',
                      'time_spent_seconds', 'notes', 'bookmarked', 'last_viewed']:
            self.assertIn(field, record)

    def test_delete_progress_pro_user_clears_only_current_users_records(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, completed=True)
        UserProgress.objects.create(user=self.free_user, equation=self.eq2, completed=True)
        self._auth_as(self.pro_user)
        response = self.client.delete('/api/progress/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(UserProgress.objects.filter(user=self.pro_user).exists())
        self.assertTrue(UserProgress.objects.filter(user=self.free_user).exists())

    def test_delete_progress_free_user_returns_403(self):
        self._auth_as(self.free_user)
        response = self.client.delete('/api/progress/')
        self.assertEqual(response.status_code, 403)

    def test_delete_progress_unauthenticated_returns_401(self):
        response = self.client.delete('/api/progress/')
        self.assertEqual(response.status_code, 401)


# ---------------------------------------------------------------------------
# PATCH /api/progress/{equation_id}/ — update one equation's progress
# ---------------------------------------------------------------------------

class UpdateMyProgressTests(AuthProgressBase):
    def test_patch_progress_authenticated_returns_200(self):
        self._auth_as(self.pro_user)
        response = self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_patch_progress_unauthenticated_returns_401(self):
        response = self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        self.assertEqual(response.status_code, 401)

    def test_patch_progress_free_user_returns_403(self):
        self._auth_as(self.free_user)
        response = self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_patch_progress_creates_record_on_first_call(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        self.assertTrue(
            UserProgress.objects.filter(user=self.pro_user, equation=self.eq1).exists()
        )

    def test_patch_progress_uses_blank_anon_id_for_authenticated_records(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertEqual(progress.anon_id, '')

    def test_patch_progress_clears_legacy_authenticated_anon_id(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, anon_id=str(self.pro_user.id))
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertEqual(progress.anon_id, '')

    def test_patch_progress_marks_completed(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertTrue(progress.completed)

    def test_patch_progress_updates_time_spent(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'time_spent_seconds': 300}, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertEqual(progress.time_spent_seconds, 300)

    def test_patch_progress_updates_notes(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'notes': 'Very interesting!'}, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertEqual(progress.notes, 'Very interesting!')

    def test_patch_progress_updates_bookmarked(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'bookmarked': True}, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertTrue(progress.bookmarked)

    def test_patch_progress_sets_completed_at_when_completed(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertIsNotNone(progress.completed_at)

    def test_patch_progress_nonexistent_equation_returns_404(self):
        self._auth_as(self.pro_user)
        response = self.client.patch('/api/progress/999/', {'completed': True}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_patch_progress_is_idempotent(self):
        self._auth_as(self.pro_user)
        self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        self.client.patch('/api/progress/1/', {'completed': True}, format='json')
        self.assertEqual(
            UserProgress.objects.filter(user=self.pro_user, equation=self.eq1).count(), 1
        )

    def test_patch_progress_response_contains_expected_fields(self):
        self._auth_as(self.pro_user)
        response = self.client.patch('/api/progress/1/', {'completed': False}, format='json')
        data = response.json()
        for field in ['equation_id', 'completed', 'notes', 'bookmarked']:
            self.assertIn(field, data)


# ---------------------------------------------------------------------------
# POST /api/progress/sync/ — bulk sync
# ---------------------------------------------------------------------------

class BulkSyncProgressTests(AuthProgressBase):
    def test_bulk_sync_authenticated_returns_200(self):
        self._auth_as(self.pro_user)
        payload = {'items': [{'equation_id': 1, 'completed': True}]}
        response = self.client.post('/api/progress/sync/', payload, format='json')
        self.assertEqual(response.status_code, 200)

    def test_bulk_sync_unauthenticated_returns_401(self):
        response = self.client.post('/api/progress/sync/', {'items': []}, format='json')
        self.assertEqual(response.status_code, 401)

    def test_bulk_sync_free_user_returns_403(self):
        self._auth_as(self.free_user)
        payload = {'items': [{'equation_id': 1, 'completed': True}]}
        response = self.client.post('/api/progress/sync/', payload, format='json')
        self.assertEqual(response.status_code, 403)

    def test_bulk_sync_creates_multiple_records(self):
        self._auth_as(self.pro_user)
        payload = {
            'items': [
                {'equation_id': 1, 'completed': True, 'time_spent_seconds': 120},
                {'equation_id': 2, 'completed': False, 'notes': 'Need more practice'},
            ]
        }
        response = self.client.post('/api/progress/sync/', payload, format='json')
        self.assertEqual(len(response.json()), 2)
        self.assertEqual(UserProgress.objects.filter(user=self.pro_user).count(), 2)

    def test_bulk_sync_upserts_existing_records(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, completed=False)
        self._auth_as(self.pro_user)
        payload = {'items': [{'equation_id': 1, 'completed': True}]}
        self.client.post('/api/progress/sync/', payload, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertTrue(progress.completed)
        self.assertEqual(UserProgress.objects.filter(user=self.pro_user, equation=self.eq1).count(), 1)

    def test_bulk_sync_uses_blank_anon_id_for_authenticated_records(self):
        self._auth_as(self.pro_user)
        payload = {'items': [{'equation_id': 1, 'completed': True}]}
        self.client.post('/api/progress/sync/', payload, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertEqual(progress.anon_id, '')

    def test_bulk_sync_clears_legacy_authenticated_anon_id(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, anon_id=str(self.pro_user.id))
        self._auth_as(self.pro_user)
        payload = {'items': [{'equation_id': 1, 'completed': True}]}
        self.client.post('/api/progress/sync/', payload, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertEqual(progress.anon_id, '')

    def test_bulk_sync_skips_unknown_equation_ids(self):
        self._auth_as(self.pro_user)
        payload = {
            'items': [
                {'equation_id': 1, 'completed': True},
                {'equation_id': 9999, 'completed': True},
            ]
        }
        response = self.client.post('/api/progress/sync/', payload, format='json')
        # Only the valid equation should be in the response.
        self.assertEqual(len(response.json()), 1)

    def test_bulk_sync_empty_items_returns_empty_list(self):
        self._auth_as(self.pro_user)
        response = self.client.post('/api/progress/sync/', {'items': []}, format='json')
        self.assertEqual(response.json(), [])

    def test_bulk_sync_response_items_have_expected_fields(self):
        self._auth_as(self.pro_user)
        payload = {'items': [{'equation_id': 1, 'completed': True}]}
        response = self.client.post('/api/progress/sync/', payload, format='json')
        item = response.json()[0]
        for field in ['equation_id', 'completed', 'notes', 'bookmarked']:
            self.assertIn(field, item)

    def test_bulk_sync_updates_variables_explored(self):
        self._auth_as(self.pro_user)
        payload = {'items': [{'equation_id': 1, 'variables_explored': ['a', 'b']}]}
        self.client.post('/api/progress/sync/', payload, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertEqual(progress.variables_explored, ['a', 'b'])

    def test_bulk_sync_clears_completed_at_when_completed_false(self):
        UserProgress.objects.create(
            user=self.pro_user,
            equation=self.eq1,
            completed=True,
            completed_at=timezone.now(),
        )
        self._auth_as(self.pro_user)
        payload = {'items': [{'equation_id': 1, 'completed': False}]}
        self.client.post('/api/progress/sync/', payload, format='json')
        progress = UserProgress.objects.get(user=self.pro_user, equation=self.eq1)
        self.assertFalse(progress.completed)
        self.assertIsNone(progress.completed_at)


# ---------------------------------------------------------------------------
# POST /api/analytics/event/ — log event (Pro only)
# ---------------------------------------------------------------------------

class LogEventTests(AuthProgressBase):
    def test_log_event_pro_user_returns_201(self):
        self._auth_as(self.pro_user)
        payload = {'equation_id': 1, 'event_type': 'view', 'data': {}}
        response = self.client.post('/api/analytics/event/', payload, format='json')
        self.assertEqual(response.status_code, 201)

    def test_log_event_creates_db_record(self):
        self._auth_as(self.pro_user)
        payload = {'equation_id': 1, 'event_type': 'completed', 'data': {'duration': 45}}
        self.client.post('/api/analytics/event/', payload, format='json')
        self.assertEqual(LearningEvent.objects.filter(user=self.pro_user).count(), 1)

    def test_log_event_stores_event_type(self):
        self._auth_as(self.pro_user)
        self.client.post('/api/analytics/event/',
                         {'equation_id': 1, 'event_type': 'hint_used', 'data': {}},
                         format='json')
        event = LearningEvent.objects.get(user=self.pro_user)
        self.assertEqual(event.event_type, 'hint_used')

    def test_log_event_stores_data_blob(self):
        self._auth_as(self.pro_user)
        self.client.post('/api/analytics/event/',
                         {'equation_id': 1, 'event_type': 'view', 'data': {'score': 99}},
                         format='json')
        event = LearningEvent.objects.get(user=self.pro_user)
        self.assertEqual(event.data['score'], 99)

    def test_log_event_without_equation_id_is_allowed(self):
        self._auth_as(self.pro_user)
        payload = {'event_type': 'session_start', 'data': {}}
        response = self.client.post('/api/analytics/event/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        event = LearningEvent.objects.get(user=self.pro_user)
        self.assertIsNone(event.equation)

    def test_log_event_free_user_returns_403(self):
        self._auth_as(self.free_user)
        payload = {'equation_id': 1, 'event_type': 'view', 'data': {}}
        response = self.client.post('/api/analytics/event/', payload, format='json')
        self.assertEqual(response.status_code, 403)

    def test_log_event_unauthenticated_returns_401(self):
        response = self.client.post('/api/analytics/event/',
                                    {'equation_id': 1, 'event_type': 'view'},
                                    format='json')
        self.assertEqual(response.status_code, 401)

    def test_log_event_missing_event_type_returns_400(self):
        self._auth_as(self.pro_user)
        response = self.client.post('/api/analytics/event/', {'equation_id': 1}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_log_event_unknown_equation_id_returns_404(self):
        self._auth_as(self.pro_user)
        response = self.client.post('/api/analytics/event/',
                                    {'equation_id': 9999, 'event_type': 'view'},
                                    format='json')
        self.assertEqual(response.status_code, 404)

    def test_log_event_response_contains_ok(self):
        self._auth_as(self.pro_user)
        response = self.client.post('/api/analytics/event/',
                                    {'equation_id': 1, 'event_type': 'view'},
                                    format='json')
        self.assertEqual(response.json(), {'ok': True})


# ---------------------------------------------------------------------------
# GET /api/analytics/dashboard/ — dashboard (Pro only)
# ---------------------------------------------------------------------------

class DashboardTests(AuthProgressBase):
    def test_dashboard_pro_user_returns_200(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, 200)

    def test_dashboard_free_user_returns_403(self):
        self._auth_as(self.free_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, 403)

    def test_dashboard_unauthenticated_returns_401(self):
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, 401)

    def test_dashboard_response_has_required_keys(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        data = response.json()
        for key in ['completedCount', 'totalEquations', 'totalTimeMinutes',
                    'currentStreak', 'categories', 'nextRecommended']:
            self.assertIn(key, data)

    def test_dashboard_completed_count_starts_at_zero(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.json()['completedCount'], 0)

    def test_dashboard_total_equations_reflects_db_count(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.json()['totalEquations'], Equation.objects.count())

    def test_dashboard_completed_count_increments_after_completion(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, completed=True)
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.json()['completedCount'], 1)

    def test_dashboard_total_time_reflects_progress(self):
        UserProgress.objects.create(
            user=self.pro_user, equation=self.eq1, time_spent_seconds=120
        )
        UserProgress.objects.create(
            user=self.pro_user, equation=self.eq2, time_spent_seconds=60
        )
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.json()['totalTimeMinutes'], 3)

    def test_dashboard_categories_structure(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        categories = response.json()['categories']
        self.assertIsInstance(categories, dict)
        # Equations in setUp cover geometry and physics
        self.assertIn('geometry', categories)
        self.assertIn('physics', categories)

    def test_dashboard_category_totals_match_equations(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        cats = response.json()['categories']
        self.assertEqual(cats['geometry']['total'], 1)
        self.assertEqual(cats['physics']['total'], 1)

    def test_dashboard_category_completed_increments(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, completed=True)
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        cats = response.json()['categories']
        self.assertEqual(cats['geometry']['completed'], 1)
        self.assertEqual(cats['physics']['completed'], 0)

    def test_dashboard_next_recommended_points_to_uncompleted_equation(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        next_eq = response.json()['nextRecommended']
        self.assertIsNotNone(next_eq)
        self.assertIn('id', next_eq)
        self.assertIn('title', next_eq)

    def test_dashboard_next_recommended_is_none_when_all_completed(self):
        UserProgress.objects.create(user=self.pro_user, equation=self.eq1, completed=True)
        UserProgress.objects.create(user=self.pro_user, equation=self.eq2, completed=True)
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertIsNone(response.json()['nextRecommended'])

    def test_dashboard_streak_zero_with_no_events(self):
        self._auth_as(self.pro_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.json()['currentStreak'], 0)

    def test_dashboard_free_user_error_message(self):
        self._auth_as(self.free_user)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertIn('error', response.json())
