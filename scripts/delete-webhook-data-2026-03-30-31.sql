-- One-off cleanup: data received while edge/API pointed at the wrong CMP.
-- Window: 2026-03-30 00:00:00 UTC through end of 2026-03-31 (exclusive 2026-04-01).
--
-- 1) Run the SELECT blocks first and confirm counts.
-- 2) Then run the transaction (BEGIN … COMMIT).
--
-- Timezone: timestamps use UTC. If your DB stores local time, adjust the bounds.

-- ========== PREVIEW (read-only) ==========
SELECT 'edge_reports' AS tbl, COUNT(*) AS n
FROM edge_reports
WHERE "received_at" >= TIMESTAMPTZ '2026-03-30 00:00:00+00'
  AND "received_at" <  TIMESTAMPTZ '2026-04-01 00:00:00+00';

SELECT 'incidents' AS tbl, COUNT(*) AS n
FROM incidents
WHERE "detected_at" >= TIMESTAMPTZ '2026-03-30 00:00:00+00'
  AND "detected_at" <  TIMESTAMPTZ '2026-04-01 00:00:00+00';

-- Optional: narrow to specific rogue edge camera IDs (uncomment and edit)
-- AND "edge_camera_id" IN ('cam-xxx', 'cam-yyy');

-- ========== DELETE (run after preview) ==========
BEGIN;

DELETE FROM edge_reports
WHERE "received_at" >= TIMESTAMPTZ '2026-03-30 00:00:00+00'
  AND "received_at" <  TIMESTAMPTZ '2026-04-01 00:00:00+00';

-- incident_logs + notification_logs CASCADE from incidents
DELETE FROM incidents
WHERE "detected_at" >= TIMESTAMPTZ '2026-03-30 00:00:00+00'
  AND "detected_at" <  TIMESTAMPTZ '2026-04-01 00:00:00+00';

COMMIT;

-- If anything looks wrong after preview, use ROLLBACK; instead of COMMIT.
