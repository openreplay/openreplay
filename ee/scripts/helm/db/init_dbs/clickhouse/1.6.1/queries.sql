-- Q1
SELECT session_id
-- FROM massive2.events7
-- FROM events_l7d_mv
FROM events_l24h_mv
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;


-- Q1.1
SELECT session_id
FROM massive2.events7
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND user_id = 'uucUZvTpPd'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q1.2
SELECT session_id
FROM
--     massive_split.events_s
--          INNER JOIN massive_split.metadata_s USING (session_id)
events_l24h_mv
    INNER JOIN metadata_l24h_mv USING (session_id)
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND user_id = 'uucUZvTpPd'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q1.2.1
SELECT session_id
FROM
--     massive_split.events_s
--          INNER JOIN massive_split.metadata_s USING (session_id)
-- events_l7d_mv AS events_s
--     INNER JOIN metadata_l7d_mv AS metadata_s USING (session_id)
events_l24h_mv AS events_s
    INNER JOIN metadata_l24h_mv AS metadata_s USING (session_id)
WHERE events_s.project_id = 2460
  AND events_s.datetime >= '2022-04-02 00:00:00'
  AND events_s.datetime <= '2022-04-03 00:00:00'
--   AND events_s.datetime <= '2022-04-10 00:00:00'
--   AND events_s.datetime <= '2022-05-02 00:00:00'
  AND metadata_s.project_id = 2460
  AND metadata_s.datetime >= '2022-04-02 00:00:00'
  AND metadata_s.datetime <= '2022-04-03 00:00:00'
--   AND metadata_s.datetime <= '2022-04-10 00:00:00'
--   AND metadata_s.datetime <= '2022-05-02 00:00:00'
  AND metadata_s.user_id = 'uucUZvTpPd'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q1.3
SELECT session_id
FROM
--     massive_split.events_s
-- events_l7d_mv
events_l24h_mv
    INNER JOIN (SELECT DISTINCT session_id
--                      FROM massive_split.metadata_s
--                 FROM metadata_l7d_mv
                FROM metadata_l24h_mv
                WHERE project_id = 2460
                  AND datetime >= '2022-04-02 00:00:00'
                  AND datetime <= '2022-04-03 00:00:00'
--                   AND datetime <= '2022-04-10 00:00:00'
--                        AND datetime <= '2022-05-02 00:00:00'
                  AND user_id = 'uucUZvTpPd') AS meta USING (session_id)
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q1.4
SELECT session_id
FROM (SELECT DISTINCT session_id
--       FROM massive_split.metadata_s
--       FROM metadata_l7d_mv
      FROM metadata_l24h_mv
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND user_id = 'uucUZvTpPd') AS meta
         --          INNER JOIN massive_split.events_s USING (session_id)
--          INNER JOIN events_l7d_mv USING (session_id)
         INNER JOIN events_l24h_mv USING (session_id)
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q1.5
SELECT session_id
-- FROM massive_split.events_s
-- FROM events_l7d_mv
FROM events_l24h_mv
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND session_id IN (SELECT DISTINCT session_id
--                      FROM massive_split.metadata_s
--                      FROM metadata_l7d_mv
                     FROM metadata_l24h_mv
                     WHERE project_id = 2460
                       AND datetime >= '2022-04-02 00:00:00'
                       AND datetime <= '2022-04-03 00:00:00'
--                        AND datetime <= '2022-04-10 00:00:00'
--                        AND datetime <= '2022-05-02 00:00:00'
                       AND user_id = 'uucUZvTpPd')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q2
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive2.events7
--       FROM events_l7d_mv
      FROM events_l24h_mv
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
         --         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
         )
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q2.1
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
      FROM massive2.events7
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND user_id = 'uucUZvTpPd')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q2.2
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--                INNER JOIN massive_split.metadata_s USING (session_id)
--       FROM events_l7d_mv
--                INNER JOIN metadata_l7d_mv USING (session_id)
      FROM events_l24h_mv
               INNER JOIN metadata_l24h_mv USING (session_id)
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND user_id = 'uucUZvTpPd')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q2.2.1
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--                INNER JOIN massive_split.metadata_s USING (session_id)
--       FROM events_l7d_mv AS events_s
--                INNER JOIN metadata_l7d_mv AS metadata_s USING (session_id)
      FROM events_l24h_mv AS events_s
               INNER JOIN metadata_l24h_mv AS metadata_s USING (session_id)
      WHERE events_s.project_id = 2460
        AND events_s.datetime >= '2022-04-02 00:00:00'
        AND events_s.datetime <= '2022-04-03 00:00:00'
