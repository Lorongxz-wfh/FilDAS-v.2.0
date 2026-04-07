import React from "react";
import echo from "../lib/echo";
import { getAuthUser } from "../lib/auth";
import type { Announcement } from "../services/announcementsApi";

interface UseRealtimeUpdatesOptions {
  onNotification?: (notification: any) => void;
  onAnnouncement?: (announcement: Announcement) => void;
  requestId?: number | null;
  onRequestMessage?: (message: any) => void;
  // Workspace-wide refresh (stats/charts)
  onWorkspaceChange?: (data: { source: string }) => void;
  // Document-specific workflow update
  documentVersionId?: number | null;
  onWorkflowUpdate?: (data: any) => void;
}

export function useRealtimeUpdates({
  onNotification,
  onAnnouncement,
  requestId,
  onRequestMessage,
  onWorkspaceChange,
  documentVersionId,
  onWorkflowUpdate,
}: UseRealtimeUpdatesOptions = {}) {
  const user = getAuthUser();
  const userId = user?.id;

  // ── Stable Refs ───────────────────────────────────────────────────────────
  // We use refs to keep the active listeners stable even if the callback
  // functions provided by components are recreated on every render.
  // This prevents the "Leave -> Join" WebSocket thrashing loop.
  const onNotificationRef = React.useRef(onNotification);
  const onAnnouncementRef = React.useRef(onAnnouncement);
  const onRequestMessageRef = React.useRef(onRequestMessage);
  const onWorkspaceChangeRef = React.useRef(onWorkspaceChange);
  const onWorkflowUpdateRef = React.useRef(onWorkflowUpdate);

  React.useEffect(() => { onNotificationRef.current = onNotification; }, [onNotification]);
  React.useEffect(() => { onAnnouncementRef.current = onAnnouncement; }, [onAnnouncement]);
  React.useEffect(() => { onRequestMessageRef.current = onRequestMessage; }, [onRequestMessage]);
  React.useEffect(() => { onWorkspaceChangeRef.current = onWorkspaceChange; }, [onWorkspaceChange]);
  React.useEffect(() => { onWorkflowUpdateRef.current = onWorkflowUpdate; }, [onWorkflowUpdate]);

  // ── Private user channel — notifications ──────────────────────────────
  React.useEffect(() => {
    if (!userId) return;

    const channel = echo.private(`user.${userId}`);

    // We check the ref inside the listener so the effect itself doesn't
    // need to re-run (and re-auth) when the function reference changes.
    channel.listen(".notification.created", (data: any) => {
      if (onNotificationRef.current) {
        onNotificationRef.current(data);
        // Also fire the existing polling event so NotificationBell updates
        window.dispatchEvent(new Event("notifications:refresh"));
      }
    });

    channel.listen(".workflow.updated", (data: any) => {
      if (onWorkflowUpdateRef.current) {
        onWorkflowUpdateRef.current(data);
      }
    });

    return () => {
      echo.leave(`user.${userId}`);
    };
  }, [userId]); // Stable deps

  // ── Presence announcements channel ────────────────────────────────────
  const announcementBuffer = React.useRef<Announcement[]>([]);
  const announcementTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const processAnnouncementBuffer = React.useCallback(() => {
    if (!onAnnouncementRef.current || announcementBuffer.current.length === 0) return;

    const items = [...announcementBuffer.current];
    announcementBuffer.current = [];
    announcementTimeout.current = null;

    // Staggered delivery: 20ms delay between each item for a "waterfall" effect
    items.forEach((ann, index) => {
      setTimeout(() => {
        if (onAnnouncementRef.current) onAnnouncementRef.current(ann);
      }, index * 20);
    });
  }, []); // Stable dep

  React.useEffect(() => {
    // Note: Since we want to join the channel based on whether a callback exists,
    // we still listen to the presence of 'onAnnouncement' to establish connection,
    // but the inner logic remains stable.
    if (!onAnnouncement) return;

    const channel = echo.join("announcements");
    channel.listen(".announcement.created", (data: Announcement) => {
      announcementBuffer.current.push(data);
      
      // If we already have a timeout, we are buffering
      if (announcementTimeout.current) return;

      // Start a 100ms throttle window
      announcementTimeout.current = setTimeout(processAnnouncementBuffer, 100);
    });

    return () => {
      if (announcementTimeout.current) clearTimeout(announcementTimeout.current);
      echo.leave("announcements");
    };
  }, [!!onAnnouncement, processAnnouncementBuffer]);

  // ── Private request channel — messages ────────────────────────────────
  React.useEffect(() => {
    if (!requestId) return;

    const channel = echo.private(`request.${requestId}`);
    channel.listen(".message.posted", (data: any) => {
      if (onRequestMessageRef.current) onRequestMessageRef.current(data);
    });

    return () => {
      if (requestId) echo.leave(`request.${requestId}`);
    };
  }, [requestId]);

  // ── Private workspace channel — stats refresh ────────────────────────
  React.useEffect(() => {
    // Workspace is universal, we join it if we care about change at all
    if (!onWorkspaceChange) return;

    const channel = echo.private("workspace");
    channel.listen(".workspace.changed", (data: any) => {
      if (onWorkspaceChangeRef.current) onWorkspaceChangeRef.current(data);
    });

    return () => {
      echo.leave("workspace");
    };
  }, [!!onWorkspaceChange]);

  // ── Private document channel — workflow flow ─────────────────────────
  React.useEffect(() => {
    if (!documentVersionId) return;

    const channel = echo.private(`document.${documentVersionId}`);
    channel.listen(".workflow.updated", (data: any) => {
      if (onWorkflowUpdateRef.current) onWorkflowUpdateRef.current(data);
    });

    return () => {
      if (documentVersionId) echo.leave(`document.${documentVersionId}`);
    };
  }, [documentVersionId]);
}
