from datetime import date, time

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import (
    ConstructionObject,
    DailyReport,
    Employee,
    Expense,
    Material,
    MaterialRequest,
    MaterialRequestItem,
    ObjectAssignment,
    ReportPhoto,
    Role,
    User,
)


def run_seed() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(Role).where(Role.code == "admin")):
            print("Seed skipped: demo data already exists.")
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
            ConstructionObject(name="Berlin Mitte - Haus A", code="BER-MIT-A", city="Berlin", address="Invalidenstrasse 42, 10115 Berlin", client="Mitte Bau GmbH", status="active", start_date=date(2026, 2, 1), budget=420000),
            ConstructionObject(name="Berlin Ost - Neubau C", code="BER-OST-C", city="Berlin", address="Frankfurter Allee 211, 10365 Berlin", client="Ost Projekt AG", status="active", start_date=date(2026, 1, 15), budget=680000),
            ConstructionObject(name="Potsdam - Halle 2", code="POT-HAL-2", city="Potsdam", address="Babelsberger Str. 18, 14473 Potsdam", client="Potsdam Logistic SE", status="active", start_date=date(2026, 3, 1), budget=310000),
            ConstructionObject(name="Brandenburg - Standort West", code="BRB-WEST", city="Brandenburg", address="Magdeburger Landstr. 9, 14770 Brandenburg", client="WestPark GmbH", status="planning", start_date=date(2026, 4, 10), budget=250000),
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

        reports = [
            DailyReport(report_number="DR-2026-0031", employee=employees[2], construction_object=objects[0], report_date=date(2026, 3, 21), start_time=time(8, 0), end_time=time(15, 45), break_minutes=0, worked_hours=7.75, status="review", work_description="Змонтовано кабельні траси на 1-му поверсі, перевірено постачання матеріалів, позначено позицію щита."),
            DailyReport(report_number="DR-2026-0030", employee=employees[3], construction_object=objects[2], report_date=date(2026, 3, 20), start_time=time(7, 20), end_time=time(16, 0), break_minutes=30, worked_hours=8.17, status="open", work_description="Підготовлено основу під монтаж металоконструкцій, виконано приймання профілів."),
            DailyReport(report_number="DR-2026-0029", employee=employees[4], construction_object=objects[1], report_date=date(2026, 3, 19), start_time=time(8, 10), end_time=time(17, 0), break_minutes=20, worked_hours=8.5, status="approved", work_description="Прокладено водопровідні лінії у секції C, виконано перевірку герметичності."),
            DailyReport(report_number="DR-2026-0028", employee=employees[2], construction_object=objects[1], report_date=date(2026, 3, 18), start_time=time(7, 30), end_time=time(16, 0), break_minutes=30, worked_hours=8.0, status="approved", work_description="Підключено тимчасове освітлення, промарковано кабельні групи."),
            DailyReport(report_number="DR-2026-0027", employee=employees[2], construction_object=objects[3], report_date=date(2026, 3, 15), start_time=time(8, 15), end_time=time(17, 0), break_minutes=30, worked_hours=8.25, status="approved", work_description="Огляд майданчика, фіксація точок підведення живлення, підготовка списку матеріалів."),
            DailyReport(report_number="DR-2026-0026", employee=employees[3], construction_object=objects[0], report_date=date(2026, 3, 14), start_time=time(8, 0), end_time=time(14, 30), break_minutes=30, worked_hours=6.0, status="rejected", rejection_reason="Не вистачає фото підтвердження", work_description="Монтаж кріплень для кабельних трас."),
        ]
        db.add_all(reports)
        db.flush()

        db.add_all(
            [
                ReportPhoto(daily_report=reports[0], file_name="trasa-1.jpg", file_url="https://placehold.co/900x650?text=Trasa+1", caption="Траса, 1-й поверх"),
                ReportPhoto(daily_report=reports[0], file_name="shield.jpg", file_url="https://placehold.co/900x650?text=Shield", caption="Позиція електрощита"),
                ReportPhoto(daily_report=reports[0], file_name="materials.jpg", file_url="https://placehold.co/900x650?text=Materials", caption="Матеріали на об'єкті"),
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

