import logging
import datetime
import inngest
from django.utils import timezone

logger = logging.getLogger("InngestWorkflows")

inngest_client = inngest.Inngest(
    app_id="qablny",
    is_production=False,
)

@inngest_client.create_function(
    fn_id="match-timeout-checker",
    trigger=inngest.TriggerEvent(event="match/queued"),
)
def match_timeout_checker(ctx: inngest.ContextSync) -> dict:
    """Checks queue status after 25s delay to handle auto-requeue or timeout."""
    user_id = ctx.event.data.get("userId")
    
    ctx.step.sleep("wait-match-window", datetime.timedelta(seconds=25))
    
    # Check if user is still active in queue via redis
    from apps.match.service import MatchmakingService
    from qablny.centrifugo import publish_to_centrifugo
    still_in_queue = ctx.step.run("check-queue-status", lambda: MatchmakingService.is_in_queue(user_id))

    if still_in_queue:
        def notify_timeout():
            publish_to_centrifugo(f"users:{user_id}", "QueueTimeout", {
                "message": "جاري البحث عن شريك مناسب وتوسيع نطاق البحث...",
                "stillSearching": True
            })
            return True
        ctx.step.run("notify-queue-timeout", notify_timeout)

    return {"userId": user_id, "stillInQueue": still_in_queue}

@inngest_client.create_function(
    fn_id="vip-expiration-checker",
    trigger=inngest.TriggerCron(cron="*/15 * * * *"),
)
def vip_expiration_checker(ctx: inngest.ContextSync) -> dict:
    """Periodic job every 15 minutes to expire VIP subscriptions."""
    def expire_vips_sync():
        from apps.users.models import User, Notification
        now = timezone.now()
        expired_users = list(User.objects.filter(is_vip=True, vip_expires_at__isnull=False, vip_expires_at__lte=now))
        count = 0
        for u in expired_users:
            u.is_vip = False
            u.save(update_fields=['is_vip'])
            Notification.objects.create(
                user_id=u.id,
                type="vip",
                title="انتهت باقة VIP",
                body="انتهت فترة اشتراكك في باقة VIP، يمكنك تجديد الاشتراك للاستمتاع بجميع المميزات."
            )
            count += 1
        return count

    expired_count = ctx.step.run("expire-vips", expire_vips_sync)
    return {"expiredCount": expired_count}

@inngest_client.create_function(
    fn_id="send-push-notification",
    trigger=inngest.TriggerEvent(event="push/send"),
)
def send_push_notification_job(ctx: inngest.ContextSync) -> dict:
    data = ctx.event.data
    to = data.get("to")
    title = data.get("title")
    body = data.get("body")
    extra_data = data.get("data")
    
    from qablny.push import send_expo_push
    result = ctx.step.run("send-push", lambda: send_expo_push(to, title, body, extra_data))
    return {"success": result}

@inngest_client.create_function(
    fn_id="process-payout-workflow",
    trigger=inngest.TriggerEvent(event="agency/payout.process"),
)
def process_payout_workflow(ctx: inngest.ContextSync) -> dict:
    payout_id = ctx.event.data.get("payoutId")
    
    def process_sync():
        from apps.agency.models import PayoutRequest
        pr = PayoutRequest.objects.filter(id=payout_id).first()
        if pr and pr.status == "Pending":
            pr.status = "Processed"
            pr.processed_at = timezone.now()
            pr.save(update_fields=['status', 'processed_at'])
            return True
        return False

    res = ctx.step.run("process-payout", process_sync)
    return {"payoutId": payout_id, "processed": res}

inngest_functions = [
    match_timeout_checker,
    vip_expiration_checker,
    send_push_notification_job,
    process_payout_workflow,
]
