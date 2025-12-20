"""Push notification API router."""

from fastapi import APIRouter, HTTPException

from ..models.schemas import PushSubscribeRequest, PushSubscription
from ..services.push_service import get_push_service

router = APIRouter(prefix="/push", tags=["Push Notifications"])


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    Get the VAPID public key for client-side subscription.

    The client needs this key to subscribe to push notifications.
    """
    push_service = get_push_service()

    if not push_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured. VAPID keys missing.",
        )

    return {"publicKey": push_service.get_vapid_public_key()}


@router.post("/subscribe")
async def subscribe_to_push(request: PushSubscribeRequest):
    """
    Subscribe to push notifications.

    The client sends their PushSubscription object from the browser's
    Push API, and we store it for sending notifications.
    """
    push_service = get_push_service()

    subscription_id = push_service.subscribe(
        subscription=request.subscription,
        inspector_id=request.inspector_id,
        topics=request.topics,
    )

    return {
        "message": "Successfully subscribed to push notifications",
        "subscriptionId": subscription_id,
        "topics": request.topics,
    }


@router.post("/unsubscribe")
async def unsubscribe_from_push(subscription_id: str):
    """Unsubscribe from push notifications."""
    push_service = get_push_service()

    success = push_service.unsubscribe(subscription_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Subscription {subscription_id} not found",
        )

    return {"message": "Successfully unsubscribed from push notifications"}


@router.post("/test")
async def send_test_notification(subscription_id: str):
    """
    Send a test notification to verify push is working.

    Use the subscription_id returned from the subscribe endpoint.
    """
    push_service = get_push_service()

    if not push_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Push notifications not configured. VAPID keys missing.",
        )

    success = await push_service.send_test_notification(subscription_id)

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to send test notification. Subscription may be invalid.",
        )

    return {"message": "Test notification sent successfully"}


@router.get("/subscriptions")
async def list_subscriptions():
    """List all active push subscriptions (admin endpoint)."""
    push_service = get_push_service()
    subscriptions = push_service.get_subscriptions()

    return {
        "subscriptions": [
            {
                "inspector_id": sub.inspector_id,
                "topics": sub.topics,
                "endpoint_preview": sub.subscription.endpoint[:50] + "...",
            }
            for sub in subscriptions
        ],
        "total": len(subscriptions),
        "configured": push_service.is_configured,
    }


@router.get("/status")
async def get_push_status():
    """Get push notification service status."""
    push_service = get_push_service()

    return {
        "configured": push_service.is_configured,
        "active_subscriptions": len(push_service.get_subscriptions()),
        "alert_subscribers": len(push_service.get_subscriptions("alerts")),
    }
