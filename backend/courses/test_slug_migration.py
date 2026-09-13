from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class EquationSlugMigrationTests(TransactionTestCase):
    """Exercise the populated migration, including PostgreSQL's deferred indexes."""

    def test_slug_backfill_preserves_rows_and_enforces_uniqueness(self):
        before = [('courses', '0006_alter_userprogress_created_at')]
        after = [('courses', '0007_equation_rich_fields_and_indexes')]
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        try:
            executor.migrate(before)
            old_apps = executor.loader.project_state(before).apps
            OldEquation = old_apps.get_model('courses', 'Equation')
            OldEquation.objects.create(title='Same title', sort_order=1)
            OldEquation.objects.create(title='Same title', sort_order=2)
            executor = MigrationExecutor(connection)
            executor.migrate(after)
            Equation = executor.loader.project_state(after).apps.get_model('courses', 'Equation')
            self.assertEqual(list(Equation.objects.order_by('sort_order').values_list('slug', flat=True)),
                             ['same-title', 'same-title-2'])
            with self.assertRaises(IntegrityError), transaction.atomic():
                Equation.objects.create(title='Duplicate', sort_order=3, slug='same-title')
        finally:
            MigrationExecutor(connection).migrate(latest)
