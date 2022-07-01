print("============= CRONS =============")
import sys

from routers.crons import core_dynamic_crons


def process(action):
    {
        "TELEMETRY": core_dynamic_crons.telemetry_cron,
        "JOB": core_dynamic_crons.run_scheduled_jobs,
        "REPORT": core_dynamic_crons.weekly_report2
    }.get(action.upper(), lambda: print(f"{action} not found in crons-definitions"))()


if __name__ == '__main__':
    if len(sys.argv) < 2 or len(sys.argv[1]) < 1:
        print("please provide actions as argument")
    else:
        process(sys.argv[1])