--         AND events_s.datetime <= '2022-04-10 00:00:00'
--         AND events_s.datetime <= '2022-05-02 00:00:00'
        AND metadata_s.project_id = 2460
        AND metadata_s.datetime >= '2022-04-02 00:00:00'
        AND metadata_s.datetime <= '2022-04-03 00:00:00'
--         AND metadata_s.datetime <= '2022-04-10 00:00:00'
--         AND metadata_s.datetime <= '2022-05-02 00:00:00'
        AND user_id = 'uucUZvTpPd')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q2.3
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--       FROM events_l7d_mv
      FROM events_l24h_mv
               INNER JOIN (SELECT DISTINCT session_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
                             AND user_id = 'uucUZvTpPd') AS meta USING (session_id)
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
         --         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
         )
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q2.4
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
      FROM (SELECT DISTINCT session_id
--             FROM massive_split.metadata_s
--             FROM metadata_l7d_mv
            FROM metadata_l24h_mv
            WHERE project_id = 2460
              AND datetime >= '2022-04-02 00:00:00'
              AND datetime <= '2022-04-03 00:00:00'
--               AND datetime <= '2022-04-10 00:00:00'
--               AND datetime <= '2022-05-02 00:00:00'
              AND user_id = 'uucUZvTpPd') AS meta
               --                INNER JOIN massive_split.events_s USING (session_id)
--                INNER JOIN events_l7d_mv USING (session_id)
               INNER JOIN events_l24h_mv USING (session_id)
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
         --         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
         )
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q2.5
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--       FROM events_l7d_mv
      FROM events_l24h_mv
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND session_id IN (SELECT DISTINCT session_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
                             AND user_id = 'uucUZvTpPd'))
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q3
SELECT session_id
-- FROM massive_split.events_s
-- FROM events_l7d_mv
FROM events_l24h_mv
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND (event_type = 'CLICK' OR event_type = 'REQUEST')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q3.1
SELECT session_id
FROM massive2.events7
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND (event_type = 'CLICK' OR event_type = 'REQUEST')
  AND user_id = 'uucUZvTpPd'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q3.2
SELECT session_id
-- FROM massive_split.events_s
--          INNER JOIN massive_split.metadata_s USING (session_id)
-- FROM events_l7d_mv
--          INNER JOIN metadata_l7d_mv USING (session_id)
FROM events_l24h_mv
         INNER JOIN metadata_l24h_mv USING (session_id)
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND (event_type = 'CLICK' OR event_type = 'REQUEST')
  AND user_id = 'uucUZvTpPd'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q3.2.1
SELECT session_id
-- FROM massive_split.events_s
--          INNER JOIN massive_split.metadata_s USING (session_id)
-- FROM events_l7d_mv AS events_s
--          INNER JOIN metadata_l7d_mv AS metadata_s USING (session_id)
FROM events_l24h_mv AS events_s
         INNER JOIN metadata_l24h_mv AS metadata_s USING (session_id)
WHERE events_s.project_id = 2460
  AND events_s.datetime >= '2022-04-02 00:00:00'
  AND events_s.datetime <= '2022-04-03 00:00:00'
--   AND events_s.datetime <= '2022-04-10 00:00:00'
--   AND events_s.datetime <= '2022-05-02 00:00:00'
  AND (events_s.event_type = 'CLICK' OR events_s.event_type = 'REQUEST')
  AND metadata_s.project_id = 2460
  AND metadata_s.datetime >= '2022-04-02 00:00:00'
  AND metadata_s.datetime <= '2022-04-03 00:00:00'
