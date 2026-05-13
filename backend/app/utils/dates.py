from datetime import datetime, time


def calculate_worked_hours(start_time: time, end_time: time, break_minutes: int = 0) -> float:
    start = datetime.combine(datetime.today(), start_time)
    end = datetime.combine(datetime.today(), end_time)
    minutes = max(int((end - start).total_seconds() / 60) - break_minutes, 0)
    return round(minutes / 60, 2)
