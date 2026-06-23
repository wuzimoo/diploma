from datetime import date, time

from sqlalchemy import or_, select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import (
    ConstructionObject,
    Crew,
    CrewMember,
    DailyReport,
    Employee,
    Expense,
    Material,
    MaterialRequest,
    MaterialRequestItem,
    ObjectAssignment,
    ReportComment,
    ReportEvent,
    ReportPhoto,
    Role,
    User,
    WorkPlanItem,
)
from app.utils.demo_text import (
    normalize_crew_name,
    normalize_media_note,
    normalize_name_part,
    normalize_photo_caption,
    normalize_position,
    normalize_report_comment,
    normalize_report_description,
    normalize_report_event_body,
    normalize_report_event_title,
    normalize_role_in_crew,
    normalize_specialization,
    normalize_work_plan_fields,
)


def _find_user_by_emails(db, *emails: str) -> User | None:
    existing = [email for email in emails if email]
    if not existing:
        return None
    return db.scalar(select(User).where(User.email.in_(existing)).limit(1))


def _find_crew_by_names(db, *names: str) -> Crew | None:
    existing = [name for name in names if name]
    if not existing:
        return None
    return db.scalar(select(Crew).where(Crew.name.in_(existing)).limit(1))


def sync_demo_access(db) -> tuple[User | None, User | None, User | None]:
    roles = {role.code: role for role in db.scalars(select(Role)).all()}
    role_labels = {
        "admin": ("Geschäftsleitung", "Voller Zugriff auf das System"),
        "foreman": ("Polier / Projektleitung", "Freigabe von Berichten und Steuerung der Projekte"),
        "worker": ("Mitarbeiter", "Mobile Erfassung von Tagesleistungen"),
    }
    for code, role in roles.items():
        if code in role_labels:
            role.name, role.description = role_labels[code]

    employee_positions = {
        "Schneider": "Geschäftsleitung",
        "Kovalenko": "Polier",
        "Meyer": "Elektriker",
        "Klein": "Monteur",
        "Schulz": "Sanitärinstallateur",
        "Weber": "Kalkulation",
    }
    for employee in db.scalars(select(Employee)).all():
        employee.first_name = normalize_name_part(employee.first_name)
        employee.last_name = normalize_name_part(employee.last_name)
        if employee.last_name in employee_positions:
            employee.position = employee_positions[employee.last_name]
        else:
            employee.position = normalize_position(employee.position)
        if employee.user:
            employee.user.full_name = f"{employee.first_name} {employee.last_name}".strip()

    account_specs = [
        ("admin", "admin@baupilot.demo", "admin@romans-erp.demo", "Roman Schneider", "Admin12345", "Schneider"),
        ("foreman", "foreman@baupilot.demo", "foreman@romans-erp.demo", "Oleh Kovalenko", "Foreman12345", "Kovalenko"),
        ("worker", "worker@baupilot.demo", "worker@romans-erp.demo", "Markus Meyer", "Worker12345", "Meyer"),
    ]
    synced_users: dict[str, User | None] = {}
    for role_code, email, legacy_email, full_name, password, employee_last_name in account_specs:
        user = _find_user_by_emails(db, email, legacy_email)
        if user is None:
            user = User(
                email=email,
                full_name=full_name,
                role=roles[role_code],
                hashed_password=get_password_hash(password),
                is_active=True,
            )
            db.add(user)
            db.flush()
        user.email = email
        user.full_name = full_name
        user.role = roles[role_code]
        user.hashed_password = get_password_hash(password)
        user.is_active = True
        employee = db.scalar(select(Employee).where(Employee.last_name == employee_last_name).limit(1))
        if employee:
            employee.user = user
            employee.user_id = user.id
        synced_users[role_code] = user

    db.flush()
    return synced_users.get("admin"), synced_users.get("foreman"), synced_users.get("worker")


