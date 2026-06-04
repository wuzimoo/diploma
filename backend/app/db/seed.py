from datetime import date, time

from sqlalchemy import select

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
    ReportPhoto,
    Role,
    User,
    WorkPlanItem,
)


def enrich_demo_data(db) -> None:
    berlin_ost = db.scalar(select(ConstructionObject).where(ConstructionObject.code == "BER-OST-C"))
    berlin_mitte = db.scalar(select(ConstructionObject).where(ConstructionObject.code == "BER-MIT-A"))
    potsdam = db.scalar(select(ConstructionObject).where(ConstructionObject.code == "POT-HAL-2"))
    foreman = db.scalar(select(Employee).where(Employee.position.ilike("%Бригадир%")))
    worker = db.scalar(select(Employee).where(Employee.last_name == "Meyer"))
    jonas = db.scalar(select(Employee).where(Employee.last_name == "Klein"))
    leon = db.scalar(select(Employee).where(Employee.last_name == "Schulz"))
    admin_user = db.scalar(select(User).where(User.email == "admin@romans-erp.demo"))
    foreman_user = db.scalar(select(User).where(User.email == "foreman@romans-erp.demo"))
    worker_user = db.scalar(select(User).where(User.email == "worker@romans-erp.demo"))
    if not all([berlin_ost, berlin_mitte, potsdam, foreman, worker, jonas, leon]):
        return

    object_details = {
        berlin_mitte.code: {
            "description": "Реконструкція житлового будинку Haus A у Berlin Mitte з оновленням інженерних мереж.",
            "work_scope": "Електромонтаж, кабельні траси, щитові, підготовка технічних приміщень.",
            "site_manager": "Oleh Kovalenko",
            "priority": "high",
            "progress_percent": 42,
            "planned_start_date": berlin_mitte.start_date,
            "planned_end_date": date(2026, 7, 30),
            "actual_start_date": berlin_mitte.start_date,
        },
        berlin_ost.code: {
            "description": "Новий житловий комплекс Berlin Ost - Neubau C, секції A-C.",
            "work_scope": "Сантехніка, тимчасове електроживлення, чистові підключення, координація бригад.",
            "site_manager": "Oleh Kovalenko",
            "priority": "urgent",
            "progress_percent": 58,
            "planned_start_date": berlin_ost.start_date,
            "planned_end_date": date(2026, 8, 15),
            "actual_start_date": berlin_ost.start_date,
        },
        potsdam.code: {
            "description": "Логістична Halle 2 у Potsdam з металоконструкціями та інженерними вводами.",
            "work_scope": "Підготовка основи, монтаж профілів, приймання металу, логістика.",
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

    elektro = db.scalar(select(Crew).where(Crew.name == "Бригада Elektro Ost"))
    if not elektro:
        elektro = Crew(name="Бригада Elektro Ost", specialization="Електромонтаж", foreman=foreman, current_object=berlin_ost, notes="Поточна бригада для Berlin Ost; працівники бачать цей об'єкт автоматично.")
        db.add(elektro)
        db.flush()
    montage = db.scalar(select(Crew).where(Crew.name == "Бригада Montage Potsdam"))
    if not montage:
        montage = Crew(name="Бригада Montage Potsdam", specialization="Монтаж металоконструкцій", foreman=foreman, current_object=potsdam, notes="Бригада для підготовчих і монтажних робіт у Potsdam.")
        db.add(montage)
        db.flush()

    for crew, employee, role in [(elektro, worker, "Електромонтажник"), (elektro, leon, "Сантехнік"), (montage, jonas, "Монтажник")]:
        exists = db.scalar(select(CrewMember).where(CrewMember.crew_id == crew.id, CrewMember.employee_id == employee.id))
        if not exists:
            db.add(CrewMember(crew=crew, employee=employee, role_in_crew=role, joined_at=date(2026, 5, 1), is_active=True))
        assignment = db.scalar(select(ObjectAssignment).where(ObjectAssignment.employee_id == employee.id, ObjectAssignment.construction_object_id == crew.current_object_id, ObjectAssignment.is_active.is_(True)))
        if assignment:
            assignment.crew = crew
        else:
            db.add(ObjectAssignment(employee=employee, construction_object=crew.current_object, crew=crew, role_on_object=role, start_date=date(2026, 5, 1), is_active=True))

    plans = [
        (berlin_ost, elektro, "Монтаж кабельних трас секція C", "Прокласти основну трасу 2-го поверху, промаркувати кабельні групи.", 180, 96, "m"),
        (berlin_ost, elektro, "Щитові та тимчасове живлення", "Підготувати щитову, перевірити автомати, зробити фотофіксацію.", 12, 7, "точок"),
        (berlin_ost, elektro, "Сантехнічні підключення", "Закрити PEX лінії у санвузлах секції C.", 90, 52, "m"),
        (potsdam, montage, "Основа під металоконструкції", "Підготовка основи, анкери, контроль геометрії.", 260, 80, "m2"),
        (berlin_mitte, elektro, "Кабельні траси Haus A", "Перший поверх і технічне приміщення.", 140, 64, "m"),
    ]
    for obj, crew, title, description, planned, completed, unit in plans:
        exists = db.scalar(select(WorkPlanItem).where(WorkPlanItem.construction_object_id == obj.id, WorkPlanItem.title == title))
        if not exists:
            db.add(WorkPlanItem(construction_object=obj, crew=crew, title=title, description=description, planned_volume=planned, completed_volume=completed, unit=unit, status="in_progress", planned_start=date(2026, 5, 20), planned_end=date(2026, 6, 5), priority="high" if obj == berlin_ost else "normal"))

    db.flush()
    ost_plan = db.scalar(select(WorkPlanItem).where(WorkPlanItem.construction_object_id == berlin_ost.id, WorkPlanItem.title == "Монтаж кабельних трас секція C"))
    potsdam_plan = db.scalar(select(WorkPlanItem).where(WorkPlanItem.construction_object_id == potsdam.id, WorkPlanItem.title == "Основа під металоконструкції"))
    demo_reports = [
        ("DR-2026-0042", worker, berlin_ost, ost_plan, date(2026, 5, 29), "submitted", 7.75, 18, "Змонтовано кабельні траси на 2-му поверсі секції C, промарковано групи, додано фотофіксацію.", None, None),
        ("DR-2026-0041", jonas, potsdam, potsdam_plan, date(2026, 5, 28), "foreman_approved", 8.17, 24, "Підготовлено основу під металоконструкції, виставлено анкери, очікується фінальна перевірка адміністратора.", foreman_user.id if foreman_user else None, None),
        ("DR-2026-0040", leon, berlin_ost, None, date(2026, 5, 27), "admin_approved", 8.5, 16, "Прокладено PEX лінії у санвузлах секції C та виконано первинний контроль герметичності.", foreman_user.id if foreman_user else None, admin_user.id if admin_user else None),
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
            media_note="2 файл(и): site-progress.jpg, measurement.jpg" if number == "DR-2026-0042" else None,
            work_description=description,
            foreman_reviewed_by_user_id=foreman_user_id,
            admin_reviewed_by_user_id=admin_user_id,
        )
        db.add(report)
        db.flush()
        if number == "DR-2026-0042":
            db.add(ReportPhoto(daily_report=report, file_name="site-progress.jpg", file_url="https://placehold.co/900x650?text=Site+Progress", caption="Хід робіт секція C"))
            if worker_user:
                db.add(ReportComment(report=report, author=worker_user, body="Додав фото з другого поверху та оновив виконаний обсяг."))
            if foreman_user:
                db.add(ReportComment(report=report, author=foreman_user, body="Перевіряю трасування. Якщо все ок, передам на фінальне погодження."))

    db.commit()


def run_seed() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(Role).where(Role.code == "admin")):
            enrich_demo_data(db)
            print("Seed enrichment completed: crews, object details and work plan are up to date.")
            return

        roles = [
            Role(code="admin", name="Керівник компанії", description="Повний доступ до системи"),
            Role(code="foreman", name="Бригадир / керівник проєкту", description="Погодження звітів і керування об'єктами"),
            Role(code="worker", name="Працівник", description="Мобільне звітування по роботах"),
        ]
        db.add_all(roles)
        db.flush()
        role_by_code = {role.code: role for role in roles}

        users = [
            User(email="admin@romans-erp.demo", full_name="Roman Schneider", role=role_by_code["admin"], hashed_password=get_password_hash("Admin12345")),
            User(email="foreman@romans-erp.demo", full_name="Oleh Kovalenko", role=role_by_code["foreman"], hashed_password=get_password_hash("Foreman12345")),
            User(email="worker@romans-erp.demo", full_name="Markus Meyer", role=role_by_code["worker"], hashed_password=get_password_hash("Worker12345")),
        ]
        db.add_all(users)
        db.flush()

        employees = [
            Employee(user=users[0], first_name="Roman", last_name="Schneider", position="Керівник компанії", phone="+49 30 1000001", hourly_rate=0, status="active"),
            Employee(user=users[1], first_name="Oleh", last_name="Kovalenko", position="Бригадир", phone="+49 30 1000002", hourly_rate=36, status="active"),
            Employee(user=users[2], first_name="Markus", last_name="Meyer", position="Електромонтажник", phone="+49 30 1000003", hourly_rate=28, status="active"),
            Employee(first_name="Jonas", last_name="Klein", position="Монтажник", phone="+49 331 1000004", hourly_rate=27, status="active"),
            Employee(first_name="Leon", last_name="Schulz", position="Сантехнік", phone="+49 30 1000005", hourly_rate=29, status="active"),
            Employee(first_name="Sofia", last_name="Weber", position="Кошторисниця", phone="+49 30 1000006", hourly_rate=32, status="active"),
        ]
        db.add_all(employees)
        db.flush()

        objects = [
            ConstructionObject(name="Berlin Mitte - Haus A", code="BER-MIT-A", city="Berlin", address="Invalidenstrasse 42, 10115 Berlin", client="Mitte Bau GmbH", status="active", start_date=date(2026, 2, 1), planned_start_date=date(2026, 2, 1), planned_end_date=date(2026, 7, 30), actual_start_date=date(2026, 2, 1), description="Реконструкція житлового будинку Haus A у Berlin Mitte.", work_scope="Електромонтаж, кабельні траси, щитові.", site_manager="Oleh Kovalenko", priority="high", progress_percent=42, budget=420000),
            ConstructionObject(name="Berlin Ost - Neubau C", code="BER-OST-C", city="Berlin", address="Frankfurter Allee 211, 10365 Berlin", client="Ost Projekt AG", status="active", start_date=date(2026, 1, 15), planned_start_date=date(2026, 1, 15), planned_end_date=date(2026, 8, 15), actual_start_date=date(2026, 1, 15), description="Новий житловий комплекс Berlin Ost - Neubau C.", work_scope="Сантехніка, тимчасове електроживлення, чистові підключення.", site_manager="Oleh Kovalenko", priority="urgent", progress_percent=58, budget=680000),
            ConstructionObject(name="Potsdam - Halle 2", code="POT-HAL-2", city="Potsdam", address="Babelsberger Str. 18, 14473 Potsdam", client="Potsdam Logistic SE", status="active", start_date=date(2026, 3, 1), planned_start_date=date(2026, 3, 1), planned_end_date=date(2026, 6, 20), actual_start_date=date(2026, 3, 1), description="Логістична Halle 2 у Potsdam.", work_scope="Підготовка основи, монтаж профілів, приймання металу.", site_manager="Roman Schneider", priority="normal", progress_percent=31, budget=310000),
            ConstructionObject(name="Brandenburg - Standort West", code="BRB-WEST", city="Brandenburg", address="Magdeburger Landstr. 9, 14770 Brandenburg", client="WestPark GmbH", status="planning", start_date=date(2026, 4, 10), planned_start_date=date(2026, 4, 10), planned_end_date=date(2026, 9, 1), description="Планований майданчик Brandenburg West.", work_scope="Підготовка майданчика та інженерні вводи.", site_manager="Roman Schneider", priority="normal", progress_percent=8, budget=250000),
        ]
        db.add_all(objects)
        db.flush()

        db.add_all(
            [
                ObjectAssignment(employee=employees[1], construction_object=objects[0], role_on_object="Бригадир", start_date=date(2026, 2, 1)),
                ObjectAssignment(employee=employees[2], construction_object=objects[0], role_on_object="Електромонтажник", start_date=date(2026, 2, 3)),
                ObjectAssignment(employee=employees[3], construction_object=objects[2], role_on_object="Монтажник", start_date=date(2026, 3, 1)),
                ObjectAssignment(employee=employees[4], construction_object=objects[1], role_on_object="Сантехнік", start_date=date(2026, 1, 16)),
            ]
        )

        db.flush()
        enrich_demo_data(db)

        reports = [
            DailyReport(report_number="DR-2026-0031", employee=employees[2], construction_object=objects[0], report_date=date(2026, 3, 21), start_time=time(8, 0), end_time=time(15, 45), break_minutes=0, worked_hours=7.75, status="submitted", work_description="Змонтовано кабельні траси на 1-му поверсі, перевірено постачання матеріалів, позначено позицію щита."),
            DailyReport(report_number="DR-2026-0030", employee=employees[3], construction_object=objects[2], report_date=date(2026, 3, 20), start_time=time(7, 20), end_time=time(16, 0), break_minutes=30, worked_hours=8.17, status="foreman_approved", foreman_reviewed_by_user_id=users[1].id, work_description="Підготовлено основу під монтаж металоконструкцій, виконано приймання профілів."),
            DailyReport(report_number="DR-2026-0029", employee=employees[4], construction_object=objects[1], report_date=date(2026, 3, 19), start_time=time(8, 10), end_time=time(17, 0), break_minutes=20, worked_hours=8.5, status="admin_approved", foreman_reviewed_by_user_id=users[1].id, admin_reviewed_by_user_id=users[0].id, work_description="Прокладено водопровідні лінії у секції C, виконано перевірку герметичності."),
            DailyReport(report_number="DR-2026-0028", employee=employees[2], construction_object=objects[1], report_date=date(2026, 3, 18), start_time=time(7, 30), end_time=time(16, 0), break_minutes=30, worked_hours=8.0, status="admin_approved", foreman_reviewed_by_user_id=users[1].id, admin_reviewed_by_user_id=users[0].id, work_description="Підключено тимчасове освітлення, промарковано кабельні групи."),
            DailyReport(report_number="DR-2026-0027", employee=employees[2], construction_object=objects[3], report_date=date(2026, 3, 15), start_time=time(8, 15), end_time=time(17, 0), break_minutes=30, worked_hours=8.25, status="admin_approved", foreman_reviewed_by_user_id=users[1].id, admin_reviewed_by_user_id=users[0].id, work_description="Огляд майданчика, фіксація точок підведення живлення, підготовка списку матеріалів."),
            DailyReport(report_number="DR-2026-0026", employee=employees[3], construction_object=objects[0], report_date=date(2026, 3, 14), start_time=time(8, 0), end_time=time(14, 30), break_minutes=30, worked_hours=6.0, status="rejected", rejection_reason="Не вистачає фото підтвердження", work_description="Монтаж кріплень для кабельних трас."),
        ]
        db.add_all(reports)
        db.flush()

        db.add_all(
            [
                ReportPhoto(daily_report=reports[0], file_name="trasa-1.jpg", file_url="https://placehold.co/900x650?text=Trasa+1", caption="Траса, 1-й поверх"),
                ReportPhoto(daily_report=reports[0], file_name="shield.jpg", file_url="https://placehold.co/900x650?text=Shield", caption="Позиція електрощита"),
                ReportPhoto(daily_report=reports[0], file_name="materials.jpg", file_url="https://placehold.co/900x650?text=Materials", caption="Матеріали на об'єкті"),
                ReportComment(report=reports[0], author=users[2], body="Завантажив фото та уточнив позицію щита."),
                ReportComment(report=reports[0], author=users[1], body="Потрібна додаткова перевірка перед фінальним погодженням."),
                ReportComment(report=reports[2], author=users[0], body="Фінально погоджено для включення в payroll."),
            ]
        )

        materials = [
            Material(sku="CBL-NYM-3X2.5", name="Кабель NYM 3x2.5", unit="m", default_price=1.85),
            Material(sku="DIN-RAIL-35", name="DIN-рейка 35 мм", unit="m", default_price=4.2),
            Material(sku="PIPE-PEX-20", name="PEX труба 20 мм", unit="m", default_price=2.4),
            Material(sku="PROFILE-CW-75", name="Профіль CW 75", unit="pcs", default_price=5.8),
        ]
        db.add_all(materials)
        db.flush()

        request = MaterialRequest(request_number="MR-2026-0012", construction_object=objects[0], requested_by=employees[1], needed_by=date(2026, 3, 24), status="review", comment="Потрібно для продовження електромонтажу на 2-му поверсі")
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
                Expense(construction_object=objects[0], expense_date=date(2026, 3, 21), category="Матеріали", amount=546.5, description="Кабель і DIN-рейки"),
                Expense(construction_object=objects[1], expense_date=date(2026, 3, 19), category="Оренда техніки", amount=320, description="Підйомник на секцію C"),
                Expense(construction_object=objects[2], expense_date=date(2026, 3, 20), category="Логістика", amount=180, description="Доставка металопрофілю"),
            ]
        )

        db.commit()
        print("Seed completed. Demo users: admin@romans-erp.demo / Admin12345, foreman@romans-erp.demo / Foreman12345, worker@romans-erp.demo / Worker12345")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
