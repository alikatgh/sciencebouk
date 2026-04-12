import json
from dataclasses import dataclass, field
from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from django.utils.text import slugify

from .localization import DEFAULT_LOCALE, normalize_locale
from .models import Equation, EquationTranslation


class EquationImportError(ValueError):
    """Raised when a JSON import payload cannot be applied safely."""


@dataclass
class EquationImportResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def total_changed(self) -> int:
        return self.created + self.updated


_CATEGORY_BY_INPUT = {
    key.lower(): key
    for key, _label in Equation.CATEGORY_CHOICES
}
_CATEGORY_BY_INPUT.update({
    label.lower(): key
    for key, label in Equation.CATEGORY_CHOICES
})


def _normalize_category(value: Any) -> str:
    if value is None:
        raise EquationImportError("category is required for new equations")

    normalized = str(value).strip().lower()
    category = _CATEGORY_BY_INPUT.get(normalized)
    if category:
        return category

    underscored = normalized.replace(" ", "_")
    category = _CATEGORY_BY_INPUT.get(underscored)
    if category:
        return category

    raise EquationImportError(f"unknown category: {value!r}")


def _load_entries(raw_json: str) -> list[dict[str, Any]]:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise EquationImportError(f"invalid JSON: {exc.msg}") from exc

    if isinstance(payload, list):
        entries = payload
    elif isinstance(payload, dict):
        if "equations" in payload:
            entries = payload["equations"]
        elif "equationAtlas" in payload:
            entries = payload["equationAtlas"]
        else:
            entries = None
    else:
        entries = None

    if not isinstance(entries, list):
        raise EquationImportError("JSON must be a list, or an object with an 'equations' or 'equationAtlas' list")

    invalid_indexes = [
        index + 1
        for index, entry in enumerate(entries)
        if not isinstance(entry, dict)
    ]
    if invalid_indexes:
        raise EquationImportError(f"every equation entry must be an object; invalid rows: {invalid_indexes}")

    return entries


def _list_value(entry: dict[str, Any], source_key: str) -> list[Any] | None:
    if source_key not in entry:
        return None

    value = entry[source_key]
    if not isinstance(value, list):
        raise EquationImportError(f"{source_key} must be a JSON list")
    return value


def _string_value(entry: dict[str, Any], source_key: str) -> str | None:
    if source_key not in entry:
        return None
    value = entry[source_key]
    if value is None:
        return ""
    return str(value)


def _nullable_string_value(entry: dict[str, Any], source_key: str) -> str | None:
    if source_key not in entry:
        return None
    value = entry[source_key]
    if value is None:
        return None
    return str(value)


def _unique_slug(value: str, queryset: QuerySet[Equation]) -> str:
    base_slug = slugify(value)
    if not base_slug:
        return ""

    slug = base_slug
    suffix = 2
    while queryset.filter(slug=slug).exists():
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


def _build_updates(entry: dict[str, Any], equation: Equation | None) -> dict[str, Any]:
    updates: dict[str, Any] = {}

    for source_key, model_key in [
        ("title", "title"),
        ("formula", "formula"),
        ("author", "author"),
        ("year", "year"),
        ("description", "description"),
        ("stage", "stage"),
        ("hook", "hook"),
    ]:
        value = _string_value(entry, source_key)
        if value is not None:
            updates[model_key] = value

    hook_action = _string_value(entry, "hookAction")
    if hook_action is None:
        hook_action = _string_value(entry, "hook_action")
    if hook_action is not None:
        updates["hook_action"] = hook_action

    if "category" in entry:
        updates["category"] = _normalize_category(entry["category"])

    for source_key, model_key in [
        ("variables", "variables_data"),
        ("variables_data", "variables_data"),
        ("presets", "presets_data"),
        ("presets_data", "presets_data"),
        ("lessons", "lessons_data"),
        ("lessons_data", "lessons_data"),
        ("glossary", "glossary_data"),
        ("glossary_data", "glossary_data"),
    ]:
        value = _list_value(entry, source_key)
        if value is not None:
            updates[model_key] = value

    explicit_slug = _string_value(entry, "slug")
    if explicit_slug is not None:
        updates["slug"] = _unique_slug(
            explicit_slug,
            Equation.objects.exclude(pk=equation.pk) if equation else Equation.objects.all(),
        )

    if equation is None:
        missing = [
            field_name
            for field_name in ["title", "formula", "author", "year", "category"]
            if not updates.get(field_name)
        ]
        if missing:
            raise EquationImportError(f"new equation is missing required fields: {', '.join(missing)}")

        updates.setdefault("description", "")
        updates.setdefault("stage", "live-demo")
        updates.setdefault("hook", "")
        updates.setdefault("hook_action", "")
        updates.setdefault("variables_data", [])
        updates.setdefault("presets_data", [])
        updates.setdefault("lessons_data", [])
        updates.setdefault("glossary_data", [])

    return updates