def _normalize_existing_demo_records(
    db,
    *,
    berlin_mitte: ConstructionObject,
    berlin_ost: ConstructionObject,
    potsdam: ConstructionObject,
    foreman: Employee,
    worker: Employee,
    jonas: Employee,
    leon: Employee,
    elektro: Crew,
    montage: Crew,
    berlin_team: Crew,
) -> None:
    canonical_crews = {
        elektro.id: {
            "name": "Team Elektro Ost",
            "specialization": "Elektroinstallation",
            "foreman_id": foreman.id,
            "object_id": berlin_ost.id,
            "notes": "Aktives Team für Berlin Ost; zugeordnete Mitarbeiter sehen dieses Projekt automatisch.",
        },
        montage.id: {
            "name": "Team Montage Potsdam",
            "specialization": "Stahlbaumontage",
            "foreman_id": foreman.id,
            "object_id": potsdam.id,
            "notes": "Montageteam für Vorbereitungs- und Stahlbauarbeiten in Potsdam.",
        },
        berlin_team.id: {
            "name": "Team Berlin Mitte",
            "specialization": "Elektroinstallation",
            "foreman_id": foreman.id,
            "object_id": berlin_mitte.id,
            "notes": "Reserve-Team für Berlin Mitte mit sauberem Demo-Datenstand.",
        },
    }
    canonical_members = {
        worker.id: (elektro.id, "Elektriker"),
        leon.id: (elektro.id, "Sanitärinstallateur"),
        jonas.id: (montage.id, "Monteur"),
    }
    canonical_assignments = {
        worker.id: (berlin_ost.id, elektro.id, "Elektriker"),
        leon.id: (berlin_ost.id, elektro.id, "Sanitärinstallateur"),
        jonas.id: (potsdam.id, montage.id, "Monteur"),
    }

    for crew in db.scalars(select(Crew)).all():
        crew.name = normalize_crew_name(crew.name) or crew.name
        crew.specialization = normalize_specialization(crew.specialization, fallback="Allgemeine Bauarbeiten")
        if crew.id in canonical_crews:
            spec = canonical_crews[crew.id]
            crew.name = spec["name"]
            crew.specialization = spec["specialization"]
            crew.foreman_employee_id = spec["foreman_id"]
            crew.current_object_id = spec["object_id"]
            crew.status = "active"
            crew.notes = spec["notes"]
        elif crew.status == "active":
            crew.status = "archived"

    for member in db.scalars(select(CrewMember)).all():
        member.role_in_crew = normalize_role_in_crew(member.role_in_crew, member.employee.position if member.employee else None)
        expected = canonical_members.get(member.employee_id)
        if expected:
            expected_crew_id, expected_role = expected
            member.role_in_crew = expected_role
            member.is_active = member.crew_id == expected_crew_id
        elif member.crew_id in canonical_crews:
            member.is_active = False

    for employee_id, (crew_id, role) in canonical_members.items():
        existing = db.scalar(
            select(CrewMember).where(
                CrewMember.employee_id == employee_id,
                CrewMember.crew_id == crew_id,
            )
        )
        if existing:
            existing.role_in_crew = role
            existing.is_active = True
        else:
            db.add(
                CrewMember(
                    crew_id=crew_id,
                    employee_id=employee_id,
                    role_in_crew=role,
                    joined_at=date(2026, 5, 1),
                    is_active=True,
                )
            )

    for assignment in db.scalars(select(ObjectAssignment)).all():
        assignment.role_on_object = normalize_role_in_crew(assignment.role_on_object, assignment.employee.position if assignment.employee else None)
        expected = canonical_assignments.get(assignment.employee_id)
        if expected:
            expected_object_id, expected_crew_id, expected_role = expected
            assignment.role_on_object = expected_role
            assignment.is_active = (
                assignment.construction_object_id == expected_object_id
                and assignment.crew_id == expected_crew_id
            )
        elif assignment.employee_id not in canonical_assignments and assignment.crew_id in canonical_crews:
            assignment.is_active = False

    for employee_id, (object_id, crew_id, role) in canonical_assignments.items():
        assignment = db.scalar(
            select(ObjectAssignment).where(
                ObjectAssignment.employee_id == employee_id,
                ObjectAssignment.construction_object_id == object_id,
                ObjectAssignment.crew_id == crew_id,
            )
        )
        if assignment:
            assignment.role_on_object = role
            assignment.is_active = True
        else:
            db.add(
                ObjectAssignment(
                    employee_id=employee_id,
                    construction_object_id=object_id,
                    crew_id=crew_id,
                    role_on_object=role,
                    start_date=date(2026, 5, 1),
                    is_active=True,
                )
            )

    for item in db.scalars(select(WorkPlanItem)).all():
        item.title, item.description, item.unit = normalize_work_plan_fields(item.title, item.description, item.unit)

    grouped_plan_items: dict[tuple[int, str], list[WorkPlanItem]] = {}
    for item in db.scalars(select(WorkPlanItem).order_by(WorkPlanItem.id)).all():
        grouped_plan_items.setdefault((item.construction_object_id, item.title), []).append(item)
    for duplicates in grouped_plan_items.values():
        if len(duplicates) < 2:
            continue
        ordered = sorted(
            duplicates,
            key=lambda current: (
                len(current.daily_reports),
                current.completed_volume or 0,
                -(current.id),
            ),
            reverse=True,
        )
        keep = ordered[0]
        for duplicate in ordered[1:]:
            for report in duplicate.daily_reports:
                report.work_plan_item = keep
                report.work_plan_item_id = keep.id
            keep.planned_volume = max(keep.planned_volume or 0, duplicate.planned_volume or 0)
            keep.completed_volume = max(keep.completed_volume or 0, duplicate.completed_volume or 0)
            keep.priority = keep.priority or duplicate.priority
            if not keep.description and duplicate.description:
                keep.description = duplicate.description
            if not keep.unit and duplicate.unit:
                keep.unit = duplicate.unit
            db.delete(duplicate)

    for report in db.scalars(select(DailyReport)).all():
        fallback = f"{report.work_plan_item.title} dokumentiert und zur Prüfung eingereicht." if report.work_plan_item else None
        report.work_description = normalize_report_description(report.work_description, fallback=fallback)
        file_names = [photo.file_name for photo in report.photos]
        report.media_note = normalize_media_note(report.media_note, file_names if file_names else None)
        for photo in report.photos:
            photo.caption = normalize_photo_caption(photo.caption, photo.file_name)
        for comment in report.comments:
            comment.body = normalize_report_comment(comment.body)
        seen_events: set[tuple[str, str, str | None]] = set()
        for event in sorted(report.events, key=lambda current: (current.created_at, current.id)):
            normalized_title = normalize_report_event_title(event.title, event.event_type, report.status if event.event_type == "status_changed" else None)
            normalized_body = normalize_report_event_body(
                event.body,
                event_type=event.event_type,
                title=normalized_title,
                status_value=report.status if event.event_type == "status_changed" else None,
            )
            key = (event.event_type, normalized_title, normalized_body)
            if key in seen_events:
                db.delete(event)
                continue
            seen_events.add(key)
            event.title = normalized_title
            event.body = normalized_body
            if event.event_type == "report_created":
                event.tone = "success"
            elif event.event_type == "media_uploaded":
                event.tone = "success"
            elif event.event_type == "status_changed":
                if report.status == "admin_approved":
                    event.tone = "success"
                elif report.status in {"rejected", "change_requested"}:
                    event.tone = "danger"
                else:
                    event.tone = "warning"

    for photo in db.scalars(select(ReportPhoto)).all():
        photo.caption = normalize_photo_caption(photo.caption, photo.file_name)

    for comment in db.scalars(select(ReportComment)).all():
        comment.body = normalize_report_comment(comment.body)


