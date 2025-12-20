"""Web Push notification service for inspector alerts."""

import json
from typing import Optional
from dataclasses import dataclass, field

from pywebpush import webpush, WebPushException

from ..config import get_settings
from ..models.schemas import (
    PushSubscription,
    PushNotificationPayload,
    InspectorAlert,
    AlertSeverity,
)


@dataclass
class PushSubscriptionRecord:
    """Record of a push subscription."""
    subscription: PushSubscription
    inspector_id: Optional[str] = None
    topics: list[str] = field(default_factory=lambda: ["alerts"])


class PushService:
    """Service for managing Web Push notifications."""

    def __init__(self):
        settings = get_settings()
        self.vapid_private_key = settings.vapid_private_key
        self.vapid_public_key = settings.vapid_public_key
        self.vapid_claims = {"sub": settings.vapid_claims_email}
        self._subscriptions: dict[str, PushSubscriptionRecord] = {}

    @property
    def is_configured(self) -> bool:
        """Check if VAPID keys are configured."""
        return bool(self.vapid_private_key and self.vapid_public_key)

    def get_vapid_public_key(self) -> str:
        """Get the VAPID public key for client subscription."""
        return self.vapid_public_key

    def subscribe(
        self,
        subscription: PushSubscription,
        inspector_id: Optional[str] = None,
        topics: Optional[list[str]] = None,
    ) -> str:
        """
        Register a new push subscription.

        Returns a subscription ID.
        """
        # Use endpoint as unique ID
        sub_id = subscription.endpoint.split("/")[-1][:16]

        self._subscriptions[sub_id] = PushSubscriptionRecord(
            subscription=subscription,
            inspector_id=inspector_id,
            topics=topics or ["alerts"],
        )

        return sub_id

    def unsubscribe(self, subscription_id: str) -> bool:
        """Remove a push subscription."""
        if subscription_id in self._subscriptions:
            del self._subscriptions[subscription_id]
            return True
        return False

    def get_subscriptions(self, topic: Optional[str] = None) -> list[PushSubscriptionRecord]:
        """Get all subscriptions, optionally filtered by topic."""
        if topic:
            return [
                sub for sub in self._subscriptions.values()
                if topic in sub.topics
            ]
        return list(self._subscriptions.values())

    async def send_notification(
        self,
        subscription: PushSubscription,
        payload: PushNotificationPayload,
    ) -> bool:
        """
        Send a push notification to a single subscription.

        Returns True if successful, False otherwise.
        """
        if not self.is_configured:
            print("Warning: VAPID keys not configured. Skipping push notification.")
            return False

        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": subscription.keys,
                },
                data=json.dumps({
                    "title": payload.title,
                    "body": payload.body,
                    "alertId": payload.alert_id,
                    "stationCode": payload.station_code,
                    "severity": payload.severity.value if payload.severity else None,
                    "url": payload.url or "/inspector",
                }),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims,
            )
            return True

        except WebPushException as e:
            print(f"Push notification failed: {e}")
            if e.response and e.response.status_code == 410:
                # Subscription has expired or been unsubscribed
                return False
            raise

    async def broadcast_alert(self, alert: InspectorAlert) -> int:
        """
        Broadcast an alert notification to all subscribed inspectors.

        Returns the number of successful notifications sent.
        """
        if not self.is_configured:
            print("Warning: VAPID keys not configured. Skipping broadcast.")
            return 0

        # Create notification payload
        severity_emoji = {
            AlertSeverity.LOW: "",
            AlertSeverity.MEDIUM: "",
            AlertSeverity.HIGH: "",
            AlertSeverity.CRITICAL: "",
        }

        emoji = severity_emoji.get(alert.severity, "")

        payload = PushNotificationPayload(
            title=f"{emoji} {alert.severity.value.upper()} Alert: {alert.anomaly_type}",
            body=f"Station {alert.station_code}: {alert.location}",
            alert_id=alert.id,
            station_code=alert.station_code,
            severity=alert.severity,
            url=f"/inspector?alert={alert.id}",
        )

        # Send to all alert subscribers
        subscribers = self.get_subscriptions("alerts")
        success_count = 0
        failed_subs = []

        for sub_record in subscribers:
            try:
                success = await self.send_notification(sub_record.subscription, payload)
                if success:
                    success_count += 1
                else:
                    failed_subs.append(sub_record)
            except Exception as e:
                print(f"Failed to send to subscription: {e}")
                failed_subs.append(sub_record)

        # Clean up failed subscriptions
        for sub_record in failed_subs:
            for sub_id, record in list(self._subscriptions.items()):
                if record.subscription.endpoint == sub_record.subscription.endpoint:
                    del self._subscriptions[sub_id]
                    break

        return success_count

    async def send_test_notification(self, subscription_id: str) -> bool:
        """Send a test notification to a specific subscription."""
        if subscription_id not in self._subscriptions:
            return False

        sub_record = self._subscriptions[subscription_id]
        payload = PushNotificationPayload(
            title="JalRakshak Test Notification",
            body="Push notifications are working correctly!",
            url="/inspector",
        )

        return await self.send_notification(sub_record.subscription, payload)


# Singleton instance
_push_service: Optional[PushService] = None


def get_push_service() -> PushService:
    """Get singleton push service instance."""
    global _push_service
    if _push_service is None:
        _push_service = PushService()
    return _push_service