def _build_translation_updates(entry: dict[str, Any]) -> dict[str, Any]:
    updates: dict[str, Any] = {}

    for source_key, model_key in [
        ("title", "title"),
        ("description", "description"),
        ("hook", "hook"),
    ]:
        value = _nullable_string_value(entry, source_key)
        if value is not None:
            updates[model_key] = value

    hook_action = _nullable_string_value(entry, "hookAction")
    if hook_action is None:
        hook_action = _nullable_string_value(entry, "hook_action")
    if hook_action is not None:
        updates["hook_action"] = hook_action

    for source_key, model_key in [
        ("variables", "variables_data"),
        ("variables_data", "variables_data"),
        ("presets", "presets_data"),
        ("presets_data", "presets_data"),
        ("lessons", "lessons_data"),
        ("lessons_data", "lessons_data"),
        ("glossary", "glossary_data"),
        ("glossary_data", "glossary_data"),
    ]:
        value = _list_value(entry, source_key)
        if value is not None:
            updates[model_key] = value

    return updates


@transaction.atomic
def import_equations_from_json(raw_json: str, locale: str | None = None) -> EquationImportResult:
    normalized_locale = normalize_locale(locale)
    if normalized_locale != DEFAULT_LOCALE:
        return import_equation_translations_from_json(raw_json, normalized_locale)

    entries = _load_entries(raw_json)
    result = EquationImportResult()

    for index, entry in enumerate(entries, start=1):
        raw_sort_order = entry.get("sort_order", entry.get("id"))
        if raw_sort_order is None:
            result.errors.append(f"row {index}: id or sort_order is required")
            result.skipped += 1
            continue

        try:
            sort_order = int(raw_sort_order)
        except (TypeError, ValueError):
            result.errors.append(f"row {index}: id/sort_order must be an integer")
            result.skipped += 1
            continue

        equation = Equation.objects.filter(sort_order=sort_order).first()
        try:
            updates = _build_updates(entry, equation)
        except EquationImportError as exc:
            result.errors.append(f"row {index}: {exc}")
            result.skipped += 1
            continue

        if equation is None:
            Equation.objects.create(sort_order=sort_order, **updates)
            result.created += 1
            continue

        changed = False
        for field_name, value in updates.items():
            if getattr(equation, field_name) != value:
                setattr(equation, field_name, value)
                changed = True

        if changed:
            equation.save(update_fields=[*updates.keys()])
            result.updated += 1
        else:
            result.skipped += 1

    if result.errors and result.total_changed == 0:
        raise EquationImportError("; ".join(result.errors))

    return result


@transaction.atomic
def import_equation_translations_from_json(raw_json: str, locale: str) -> EquationImportResult:
    normalized_locale = normalize_locale(locale)
    if normalized_locale == DEFAULT_LOCALE:
        raise EquationImportError("use the base equation import for English content")

    entries = _load_entries(raw_json)
    result = EquationImportResult()

    for index, entry in enumerate(entries, start=1):
        raw_sort_order = entry.get("sort_order", entry.get("id"))
        if raw_sort_order is None:
            result.errors.append(f"row {index}: id or sort_order is required")
            result.skipped += 1
            continue

        try:
            sort_order = int(raw_sort_order)
        except (TypeError, ValueError):
            result.errors.append(f"row {index}: id/sort_order must be an integer")
            result.skipped += 1
            continue

        equation = Equation.objects.filter(sort_order=sort_order).first()
        if equation is None:
            result.errors.append(
                f"row {index}: base equation {sort_order} does not exist yet"
            )
            result.skipped += 1
            continue

        updates = _build_translation_updates(entry)
        if not updates:
            result.skipped += 1
            continue

        translation, created = EquationTranslation.objects.get_or_create(
            equation=equation,
            locale=normalized_locale,
        )

        changed = False
        for field_name, value in updates.items():
            if getattr(translation, field_name) != value:
                setattr(translation, field_name, value)
                changed = True

        if created:
            translation.save()
            result.created += 1
            continue

        if changed:
            translation.save(update_fields=[*updates.keys(), "locale"])
            result.updated += 1
        else:
            result.skipped += 1

    if result.errors and result.total_changed == 0:
        raise EquationImportError("; ".join(result.errors))

    return result


import_equations_json = import_equations_from_json