def enrich_demo_data(db) -> None:
    berlin_ost = db.scalar(select(ConstructionObject).where(ConstructionObject.code == "BER-OST-C"))
    berlin_mitte = db.scalar(select(ConstructionObject).where(ConstructionObject.code == "BER-MIT-A"))
    potsdam = db.scalar(select(ConstructionObject).where(ConstructionObject.code == "POT-HAL-2"))
    admin_user, foreman_user, worker_user = sync_demo_access(db)
    foreman = db.scalar(
        select(Employee).where(
            or_(
                Employee.position.ilike("%Polier%"),
                Employee.position.ilike("%Бригадир%"),
            )
        )
    )
    worker = db.scalar(select(Employee).where(Employee.last_name == "Meyer"))
    jonas = db.scalar(select(Employee).where(Employee.last_name == "Klein"))
    leon = db.scalar(select(Employee).where(Employee.last_name == "Schulz"))
    if not all([berlin_ost, berlin_mitte, potsdam, foreman, worker, jonas, leon]):
        return

    object_details = {
        berlin_mitte.code: {
            "description": "Sanierung des Wohnhauses Haus A in Berlin Mitte inklusive Modernisierung der technischen Infrastruktur.",
            "work_scope": "Elektroinstallation, Kabeltrassen, Schaltfelder und Vorbereitung technischer Räume.",
            "site_manager": "Oleh Kovalenko",
            "priority": "high",
            "progress_percent": 42,
            "planned_start_date": berlin_mitte.start_date,
            "planned_end_date": date(2026, 7, 30),
            "actual_start_date": berlin_mitte.start_date,
        },
        berlin_ost.code: {
            "description": "Neubauprojekt Berlin Ost - Haus C mit den Bauabschnitten A-C.",
            "work_scope": "Sanitär, temporäre Stromversorgung, Endanschlüsse und Teamkoordination.",
            "site_manager": "Oleh Kovalenko",
            "priority": "urgent",
            "progress_percent": 58,
            "planned_start_date": berlin_ost.start_date,
            "planned_end_date": date(2026, 8, 15),
            "actual_start_date": berlin_ost.start_date,
        },
        potsdam.code: {
            "description": "Logistikhalle 2 in Potsdam mit Stahlbau und technischen Anschlusspunkten.",
            "work_scope": "Untergrundvorbereitung, Profilmontage, Warenannahme und Baustellenlogistik.",
            "site_manager": "Roman Schneider",
            "priority": "normal",
            "progress_percent": 31,
            "planned_start_date": potsdam.start_date,
            "planned_end_date": date(2026, 6, 20),
            "actual_start_date": potsdam.start_date,
        },
    }
    for obj in [berlin_mitte, berlin_ost, potsdam]:
        for key, value in object_details[obj.code].items():
            setattr(obj, key, value)

    elektro = _find_crew_by_names(db, "Team Elektro Ost", "Бригада Elektro Ost")
    if not elektro:
        elektro = Crew(name="Team Elektro Ost", specialization="Elektroinstallation", foreman=foreman, current_object=berlin_ost, notes="Aktives Team für Berlin Ost; zugeordnete Mitarbeiter sehen dieses Projekt automatisch.")
        db.add(elektro)
        db.flush()
    else:
        elektro.name = "Team Elektro Ost"
        elektro.specialization = "Elektroinstallation"
        elektro.foreman = foreman
        elektro.current_object = berlin_ost
        elektro.notes = "Aktives Team für Berlin Ost; zugeordnete Mitarbeiter sehen dieses Projekt automatisch."
    montage = _find_crew_by_names(db, "Team Montage Potsdam", "Бригада Montage Potsdam")
    if not montage:
        montage = Crew(name="Team Montage Potsdam", specialization="Stahlbaumontage", foreman=foreman, current_object=potsdam, notes="Montageteam für Vorbereitungs- und Stahlbauarbeiten in Potsdam.")
        db.add(montage)
        db.flush()
    else:
        montage.name = "Team Montage Potsdam"
        montage.specialization = "Stahlbaumontage"
        montage.foreman = foreman
        montage.current_object = potsdam
        montage.notes = "Montageteam für Vorbereitungs- und Stahlbauarbeiten in Potsdam."
    berlin_team = _find_crew_by_names(db, "Team Berlin Mitte", "Berlin 2")
    if not berlin_team:
        berlin_team = Crew(name="Team Berlin Mitte", specialization="Elektroinstallation", foreman=foreman, current_object=berlin_mitte, notes="Reserve-Team für Berlin Mitte mit sauberem Demo-Datenstand.")
        db.add(berlin_team)
        db.flush()
    else:
        berlin_team.name = "Team Berlin Mitte"
        berlin_team.specialization = "Elektroinstallation"
        berlin_team.foreman = foreman
        berlin_team.current_object = berlin_mitte
        berlin_team.notes = "Reserve-Team für Berlin Mitte mit sauberem Demo-Datenstand."

    for crew, employee, role in [(elektro, worker, "Elektriker"), (elektro, leon, "Sanitärinstallateur"), (montage, jonas, "Monteur")]:
        exists = db.scalar(select(CrewMember).where(CrewMember.crew_id == crew.id, CrewMember.employee_id == employee.id))
        if not exists:
            db.add(CrewMember(crew=crew, employee=employee, role_in_crew=role, joined_at=date(2026, 5, 1), is_active=True))
        else:
            exists.role_in_crew = role
            exists.is_active = True
        assignment = db.scalar(select(ObjectAssignment).where(ObjectAssignment.employee_id == employee.id, ObjectAssignment.construction_object_id == crew.current_object_id, ObjectAssignment.is_active.is_(True)))
        if assignment:
            assignment.crew = crew
            assignment.role_on_object = role
        else:
            db.add(ObjectAssignment(employee=employee, construction_object=crew.current_object, crew=crew, role_on_object=role, start_date=date(2026, 5, 1), is_active=True))

    plans = [
        (berlin_ost, elektro, "Kabeltrassen Montage Abschnitt C", "Haupttrasse im 2. Obergeschoss verlegen und Kabelgruppen kennzeichnen.", 180, 96, "m"),
        (berlin_ost, elektro, "Schaltfelder und temporärer Strom", "Schaltfeld vorbereiten, Sicherungen prüfen und Fotodokumentation erstellen.", 12, 7, "Punkte"),
        (berlin_ost, elektro, "Sanitäranschlüsse", "PEX-Leitungen in den Sanitärräumen von Abschnitt C abschließen.", 90, 52, "m"),
        (potsdam, montage, "Untergrund für Stahlbau", "Untergrund vorbereiten, Anker setzen und Geometrie prüfen.", 260, 80, "m2"),
        (berlin_mitte, elektro, "Kabeltrassen Haus A", "Erdgeschoss und Technikraum vorbereiten.", 140, 64, "m"),
    ]
    plan_aliases = {
        "Schaltfelder und temporärer Strom": ["Schaltfelder und temporärer Strom", "Schaltfelder und temporaerer Strom", "Щитові та тимчасове живлення"],
        "Sanitäranschlüsse": ["Sanitäranschlüsse", "Sanitaeranschluesse", "Сантехнічні підключення"],
        "Untergrund für Stahlbau": ["Untergrund für Stahlbau", "Untergrund fuer Stahlbau"],
    }
    for obj, crew, title, description, planned, completed, unit in plans:
        aliases = plan_aliases.get(title, [title])
        exists = db.scalar(select(WorkPlanItem).where(WorkPlanItem.construction_object_id == obj.id, WorkPlanItem.title.in_(aliases)))
        if not exists:
            db.add(WorkPlanItem(construction_object=obj, crew=crew, title=title, description=description, planned_volume=planned, completed_volume=completed, unit=unit, status="in_progress", planned_start=date(2026, 5, 20), planned_end=date(2026, 6, 5), priority="high" if obj == berlin_ost else "normal"))

    db.flush()
    _normalize_existing_demo_records(
        db,
        berlin_mitte=berlin_mitte,
        berlin_ost=berlin_ost,
        potsdam=potsdam,
        foreman=foreman,
        worker=worker,
        jonas=jonas,
        leon=leon,
        elektro=elektro,
        montage=montage,
        berlin_team=berlin_team,
    )
    ost_plan = db.scalar(select(WorkPlanItem).where(WorkPlanItem.construction_object_id == berlin_ost.id, WorkPlanItem.title == "Kabeltrassen Montage Abschnitt C"))
    potsdam_plan = db.scalar(select(WorkPlanItem).where(WorkPlanItem.construction_object_id == potsdam.id, WorkPlanItem.title == "Untergrund für Stahlbau"))
    demo_reports = [
        ("DR-2026-0042", worker, berlin_ost, ost_plan, date(2026, 5, 29), "submitted", 7.75, 18, "Kabeltrassen im 2. Obergeschoss von Abschnitt C montiert, Gruppen markiert und Fotos hochgeladen.", None, None),
        ("DR-2026-0041", jonas, potsdam, potsdam_plan, date(2026, 5, 28), "foreman_approved", 8.17, 24, "Untergrund für den Stahlbau vorbereitet, Anker gesetzt und für die finale Verwaltungskontrolle bereitgestellt.", foreman_user.id if foreman_user else None, None),
        ("DR-2026-0040", leon, berlin_ost, None, date(2026, 5, 27), "admin_approved", 8.5, 16, "PEX-Leitungen in den Sanitärräumen von Abschnitt C verlegt und erste Dichtigkeitsprüfung abgeschlossen.", foreman_user.id if foreman_user else None, admin_user.id if admin_user else None),
    ]
    for number, employee, obj, plan, report_date, status, hours, completed_volume, description, foreman_user_id, admin_user_id in demo_reports:
        exists = db.scalar(select(DailyReport).where(DailyReport.report_number == number))
        if exists:
            continue
        report = DailyReport(
            report_number=number,
            employee=employee,
            construction_object=obj,
            work_plan_item=plan,
            report_date=report_date,
            start_time=time(8, 0),
            end_time=time(16, 30),
            break_minutes=30,
            worked_hours=hours,
            status=status,
            completed_volume=completed_volume,
            media_note="2 Dateien: site-progress.jpg, measurement.jpg" if number == "DR-2026-0042" else None,
            work_description=description,
            foreman_reviewed_by_user_id=foreman_user_id,
            admin_reviewed_by_user_id=admin_user_id,
        )
        db.add(report)
        db.flush()
        if number == "DR-2026-0042":
            db.add(ReportPhoto(daily_report=report, file_name="site-progress.jpg", file_url="https://placehold.co/900x650?text=Site+Progress", caption="Arbeitsfortschritt Abschnitt C"))
            if worker_user:
                db.add(ReportComment(report=report, author=worker_user, body="Fotos aus dem 2. Obergeschoss hochgeladen und Fortschritt aktualisiert."))
            if foreman_user:
                db.add(ReportComment(report=report, author=foreman_user, body="Trassenführung wird geprüft. Bei Freigabe geht der Bericht an die Verwaltung."))
        if not db.scalar(select(ReportEvent).where(ReportEvent.report_id == report.id, ReportEvent.event_type == "report_created")):
            db.add(ReportEvent(report=report, actor=employee.user or worker_user, event_type="report_created", title="Bericht veröffentlicht", body=f"Tagesbericht {number} wurde erstellt.", tone="success"))
        if status in {"submitted", "foreman_approved", "admin_approved", "rejected", "change_requested"}:
            status_title = {
                "submitted": "An Polier gesendet",
                "foreman_approved": "Vom Polier freigegeben",
                "admin_approved": "Final freigegeben",
                "rejected": "Abgelehnt",
                "change_requested": "Nacharbeit angefordert",
            }[status]
            if not db.scalar(select(ReportEvent).where(ReportEvent.report_id == report.id, ReportEvent.event_type == "status_changed", ReportEvent.title == status_title)):
                actor = foreman_user if status == "foreman_approved" else admin_user if status == "admin_approved" else employee.user or worker_user
                db.add(ReportEvent(report=report, actor=actor, event_type="status_changed", title=status_title, body=f"Berichtsstatus wurde auf {status_title.lower()} gesetzt.", tone="success" if status == "admin_approved" else "warning" if status in {"submitted", "foreman_approved"} else "danger"))

    for report in db.scalars(select(DailyReport)).all():
        if not db.scalar(select(ReportEvent).where(ReportEvent.report_id == report.id, ReportEvent.event_type == "report_created")):
            db.add(ReportEvent(report=report, actor=report.employee.user or worker_user, event_type="report_created", title="Bericht veröffentlicht", body=f"Tagesbericht {report.report_number} wurde erstellt.", tone="success"))
        status_title = {
            "submitted": "An Polier gesendet",
            "foreman_approved": "Vom Polier freigegeben",
            "admin_approved": "Final freigegeben",
            "rejected": "Abgelehnt",
            "change_requested": "Nacharbeit angefordert",
        }.get(report.status)
        if status_title and not db.scalar(select(ReportEvent).where(ReportEvent.report_id == report.id, ReportEvent.event_type == "status_changed", ReportEvent.title == status_title)):
            actor = foreman_user if report.status == "foreman_approved" else admin_user if report.status == "admin_approved" else report.employee.user or worker_user
            db.add(ReportEvent(report=report, actor=actor, event_type="status_changed", title=status_title, body=f"Aktueller Berichtsstatus: {status_title.lower()}.", tone="success" if report.status == "admin_approved" else "warning" if report.status in {"submitted", "foreman_approved"} else "danger"))

    _normalize_existing_demo_records(
        db,
        berlin_mitte=berlin_mitte,
        berlin_ost=berlin_ost,
        potsdam=potsdam,
        foreman=foreman,
        worker=worker,
        jonas=jonas,
        leon=leon,
        elektro=elektro,
        montage=montage,
        berlin_team=berlin_team,
    )

    db.commit()