--   AND metadata_s.datetime <= '2022-04-10 00:00:00'
--   AND metadata_s.datetime <= '2022-05-02 00:00:00'
  AND metadata_s.user_id = 'uucUZvTpPd'
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q3.3
SELECT session_id
-- FROM massive_split.events_s
-- FROM events_l7d_mv
FROM events_l24h_mv
         INNER JOIN (SELECT DISTINCT session_id
--                      FROM massive_split.metadata_s
--                      FROM metadata_l7d_mv
                     FROM metadata_l24h_mv
                     WHERE project_id = 2460
                       AND datetime >= '2022-04-02 00:00:00'
                       AND datetime <= '2022-04-03 00:00:00'
--                        AND datetime <= '2022-04-10 00:00:00'
--                        AND datetime <= '2022-05-02 00:00:00'
                       AND user_id = 'uucUZvTpPd') AS meta USING (session_id)
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND (event_type = 'CLICK' OR event_type = 'REQUEST')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q3.4
SELECT session_id
FROM (SELECT DISTINCT session_id
--       FROM massive_split.metadata_s
--       FROM metadata_l7d_mv
      FROM metadata_l24h_mv
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND user_id = 'uucUZvTpPd') AS meta
         --          INNER JOIN massive_split.events_s USING (session_id)
--          INNER JOIN events_l7d_mv USING (session_id)
         INNER JOIN events_l24h_mv USING (session_id)
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND (event_type = 'CLICK' OR event_type = 'REQUEST')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q3.5
SELECT session_id
-- FROM massive_split.events_s
-- FROM events_l7d_mv
FROM events_l24h_mv
WHERE project_id = 2460
  AND datetime >= '2022-04-02 00:00:00'
  AND datetime <= '2022-04-03 00:00:00'
--   AND datetime <= '2022-04-10 00:00:00'
--   AND datetime <= '2022-05-02 00:00:00'
  AND (event_type = 'CLICK' OR event_type = 'REQUEST')
  AND session_id IN (SELECT DISTINCT session_id
--                      FROM massive_split.metadata_s
--                      FROM metadata_l7d_mv
                     FROM metadata_l24h_mv
                     WHERE project_id = 2460
                       AND datetime >= '2022-04-02 00:00:00'
                       AND datetime <= '2022-04-03 00:00:00'
--                        AND datetime <= '2022-04-10 00:00:00'
--                        AND datetime <= '2022-05-02 00:00:00'
                       AND user_id = 'uucUZvTpPd')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                    event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q4
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--       FROM events_l7d_mv
      FROM events_l24h_mv
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND (event_type = 'CLICK' OR event_type = 'REQUEST'))
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q4.1
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
      FROM massive2.events7
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND (event_type = 'CLICK' OR event_type = 'REQUEST')
        AND user_id = 'uucUZvTpPd')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q4.2
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--                INNER JOIN massive_split.metadata_s USING (session_id)
--       FROM events_l7d_mv
--                INNER JOIN metadata_l7d_mv USING (session_id)
      FROM events_l24h_mv
               INNER JOIN metadata_l24h_mv USING (session_id)
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND (event_type = 'CLICK' OR event_type = 'REQUEST')
        AND user_id = 'uucUZvTpPd')
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q4.2.1
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--                INNER JOIN massive_split.metadata_s USING (session_id)
--       FROM events_l7d_mv AS events_s
--                INNER JOIN metadata_l7d_mv AS metadata_s USING (session_id)
      FROM events_l24h_mv AS events_s
               INNER JOIN metadata_l24h_mv AS metadata_s USING (session_id)
      WHERE events_s.project_id = 2460
        AND events_s.datetime >= '2022-04-02 00:00:00'
        AND events_s.datetime <= '2022-04-03 00:00:00'
