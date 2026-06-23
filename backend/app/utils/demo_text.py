import re

CYRILLIC_RE = re.compile(r"[А-Яа-яІіЇїЄєҐґ]")
REPORT_NUMBER_RE = re.compile(r"(DR-\d{4}-\d{4})")
FILE_QUOTE_RE = re.compile(r"[\"«](.+?)[\"»]")

POSITION_MAP = {
    "працівник": "Mitarbeiter",
    "бригадир": "Polier",
    "електрик": "Elektriker",
    "електромонтаж": "Elektroinstallation",
    "монтер": "Monteur",
    "сантехнік": "Sanitärinstallateur",
    "сантехнік-монтажник": "Sanitärinstallateur",
    "кошторис": "Kalkulation",
}

SPECIALIZATION_MAP = {
    "електромонтаж": "Elektroinstallation",
    "загальнобудівельні роботи": "Allgemeine Bauarbeiten",
}

ROLE_MAP = {
    "працівник": "Mitarbeiter",
    "бригадир": "Polier",
}

CREW_NAME_MAP = {
    "Бригада Elektro Ost": "Team Elektro Ost",
    "Бригада Montage Potsdam": "Team Montage Potsdam",
    "Berlin 2": "Team Berlin Mitte",
}

WORK_PLAN_MAP = {
    "Монтаж кабельних трас секція C": (
        "Kabeltrassen Montage Abschnitt C",
        "Haupttrasse im 2. Obergeschoss verlegen und Kabelgruppen kennzeichnen.",
        "m",
    ),
    "Щитові та тимчасове живлення": (
        "Schaltfelder und temporäre Stromversorgung",
        "Schaltfeld vorbereiten, Sicherungen prüfen und Fotodokumentation erstellen.",
        "Punkte",
    ),
    "Сантехнічні підключення": (
        "Sanitäranschlüsse",
        "PEX-Leitungen in den Sanitärräumen von Abschnitt C abschließen.",
        "m",
    ),
}

EXACT_TEXT_MAP = {
    "Підготувати щитову, перевірити автомати, зробити фотофіксацію.": "Schaltfeld vorbereiten, Sicherungen prüfen und Fotodokumentation erstellen.",
    "Підготувати щитову, перевірити автомати, зробити фотофіксацію": "Schaltfeld vorbereiten, Sicherungen prüfen und Fotodokumentation erstellen.",
    "Поточний статус звіту: надіслано бригадиру.": "Aktueller Berichtsstatus: an den Polier gesendet.",
    "Надіслано бригадиру": "An Polier gesendet",
    "Додано медіафайл": "Mediendatei hinzugefügt",
    "Звіт опубліковано": "Bericht veröffentlicht",
    "Додано працівником у формі звіту": "Vom Mitarbeiter im Bericht hochgeladen",
    "логування": "Zusätzliche Dokumentation ergänzt.",
    "тестетсетст": "Schaltfelder vorbereitet und die temporäre Stromversorgung im Abschnitt C geprüft.",
    "точок": "Punkte",
}

STATUS_LABELS = {
    "draft": "Entwurf",
    "submitted": "An Polier gesendet",
    "foreman_approved": "Vom Polier freigegeben",
    "admin_approved": "Final freigegeben",
    "rejected": "Abgelehnt",
    "change_requested": "Nacharbeit angefordert",
}

STATUS_BODY_LABELS = {
    "An Polier gesendet": "an den Polier gesendet",
    "Vom Polier freigegeben": "vom Polier freigegeben",
    "Final freigegeben": "final freigegeben",
    "Abgelehnt": "abgelehnt",
    "Nacharbeit angefordert": "zur Nacharbeit zurückgegeben",
}


def contains_cyrillic(value: str | None) -> bool:
    return bool(value and CYRILLIC_RE.search(value))


def normalize_whitespace(value: str | None) -> str | None:
    if value is None:
        return None
    return " ".join(value.split())


def normalize_name_part(value: str) -> str:
    cleaned = normalize_whitespace(value) or ""
    return cleaned.title() if cleaned.islower() else cleaned


def normalize_position(value: str | None, fallback: str = "Mitarbeiter") -> str:
    cleaned = normalize_whitespace(value) or fallback
    lowered = cleaned.casefold()
    if lowered in POSITION_MAP:
        return POSITION_MAP[lowered]
    return fallback if contains_cyrillic(cleaned) else cleaned


def normalize_specialization(value: str | None, fallback: str = "Elektroinstallation") -> str:
    cleaned = normalize_whitespace(value) or fallback
    lowered = cleaned.casefold()
    if lowered in SPECIALIZATION_MAP:
        return SPECIALIZATION_MAP[lowered]
    return fallback if contains_cyrillic(cleaned) else cleaned


def normalize_role_in_crew(value: str | None, employee_position: str | None = None) -> str:
    cleaned = normalize_whitespace(value) or "Mitarbeiter"
    lowered = cleaned.casefold()
    if lowered in ROLE_MAP:
        cleaned = ROLE_MAP[lowered]
    elif contains_cyrillic(cleaned):
        cleaned = "Mitarbeiter"
    if cleaned == "Mitarbeiter" and employee_position and employee_position not in {"Mitarbeiter", "Fachkraft"}:
        return employee_position
    return cleaned


