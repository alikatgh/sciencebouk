from __future__ import annotations

from typing import Iterable


DEFAULT_LOCALE = "en"


def normalize_locale(value: str | None) -> str:
    if not value:
        return DEFAULT_LOCALE

    normalized = str(value).strip().replace("_", "-").lower()
    return normalized or DEFAULT_LOCALE


def resolve_locale_candidates(value: str | None) -> list[str]:
    locale = normalize_locale(value)
    candidates: list[str] = []

    def add(candidate: str) -> None:
        if candidate and candidate not in candidates:
            candidates.append(candidate)

    add(locale)

    if "-" in locale:
        add(locale.split("-", 1)[0])

    add(DEFAULT_LOCALE)
    return candidates


def parse_accept_language(header_value: str | None) -> list[str]:
    if not header_value:
        return []

    locales: list[str] = []
    for chunk in header_value.split(","):
        token = chunk.split(";", 1)[0].strip()
        if not token or token == "*":
            continue

        normalized = normalize_locale(token)
        if normalized not in locales:
            locales.append(normalized)

    return locales


def get_requested_locale(request) -> str:
    query_locale = request.query_params.get("locale")
    if query_locale:
        return normalize_locale(query_locale)

    accepted_locales = parse_accept_language(request.META.get("HTTP_ACCEPT_LANGUAGE"))
    return accepted_locales[0] if accepted_locales else DEFAULT_LOCALE


def resolve_request_locale_candidates(request) -> list[str]:
    requested_locale = request.query_params.get("locale")
    if requested_locale:
        return resolve_locale_candidates(requested_locale)

    accepted_locales = parse_accept_language(request.META.get("HTTP_ACCEPT_LANGUAGE"))
    candidates: list[str] = []

    def add_many(values: Iterable[str]) -> None:
        for value in values:
            if value not in candidates:
                candidates.append(value)

    for locale in accepted_locales:
        add_many(resolve_locale_candidates(locale))

    if not candidates:
        return [DEFAULT_LOCALE]

    if DEFAULT_LOCALE not in candidates:
        candidates.append(DEFAULT_LOCALE)
    return candidates