def run_seed() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(Role).where(Role.code == "admin")):
            enrich_demo_data(db)
            print("Seed enrichment completed: crews, object details and work plan are up to date.")
            return

        roles = [
            Role(code="admin", name="Geschäftsleitung", description="Voller Zugriff auf das System"),
            Role(code="foreman", name="Polier / Projektleitung", description="Freigabe von Berichten und Steuerung der Projekte"),
            Role(code="worker", name="Mitarbeiter", description="Mobile Erfassung von Tagesleistungen"),
        ]
        db.add_all(roles)
        db.flush()
        role_by_code = {role.code: role for role in roles}

        users = [
            User(email="admin@baupilot.demo", full_name="Roman Schneider", role=role_by_code["admin"], hashed_password=get_password_hash("Admin12345")),
            User(email="foreman@baupilot.demo", full_name="Oleh Kovalenko", role=role_by_code["foreman"], hashed_password=get_password_hash("Foreman12345")),
            User(email="worker@baupilot.demo", full_name="Markus Meyer", role=role_by_code["worker"], hashed_password=get_password_hash("Worker12345")),
        ]
        db.add_all(users)
        db.flush()

        employees = [
            Employee(user=users[0], first_name="Roman", last_name="Schneider", position="Geschäftsleitung", phone="+49 30 1000001", hourly_rate=0, status="active"),
            Employee(user=users[1], first_name="Oleh", last_name="Kovalenko", position="Polier", phone="+49 30 1000002", hourly_rate=36, status="active"),
            Employee(user=users[2], first_name="Markus", last_name="Meyer", position="Elektriker", phone="+49 30 1000003", hourly_rate=28, status="active"),
            Employee(first_name="Jonas", last_name="Klein", position="Monteur", phone="+49 331 1000004", hourly_rate=27, status="active"),
            Employee(first_name="Leon", last_name="Schulz", position="Sanitärinstallateur", phone="+49 30 1000005", hourly_rate=29, status="active"),
            Employee(first_name="Sofia", last_name="Weber", position="Kalkulation", phone="+49 30 1000006", hourly_rate=32, status="active"),
        ]
        db.add_all(employees)
        db.flush()

        objects = [
            ConstructionObject(name="Berlin Mitte - Haus A", code="BER-MIT-A", city="Berlin", address="Invalidenstrasse 42, 10115 Berlin", client="Mitte Bau GmbH", status="active", start_date=date(2026, 2, 1), planned_start_date=date(2026, 2, 1), planned_end_date=date(2026, 7, 30), actual_start_date=date(2026, 2, 1), description="Sanierung des Wohnhauses Haus A in Berlin Mitte.", work_scope="Elektroinstallation, Kabeltrassen und Schaltfelder.", site_manager="Oleh Kovalenko", priority="high", progress_percent=42, budget=420000),
            ConstructionObject(name="Berlin Ost - Neubau C", code="BER-OST-C", city="Berlin", address="Frankfurter Allee 211, 10365 Berlin", client="Ost Projekt AG", status="active", start_date=date(2026, 1, 15), planned_start_date=date(2026, 1, 15), planned_end_date=date(2026, 8, 15), actual_start_date=date(2026, 1, 15), description="Neubauprojekt Berlin Ost - Haus C.", work_scope="Sanitär, temporäre Stromversorgung und Endanschlüsse.", site_manager="Oleh Kovalenko", priority="urgent", progress_percent=58, budget=680000),
            ConstructionObject(name="Potsdam - Halle 2", code="POT-HAL-2", city="Potsdam", address="Babelsberger Str. 18, 14473 Potsdam", client="Potsdam Logistic SE", status="active", start_date=date(2026, 3, 1), planned_start_date=date(2026, 3, 1), planned_end_date=date(2026, 6, 20), actual_start_date=date(2026, 3, 1), description="Logistikhalle 2 in Potsdam.", work_scope="Untergrundvorbereitung, Profilmontage und Materialannahme.", site_manager="Roman Schneider", priority="normal", progress_percent=31, budget=310000),
            ConstructionObject(name="Brandenburg - Standort West", code="BRB-WEST", city="Brandenburg", address="Magdeburger Landstr. 9, 14770 Brandenburg", client="WestPark GmbH", status="planning", start_date=date(2026, 4, 10), planned_start_date=date(2026, 4, 10), planned_end_date=date(2026, 9, 1), description="Geplanter Standort Brandenburg West vor Baubeginn.", work_scope="Baustellenvorbereitung und technische Anschluesse.", site_manager="Roman Schneider", priority="normal", progress_percent=8, budget=250000),
        ]
        db.add_all(objects)
        db.flush()

        db.add_all(
            [
                ObjectAssignment(employee=employees[1], construction_object=objects[0], role_on_object="Polier", start_date=date(2026, 2, 1)),
                ObjectAssignment(employee=employees[2], construction_object=objects[0], role_on_object="Elektriker", start_date=date(2026, 2, 3)),
                ObjectAssignment(employee=employees[3], construction_object=objects[2], role_on_object="Monteur", start_date=date(2026, 3, 1)),
                ObjectAssignment(employee=employees[4], construction_object=objects[1], role_on_object="Sanitärinstallateur", start_date=date(2026, 1, 16)),
            ]
        )

        db.flush()
        enrich_demo_data(db)

        reports = [
            DailyReport(report_number="DR-2026-0031", employee=employees[2], construction_object=objects[0], report_date=date(2026, 3, 21), start_time=time(8, 0), end_time=time(15, 45), break_minutes=0, worked_hours=7.75, status="submitted", work_description="Kabeltrassen im 1. Obergeschoss montiert, Materiallieferung geprüft und Schaltschrankposition markiert."),
            DailyReport(report_number="DR-2026-0030", employee=employees[3], construction_object=objects[2], report_date=date(2026, 3, 20), start_time=time(7, 20), end_time=time(16, 0), break_minutes=30, worked_hours=8.17, status="foreman_approved", foreman_reviewed_by_user_id=users[1].id, work_description="Untergrund für die Stahlbaumontage vorbereitet und Profile angenommen."),
            DailyReport(report_number="DR-2026-0029", employee=employees[4], construction_object=objects[1], report_date=date(2026, 3, 19), start_time=time(8, 10), end_time=time(17, 0), break_minutes=20, worked_hours=8.5, status="admin_approved", foreman_reviewed_by_user_id=users[1].id, admin_reviewed_by_user_id=users[0].id, work_description="Wasserleitungen in Abschnitt C verlegt und Dichtigkeitsprüfung abgeschlossen."),
            DailyReport(report_number="DR-2026-0028", employee=employees[2], construction_object=objects[1], report_date=date(2026, 3, 18), start_time=time(7, 30), end_time=time(16, 0), break_minutes=30, worked_hours=8.0, status="admin_approved", foreman_reviewed_by_user_id=users[1].id, admin_reviewed_by_user_id=users[0].id, work_description="Temporare Beleuchtung angeschlossen und Kabelgruppen markiert."),
            DailyReport(report_number="DR-2026-0027", employee=employees[2], construction_object=objects[3], report_date=date(2026, 3, 15), start_time=time(8, 15), end_time=time(17, 0), break_minutes=30, worked_hours=8.25, status="admin_approved", foreman_reviewed_by_user_id=users[1].id, admin_reviewed_by_user_id=users[0].id, work_description="Standortbegehung durchgefuehrt, Anschlusspunkte dokumentiert und Materialliste vorbereitet."),
            DailyReport(report_number="DR-2026-0026", employee=employees[3], construction_object=objects[0], report_date=date(2026, 3, 14), start_time=time(8, 0), end_time=time(14, 30), break_minutes=30, worked_hours=6.0, status="rejected", rejection_reason="Fotobeleg fehlt", work_description="Befestigungen für Kabeltrassen montiert."),
        ]
        db.add_all(reports)
        db.flush()

        db.add_all(
            [
                ReportPhoto(daily_report=reports[0], file_name="trasa-1.jpg", file_url="https://placehold.co/900x650?text=Trasa+1", caption="Trasse, 1. Obergeschoss"),
                ReportPhoto(daily_report=reports[0], file_name="shield.jpg", file_url="https://placehold.co/900x650?text=Shield", caption="Position des Schaltschranks"),
                ReportPhoto(daily_report=reports[0], file_name="materials.jpg", file_url="https://placehold.co/900x650?text=Materials", caption="Material auf der Baustelle"),
                ReportComment(report=reports[0], author=users[2], body="Fotos hochgeladen und Position des Schaltschranks praezisiert."),
                ReportComment(report=reports[0], author=users[1], body="Vor finaler Freigabe ist eine zusaetzliche Pruefung noetig."),
                ReportComment(report=reports[2], author=users[0], body="Final für die Lohnabrechnung freigegeben."),
            ]
        )

        for report in reports:
            db.add(ReportEvent(report=report, actor=report.employee.user or users[2], event_type="report_created", title="Bericht veröffentlicht", body=f"Tagesbericht {report.report_number} wurde erstellt.", tone="success"))
            status_title = {
                "submitted": "An Polier gesendet",
                "foreman_approved": "Vom Polier freigegeben",
                "admin_approved": "Final freigegeben",
                "rejected": "Abgelehnt",
                "change_requested": "Nacharbeit angefordert",
            }.get(report.status)
            if status_title:
                actor = users[1] if report.status == "foreman_approved" else users[0] if report.status == "admin_approved" else report.employee.user or users[2]
                db.add(ReportEvent(report=report, actor=actor, event_type="status_changed", title=status_title, body=f"Aktueller Berichtsstatus: {status_title.lower()}.", tone="success" if report.status == "admin_approved" else "warning" if report.status in {"submitted", "foreman_approved"} else "danger"))

        materials = [
            Material(sku="CBL-NYM-3X2.5", name="NYM-Kabel 3x2.5", unit="m", default_price=1.85),
            Material(sku="DIN-RAIL-35", name="DIN-Schiene 35 mm", unit="m", default_price=4.2),
            Material(sku="PIPE-PEX-20", name="PEX-Rohr 20 mm", unit="m", default_price=2.4),
            Material(sku="PROFILE-CW-75", name="Profil CW 75", unit="pcs", default_price=5.8),
        ]
        db.add_all(materials)
        db.flush()

        request = MaterialRequest(request_number="MR-2026-0012", construction_object=objects[0], requested_by=employees[1], needed_by=date(2026, 3, 24), status="review", comment="Wird für die Fortsetzung der Elektroarbeiten im 2. Obergeschoss benötigt.")
        db.add(request)
        db.flush()
        db.add_all(
            [
                MaterialRequestItem(material_request=request, material=materials[0], quantity=250, estimated_price=462.5),
                MaterialRequestItem(material_request=request, material=materials[1], quantity=20, estimated_price=84),
            ]
        )

        db.add_all(
            [
                Expense(construction_object=objects[0], expense_date=date(2026, 3, 21), category="Material", amount=546.5, description="Kabel und DIN-Schienen"),
                Expense(construction_object=objects[1], expense_date=date(2026, 3, 19), category="Geraetemiete", amount=320, description="Hebebühne für Abschnitt C"),
                Expense(construction_object=objects[2], expense_date=date(2026, 3, 20), category="Logistik", amount=180, description="Anlieferung von Stahlprofilen"),
            ]
        )

        db.commit()
        print("Seed abgeschlossen. Demo-Zugaenge: admin@baupilot.demo / Admin12345, foreman@baupilot.demo / Foreman12345, worker@baupilot.demo / Worker12345")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