--         AND events_s.datetime <= '2022-04-10 00:00:00'
--         AND events_s.datetime <= '2022-05-02 00:00:00'
        AND (events_s.event_type = 'CLICK' OR events_s.event_type = 'REQUEST')
        AND metadata_s.user_id = 'uucUZvTpPd'
        AND metadata_s.project_id = 2460
        AND metadata_s.datetime >= '2022-04-02 00:00:00'
        AND metadata_s.datetime <= '2022-04-03 00:00:00'
         --         AND metadata_s.datetime <= '2022-04-10 00:00:00'
--         AND metadata_s.datetime <= '2022-05-02 00:00:00'
         )
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q4.3
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
--       FROM massive_split.events_s
--       FROM events_l7d_mv
      FROM events_l24h_mv
               INNER JOIN (SELECT DISTINCT session_id
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
                             AND user_id = 'uucUZvTpPd') AS meta USING (session_id)
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND (event_type = 'CLICK' OR event_type = 'REQUEST'))
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q4.4
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
      FROM (SELECT DISTINCT session_id
--             FROM massive_split.metadata_s
--             FROM metadata_l7d_mv
            FROM metadata_l24h_mv
            WHERE project_id = 2460
              AND datetime >= '2022-04-02 00:00:00'
              AND datetime <= '2022-04-03 00:00:00'
--               AND datetime <= '2022-04-10 00:00:00'
--               AND datetime <= '2022-05-02 00:00:00'
              AND user_id = 'uucUZvTpPd') AS meta
               --                INNER JOIN massive_split.events_s USING (session_id)
--                INNER JOIN events_l7d_mv USING (session_id)
               INNER JOIN events_l24h_mv USING (session_id)
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND (event_type = 'CLICK' OR event_type = 'REQUEST'))
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- Q4.5
SELECT session_id
FROM (SELECT session_id,
             datetime,
             event_type = 'CLICK' AND label ILIKE '%invoice%'          AS c1,
             event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%' AS c2
      FROM events_l24h_mv
--       FROM events_l7d_mv
--       FROM massive_split.events_s
      WHERE project_id = 2460
        AND datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND datetime <= '2022-04-10 00:00:00'
--         AND datetime <= '2022-05-02 00:00:00'
        AND (event_type = 'CLICK' OR event_type = 'REQUEST')
        AND session_id IN (SELECT DISTINCT session_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
                             AND user_id = 'uucUZvTpPd'))
GROUP BY session_id
HAVING windowFunnel(99999)(datetime, c1, c2) = 2
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id, session_id
      FROM massive2.events7 AS events
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.1
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id, session_id
      FROM massive2.events7 AS events
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
        AND user_id = 'uucUZvTpPd'
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.2
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id,
             session_id
--       FROM massive_split.events_s AS events
--                INNER JOIN massive_split.metadata_s USING (session_id)
--       FROM events_l7d_mv AS events
--                INNER JOIN metadata_l7d_mv AS metadata_s USING (session_id)
      FROM events_l24h_mv AS events
               INNER JOIN metadata_l24h_mv AS metadata_s USING (session_id)
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-03 00:00:00'
--         AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.3
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id,
             session_id
--   FROM massive_split.events_s AS events
--            INNER JOIN massive_split.metadata_s USING (session_id)
--       FROM events_l7d_mv AS events
--                INNER JOIN metadata_l7d_mv AS metadata_s USING (session_id)
      FROM events_l24h_mv AS events
               INNER JOIN metadata_l24h_mv AS metadata_s USING (session_id)
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND datetime <= '2022-04-03 00:00:00'
--         AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
        AND user_id = 'uucUZvTpPd'
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.4
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id,
             session_id
--       FROM massive_split.events_s AS events
--       FROM events_l7d_mv AS events
      FROM events_l24h_mv AS events
               INNER JOIN (SELECT DISTINCT session_id,
                                           user_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
                             AND user_id = 'uucUZvTpPd') AS meta USING (session_id)
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-03 00:00:00'
--         AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.4-A
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id,
             session_id