def normalize_crew_name(value: str | None) -> str | None:
    cleaned = normalize_whitespace(value)
    if not cleaned:
        return cleaned
    return CREW_NAME_MAP.get(cleaned, cleaned)


def normalize_work_plan_fields(title: str, description: str | None, unit: str | None) -> tuple[str, str | None, str | None]:
    cleaned_title = normalize_whitespace(title) or "Arbeitspaket"
    cleaned_description = normalize_whitespace(description)
    cleaned_unit = normalize_whitespace(unit)
    if cleaned_title in WORK_PLAN_MAP:
        return WORK_PLAN_MAP[cleaned_title]
    cleaned_title = EXACT_TEXT_MAP.get(cleaned_title, cleaned_title)
    cleaned_description = EXACT_TEXT_MAP.get(cleaned_description, cleaned_description)
    cleaned_unit = EXACT_TEXT_MAP.get(cleaned_unit, cleaned_unit)
    if contains_cyrillic(cleaned_title):
        cleaned_title = "Arbeitspaket"
    if contains_cyrillic(cleaned_description):
        cleaned_description = "Leistungsbeschreibung wurde für die Demo vereinheitlicht."
    if contains_cyrillic(cleaned_unit):
        cleaned_unit = "Punkte"
    return cleaned_title, cleaned_description, cleaned_unit


def normalize_media_note(note: str | None, file_names: list[str] | None = None) -> str | None:
    if file_names:
        count = len(file_names)
        label = "Datei" if count == 1 else "Dateien"
        return f"{count} {label}: {', '.join(file_names)}"
    cleaned = normalize_whitespace(note)
    if not cleaned:
        return cleaned
    match = re.match(r"(\d+)\s*файл\(и\):\s*(.+)", cleaned, flags=re.IGNORECASE)
    if match:
        count = int(match.group(1))
        label = "Datei" if count == 1 else "Dateien"
        return f"{count} {label}: {match.group(2)}"
    return EXACT_TEXT_MAP.get(cleaned, cleaned)


def normalize_report_description(value: str | None, fallback: str | None = None) -> str | None:
    cleaned = normalize_whitespace(value)
    if not cleaned:
        return fallback
    if cleaned in EXACT_TEXT_MAP:
        return EXACT_TEXT_MAP[cleaned]
    if contains_cyrillic(cleaned):
        return fallback or "Leistungsfortschritt dokumentiert und zur Prüfung eingereicht."
    return cleaned


def normalize_report_comment(value: str | None) -> str | None:
    cleaned = normalize_whitespace(value)
    if not cleaned:
        return cleaned
    if cleaned in EXACT_TEXT_MAP:
        return EXACT_TEXT_MAP[cleaned]
    if contains_cyrillic(cleaned) and len(cleaned) <= 80:
        return "Zusätzliche Notiz ergänzt."
    return cleaned


def normalize_photo_caption(value: str | None, file_name: str | None = None) -> str:
    cleaned = normalize_whitespace(value)
    if cleaned in EXACT_TEXT_MAP:
        return EXACT_TEXT_MAP[cleaned]
    if contains_cyrillic(cleaned):
        return "Vom Mitarbeiter im Bericht hochgeladen"
    return cleaned or file_name or "Mediendatei"


def report_status_label(status_value: str | None) -> str:
    return STATUS_LABELS.get(status_value or "", status_value or "")


def normalize_report_event_title(title: str | None, event_type: str, status_value: str | None = None) -> str:
    cleaned = normalize_whitespace(title)
    if event_type == "report_created":
        return "Bericht veröffentlicht"
    if event_type == "media_uploaded":
        return "Mediendatei hinzugefügt"
    if event_type == "status_changed" and status_value:
        return report_status_label(status_value)
    if cleaned in EXACT_TEXT_MAP:
        return EXACT_TEXT_MAP[cleaned]
    return cleaned or "Ereignis aktualisiert"


def normalize_report_event_body(
    body: str | None,
    *,
    event_type: str,
    title: str | None = None,
    status_value: str | None = None,
) -> str | None:
    cleaned = normalize_whitespace(body)
    if cleaned in EXACT_TEXT_MAP:
        return EXACT_TEXT_MAP[cleaned]
    if event_type == "report_created":
        report_number = REPORT_NUMBER_RE.search(cleaned or "")
        if report_number:
            return f"Tagesbericht {report_number.group(1)} wurde erstellt."
        return "Tagesbericht wurde erstellt."
    if event_type == "media_uploaded":
        file_name = None
        if cleaned:
            match = FILE_QUOTE_RE.search(cleaned)
            file_name = match.group(1) if match else None
        return f'Datei "{file_name}" wurde an den Bericht angehängt.' if file_name else "Datei wurde an den Bericht angehängt."
    if event_type == "status_changed":
        status_label = report_status_label(status_value) if status_value else normalize_report_event_title(title, event_type)
        if status_label:
            return f"Aktueller Berichtsstatus: {STATUS_BODY_LABELS.get(status_label, status_label.lower())}."
    if contains_cyrillic(cleaned):
        return "Ereignistext wurde für die Demo vereinheitlicht."
    return cleaned
