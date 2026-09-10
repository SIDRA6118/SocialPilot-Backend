from django.core.management.base import BaseCommand
import time
from scheduler.services import QueueService


class Command(BaseCommand):
    help = 'Process pending posts in the publishing queue'

    def add_arguments(self, parser):
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Run continuously and check queue every N seconds',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Interval in seconds to check queue (default: 60)',
        )

    def handle(self, *args, **options):
        if options['continuous']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Starting queue processor (checking every {options['interval']}s)"
                )
            )
            
            try:
                while True:
                    results = QueueService.process_pending_posts()
                    
                    if results['processed'] > 0:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Processed: {results['processed']}, "
                                f"Success: {results['success']}, "
                                f"Failed: {results['failed']}"
                            )
                        )
                        
                        if results['errors']:
                            for error in results['errors']:
                                self.stdout.write(
                                    self.style.ERROR(
                                        f"Error: {error}"
                                    )
                                )
                    
                    time.sleep(options['interval'])
                    
            except KeyboardInterrupt:
                self.stdout.write(
                    self.style.WARNING("Queue processor stopped")
                )
        else:
            results = QueueService.process_pending_posts()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Processed: {results['processed']}, "
                    f"Success: {results['success']}, "
                    f"Failed: {results['failed']}"
                )
            )
            
            if results['errors']:
                for error in results['errors']:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error: {error}"
                        )
                    )