--       FROM massive_split.events_s AS events
--       FROM events_l7d_mv AS events
      FROM events_l24h_mv AS events
               INNER JOIN (SELECT DISTINCT session_id,
                                           user_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
          --                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
          ) AS meta USING (session_id)
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-03 00:00:00'
--         AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.5
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id, session_id
      FROM (SELECT DISTINCT session_id,
                            user_id
--             FROM massive_split.metadata_s
--             FROM metadata_l7d_mv
            FROM metadata_l24h_mv
            WHERE project_id = 2460
              AND datetime >= '2022-04-02 00:00:00'
              AND datetime <= '2022-04-03 00:00:00'
--               AND datetime <= '2022-04-10 00:00:00'
--               AND datetime <= '2022-05-02 00:00:00'
              AND user_id = 'uucUZvTpPd') AS meta
               --                INNER JOIN massive_split.events_s AS events USING (session_id)
--                INNER JOIN events_l7d_mv AS events USING (session_id)
               INNER JOIN events_l24h_mv AS events USING (session_id)
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-03 00:00:00'
--         AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.6
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id,
             session_id
--       FROM massive_split.events_s AS events
--       FROM events_l7d_mv AS events
      FROM events_l24h_mv AS events
               INNER JOIN (SELECT DISTINCT session_id,
                                           user_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
                             AND user_id = 'uucUZvTpPd') AS meta USING (session_id)
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-03 00:00:00'
--         AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
        AND session_id IN (SELECT DISTINCT session_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
                             AND user_id = 'uucUZvTpPd')
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QU1.6-A
SELECT user_id, COUNT(session_id)
FROM (SELECT user_id,
             session_id
--       FROM massive_split.events_s AS events
--       FROM events_l7d_mv AS events
      FROM events_l24h_mv AS events
               INNER JOIN (SELECT DISTINCT session_id,
                                           user_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
          --                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
          ) AS meta USING (session_id)
      WHERE events.project_id = 2460
        AND events.datetime >= '2022-04-02 00:00:00'
        AND events.datetime <= '2022-04-03 00:00:00'
--         AND events.datetime <= '2022-04-10 00:00:00'
--         AND events.datetime <= '2022-05-02 00:00:00'
        AND session_id IN (SELECT DISTINCT session_id
--                            FROM massive_split.metadata_s
--                            FROM metadata_l7d_mv
                           FROM metadata_l24h_mv
                           WHERE project_id = 2460
                             AND datetime >= '2022-04-02 00:00:00'
                             AND datetime <= '2022-04-03 00:00:00'
--                              AND datetime <= '2022-04-10 00:00:00'
--                              AND datetime <= '2022-05-02 00:00:00'
      )
      GROUP BY user_id, session_id
      HAVING windowFunnel(99999)(datetime, event_type = 'CLICK' AND label ILIKE '%invoice%',
                          event_type = 'REQUEST' AND url ILIKE '%letsdeel.com/pay%') = 2
         ) AS filtred_sessions
GROUP BY user_id
LIMIT 10
SETTINGS
max_threads = 4;

-- QM4:
SELECT timestamp,
       groupArray([toString(t.type), toString(t.count)]) AS types
FROM (SELECT toUnixTimestamp(toStartOfInterval(events7.datetime, INTERVAL 37565 second)) * 1000 AS timestamp,
             events7.type,
             COUNT(events7.session_id)                                                          AS count
--       FROM massive_split.events_s AS events7
--       FROM events_l7d_mv AS events7
      FROM events_l24h_mv AS events7
      WHERE events7.project_id = toUInt32(2460)
        AND toStartOfInterval(events7.datetime, INTERVAL 37565 second) >= '2022-04-02 00:00:00'
        AND events7.datetime <= '2022-04-03 00:00:00'
--         AND events7.datetime <= '2022-04-10 00:00:00'
--         AND events7.datetime < '2022-05-02 00:00:00'
        AND events7.event_type = 'RESOURCE'
      GROUP BY timestamp, events7.type
      ORDER BY timestamp) AS t
GROUP BY timestamp
    SETTINGS
    max_threads = 4;
