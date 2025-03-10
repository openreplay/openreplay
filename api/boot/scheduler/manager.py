import logging
from typing import List, Dict, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)


class SchedulerManager:
    """Scheduler manager for cron jobs."""

    _scheduler: AsyncIOScheduler = None

    @classmethod
    def initialize(cls, jobs: List[Dict[str, Any]]) -> None:
        """Initialize the scheduler with jobs."""
        if cls._scheduler is not None:
            logger.warning("Scheduler already initialized")
            return

        # Configure APScheduler logger
        ap_logger = logging.getLogger('apscheduler')
        ap_logger.setLevel(logging.getLogger().level)

        # Create scheduler
        cls._scheduler = AsyncIOScheduler()

        # Add all jobs to the scheduler
        for job in jobs:
            cls._scheduler.add_job(id=job["func"].__name__, **job)

        # Log scheduled jobs
        ap_logger.info(">Scheduled jobs:")
        for job in cls._scheduler.get_jobs():
            # Get the job information safely without depending on next_run_time
            job_info = {
                "Name": str(job.id),
                "Run Frequency": str(job.trigger),
            }

            # Try to get next run time if available, otherwise skip it
            try:
                if hasattr(job, "next_run_time"):
                    job_info["Next Run"] = str(job.next_run_time)
                elif hasattr(job, "_get_run_times"):
                    # Try to get the next run time using _get_run_times
                    run_times = job._get_run_times(1)
                    if run_times:
                        job_info["Next Run"] = str(run_times[0])
            except Exception as e:
                job_info["Next Run"] = "Unknown"
                logger.debug(f"Could not determine next run time for job {job.id}: {e}")

            ap_logger.info(job_info)

        # Start the scheduler
        cls._scheduler.start()
        logger.info("Scheduler started")

    @classmethod
    def shutdown(cls) -> None:
        """Shutdown the scheduler."""
        if cls._scheduler is not None:
            cls._scheduler.shutdown(wait=False)
            cls._scheduler = None
            logger.info("Scheduler shutdown")

    @classmethod
    def health_check(cls) -> bool:
        """Check scheduler health."""
        return cls._scheduler is not None and cls._scheduler.running
