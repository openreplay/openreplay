-- -- Original Q3
-- WITH ranked_events AS (SELECT *
--                        FROM ranked_events_1736344377403),
--      n1 AS (SELECT event_number_in_session,
--                    event_type,
--                    e_value,
--                    next_type,
--                    next_value,
--                    COUNT(1) AS sessions_count
--             FROM ranked_events
--             WHERE event_number_in_session = 1
--               AND isNotNull(next_value)
--             GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
--             ORDER BY sessions_count DESC
--             LIMIT 8),
--      n2 AS (SELECT *
--             FROM (SELECT re.event_number_in_session AS event_number_in_session,
--                          re.event_type              AS event_type,
--                          re.e_value                 AS e_value,
--                          re.next_type               AS next_type,
--                          re.next_value              AS next_value,
--                          COUNT(1)                   AS sessions_count
--                   FROM n1
--                            INNER JOIN ranked_events AS re
--                                       ON (n1.next_value = re.e_value AND n1.next_type = re.event_type)
--                   WHERE re.event_number_in_session = 2
--                   GROUP BY re.event_number_in_session, re.event_type, re.e_value, re.next_type,
--                            re.next_value) AS sub_level
--             ORDER BY sessions_count DESC
--             LIMIT 8),
--      n3 AS (SELECT *
--             FROM (SELECT re.event_number_in_session AS event_number_in_session,
--                          re.event_type              AS event_type,
--                          re.e_value                 AS e_value,
--                          re.next_type               AS next_type,
--                          re.next_value              AS next_value,
--                          COUNT(1)                   AS sessions_count
--                   FROM n2
--                            INNER JOIN ranked_events AS re
--                                       ON (n2.next_value = re.e_value AND n2.next_type = re.event_type)
--                   WHERE re.event_number_in_session = 3
--                   GROUP BY re.event_number_in_session, re.event_type, re.e_value, re.next_type,
--                            re.next_value) AS sub_level
--             ORDER BY sessions_count DESC
--             LIMIT 8),
--      n4 AS (SELECT *
--             FROM (SELECT re.event_number_in_session AS event_number_in_session,
--                          re.event_type              AS event_type,
--                          re.e_value                 AS e_value,
--                          re.next_type               AS next_type,
--                          re.next_value              AS next_value,
--                          COUNT(1)                   AS sessions_count
--                   FROM n3
--                            INNER JOIN ranked_events AS re
--                                       ON (n3.next_value = re.e_value AND n3.next_type = re.event_type)
--                   WHERE re.event_number_in_session = 4
--                   GROUP BY re.event_number_in_session, re.event_type, re.e_value, re.next_type,
--                            re.next_value) AS sub_level
--             ORDER BY sessions_count DESC
--             LIMIT 8),
--      n5 AS (SELECT *
--             FROM (SELECT re.event_number_in_session AS event_number_in_session,
--                          re.event_type              AS event_type,
--                          re.e_value                 AS e_value,
--                          re.next_type               AS next_type,
--                          re.next_value              AS next_value,
--                          COUNT(1)                   AS sessions_count
--                   FROM n4
--                            INNER JOIN ranked_events AS re
--                                       ON (n4.next_value = re.e_value AND n4.next_type = re.event_type)
--                   WHERE re.event_number_in_session = 5
--                   GROUP BY re.event_number_in_session, re.event_type, re.e_value, re.next_type,
--                            re.next_value) AS sub_level
--             ORDER BY sessions_count DESC
--             LIMIT 8)
-- SELECT *
-- FROM (SELECT event_number_in_session,
--              event_type,
--              e_value,
--              next_type,
--              next_value,
--              sessions_count
--       FROM n1
--       UNION ALL
--       SELECT event_number_in_session,
--              event_type,
--              e_value,
--              next_type,
--              next_value,
--              sessions_count
--       FROM n2
--       UNION ALL
--       SELECT event_number_in_session,
--              event_type,
--              e_value,
--              next_type,
--              next_value,
--              sessions_count
--       FROM n3
--       UNION ALL
--       SELECT event_number_in_session,
--              event_type,
--              e_value,
--              next_type,
--              next_value,
--              sessions_count
--       FROM n4
--       UNION ALL
--       SELECT event_number_in_session,
--              event_type,
--              e_value,
--              next_type,
--              next_value,
--              sessions_count
--       FROM n5) AS chart_steps
-- ORDER BY event_number_in_session;

-- Q1
-- CREATE TEMPORARY TABLE pre_ranked_events_1736344377403 AS
CREATE TABLE pre_ranked_events_1736344377403 ENGINE = Memory AS
    (WITH initial_event AS (SELECT events.session_id, MIN(datetime) AS start_event_timestamp
                            FROM experimental.events AS events
                            WHERE ((event_type = 'LOCATION' AND (url_path = '/en/deployment/')))
                              AND events.project_id = toUInt16(65)
                              AND events.datetime >= toDateTime(1735599600000 / 1000)
                              AND events.datetime < toDateTime(1736290799999 / 1000)
                            GROUP BY 1),
          pre_ranked_events AS (SELECT *
                                FROM (SELECT session_id,
                                             event_type,
                                             datetime,
                                             url_path             AS e_value,
                                             row_number() OVER (PARTITION BY session_id
                                                 ORDER BY datetime ,
                                                     message_id ) AS event_number_in_session
                                      FROM experimental.events AS events
                                               INNER JOIN initial_event ON (events.session_id = initial_event.session_id)
                                      WHERE events.project_id = toUInt16(65)
                                        AND events.datetime >= toDateTime(1735599600000 / 1000)
                                        AND events.datetime < toDateTime(1736290799999 / 1000)
                                        AND (events.event_type = 'LOCATION')
                                        AND events.datetime >= initial_event.start_event_timestamp
                                         ) AS full_ranked_events
                                WHERE event_number_in_session <= 5)
     SELECT *
     FROM pre_ranked_events);
;

SELECT *
FROM pre_ranked_events_1736344377403
WHERE event_number_in_session < 3;



-- ---------Q2-----------
-- CREATE TEMPORARY TABLE ranked_events_1736344377403 AS
DROP TABLE ranked_events_1736344377403;
CREATE TABLE ranked_events_1736344377403 ENGINE = Memory AS
    (WITH pre_ranked_events AS (SELECT *
                                FROM pre_ranked_events_1736344377403),
          start_points AS (SELECT DISTINCT session_id
                           FROM pre_ranked_events
                           WHERE ((event_type = 'LOCATION' AND (e_value = '/en/deployment/')))
                             AND pre_ranked_events.event_number_in_session = 1),
          ranked_events AS (SELECT pre_ranked_events.*,
                                   leadInFrame(e_value)
                                               OVER (PARTITION BY session_id ORDER BY datetime
                                                   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_value,
                                   leadInFrame(toNullable(event_type))
                                               OVER (PARTITION BY session_id ORDER BY datetime
                                                   ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_type
                            FROM start_points
                                     INNER JOIN pre_ranked_events USING (session_id))
     SELECT *
     FROM ranked_events);


-- ranked events
SELECT event_number_in_session,
       event_type,
       e_value,
       next_type,
       next_value,
       COUNT(1) AS sessions_count
FROM ranked_events_1736344377403
WHERE event_number_in_session = 2
--   AND e_value='/en/deployment/deploy-docker/'
--     AND next_value NOT IN ('/en/deployment/','/en/plugins/','/en/using-or/')
--     AND e_value NOT IN ('/en/deployment/deploy-docker/','/en/getting-started/','/en/deployment/deploy-ubuntu/')
  AND isNotNull(next_value)
GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
ORDER BY event_number_in_session, sessions_count DESC;



SELECT event_number_in_session,
       event_type,
       e_value,
       COUNT(1) AS sessions_count
FROM ranked_events_1736344377403
WHERE event_number_in_session = 1
GROUP BY event_number_in_session, event_type, e_value
ORDER BY event_number_in_session, sessions_count DESC;

SELECT COUNT(1) AS sessions_count
FROM ranked_events_1736344377403
WHERE event_number_in_session = 2
  AND isNull(next_value)
;

-- ---------Q3 MORE -----------
WITH ranked_events AS (SELECT *
                       FROM ranked_events_1736344377403),
     n1 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 1
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),
     n2 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 2
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),
     n3 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 3
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),
     drop_n AS (-- STEP 1
         SELECT event_number_in_session,
                event_type,
                e_value,
                'DROP' AS next_type,
                NULL   AS next_value,
                sessions_count
         FROM n1
         WHERE isNull(n1.next_type)
         UNION ALL
         -- STEP 2
         SELECT event_number_in_session,
                event_type,
                e_value,
                'DROP' AS next_type,
                NULL   AS next_value,
                sessions_count
         FROM n2
         WHERE isNull(n2.next_type)),
--      TODO: make this as top_steps, where every step will go to next as top/others
     top_n1 AS (-- STEP 1
         SELECT event_number_in_session,
                event_type,
                e_value,
                next_type,
                next_value,
                sessions_count
         FROM n1
         WHERE isNotNull(next_type)
         ORDER BY sessions_count DESC
         LIMIT 3),
     top_n2 AS (-- STEP 2
         SELECT event_number_in_session,
                event_type,
                e_value,
                next_type,
                next_value,
                sessions_count
         FROM n2
         WHERE (event_type, e_value) IN (SELECT event_type,
                                                e_value
                                         FROM n2
                                         WHERE isNotNull(next_type)
                                         GROUP BY event_type, e_value
                                         ORDER BY SUM(sessions_count) DESC
                                         LIMIT 3)
         ORDER BY sessions_count DESC),
     top_n AS (SELECT *
               FROM top_n1
               UNION ALL
               SELECT *
               FROM top_n2),
     u_top_n AS (SELECT DISTINCT event_number_in_session,
                                 event_type,
                                 e_value
                 FROM top_n),
     others_n AS (
         -- STEP 1
         SELECT event_number_in_session,
                event_type,
                e_value,
                next_type,
                next_value,
                sessions_count
         FROM n1
         WHERE isNotNull(next_type)
         ORDER BY sessions_count DESC
         LIMIT 1000000 OFFSET 3
         UNION ALL
         -- STEP 2
         SELECT event_number_in_session,
                event_type,
                e_value,
                next_type,
                next_value,
                sessions_count
         FROM n2
         WHERE isNotNull(next_type)
--          GROUP BY event_number_in_session, event_type, e_value
         ORDER BY sessions_count DESC
         LIMIT 1000000 OFFSET 3)
SELECT *
FROM (
-- Top
         SELECT *
         FROM top_n
         --          UNION ALL
-- -- Others
--          SELECT event_number_in_session,
--                 event_type,
--                 e_value,
--                 'OTHER' AS next_type,
--                 NULL    AS next_value,
--                 SUM(sessions_count)
--          FROM others_n
--          GROUP BY event_number_in_session, event_type, e_value
--          UNION ALL
-- -- Top go to Drop
--          SELECT drop_n.event_number_in_session,
--                 drop_n.event_type,
--                 drop_n.e_value,
--                 drop_n.next_type,
--                 drop_n.next_value,
--                 drop_n.sessions_count
--          FROM drop_n
--                   INNER JOIN u_top_n ON (drop_n.event_number_in_session = u_top_n.event_number_in_session
--              AND drop_n.event_type = u_top_n.event_type
--              AND drop_n.e_value = u_top_n.e_value)
--          ORDER BY drop_n.event_number_in_session
--          --          --          UNION ALL
-- -- -- Top go to Others
--          SELECT top_n.event_number_in_session,
--                 top_n.event_type,
--                 top_n.e_value,
--                 'OTHER'                   AS next_type,
--                 NULL                      AS next_value,
--                 SUM(top_n.sessions_count) AS sessions_count
--          FROM top_n
--                   LEFT JOIN others_n ON (others_n.event_number_in_session = (top_n.event_number_in_session + 1)
--              AND top_n.next_type = others_n.event_type
--              AND top_n.next_value = others_n.e_value)
--          WHERE others_n.event_number_in_session IS NULL
--            AND top_n.next_type IS NOT NULL
--          GROUP BY event_number_in_session, event_type, e_value
--          UNION ALL
-- -- Others got to Top
--          SELECT others_n.event_number_in_session,
--                 'OTHER'               AS event_type,
--                 NULL                  AS e_value,
--                 others_n.s_next_type  AS next_type,
--                 others_n.s_next_value AS next_value,
--                 SUM(sessions_count)   AS sessions_count
--          FROM others_n
--                   INNER JOIN top_n ON (others_n.event_number_in_session = top_n.event_number_in_session + 1 AND
--                                        others_n.s_next_type = top_n.event_type AND
--                                        others_n.s_next_value = top_n.event_type)
--          GROUP BY others_n.event_number_in_session, next_type, next_value
         --          UNION ALL
--          -- TODO: find if this works or not
-- -- Others got to Others
--          SELECT others_n.event_number_in_session,
--                 'OTHER'             AS event_type,
--                 NULL                AS e_value,
--                 'OTHERS'            AS next_type,
--                 NULL                AS next_value,
--                 SUM(sessions_count) AS sessions_count
--          FROM others_n
--                   LEFT JOIN u_top_n ON ((others_n.event_number_in_session + 1) = u_top_n.event_number_in_session
--              AND others_n.s_next_type = u_top_n.event_type
--              AND others_n.s_next_value = u_top_n.e_value)
--          WHERE u_top_n.event_number_in_session IS NULL
--          GROUP BY others_n.event_number_in_session
         )
ORDER BY event_number_in_session;


-- ---------Q3 TOP ON VALUE ONLY -----------
WITH ranked_events AS (SELECT *
                       FROM ranked_events_1736344377403),
     n1 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 1
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),
     n2 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 2
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),
     n3 AS (SELECT event_number_in_session,
                   event_type,
                   e_value,
                   next_type,
                   next_value,
                   COUNT(1) AS sessions_count
            FROM ranked_events
            WHERE event_number_in_session = 3
            GROUP BY event_number_in_session, event_type, e_value, next_type, next_value
            ORDER BY sessions_count DESC),

     drop_n AS (-- STEP 1
         SELECT event_number_in_session,
                event_type,
                e_value,
                'DROP' AS next_type,
                NULL   AS next_value,
                sessions_count
         FROM n1
         WHERE isNull(n1.next_type)
         UNION ALL
         -- STEP 2
         SELECT event_number_in_session,
                event_type,
                e_value,
                'DROP' AS next_type,
                NULL   AS next_value,
                sessions_count
         FROM n2
         WHERE isNull(n2.next_type)),
     top_n AS (SELECT event_number_in_session,
                      event_type,
                      e_value,
                      SUM(sessions_count) AS sessions_count
               FROM n1
               GROUP BY event_number_in_session, event_type, e_value
               LIMIT 1
               UNION ALL
               -- STEP 2
               SELECT event_number_in_session,
                      event_type,
                      e_value,
                      SUM(sessions_count) AS sessions_count
               FROM n2
               GROUP BY event_number_in_session, event_type, e_value
               ORDER BY sessions_count DESC
               LIMIT 3
               UNION ALL
               -- STEP 3
               SELECT event_number_in_session,
                      event_type,
                      e_value,
                      SUM(sessions_count) AS sessions_count
               FROM n3
               GROUP BY event_number_in_session, event_type, e_value
               ORDER BY sessions_count DESC
               LIMIT 3),
     top_n_with_next AS (SELECT n1.*
                         FROM n1
                         UNION ALL
                         SELECT n2.*
                         FROM n2
                                  INNER JOIN top_n ON (n2.event_number_in_session = top_n.event_number_in_session
                             AND n2.event_type = top_n.event_type
                             AND n2.e_value = top_n.e_value)),
     others_n AS (
         -- STEP 2
         SELECT n2.*
         FROM n2
         WHERE (n2.event_number_in_session, n2.event_type, n2.e_value) NOT IN
               (SELECT event_number_in_session, event_type, e_value
                FROM top_n
                WHERE top_n.event_number_in_session = 2)
         UNION ALL
         -- STEP 3
         SELECT n3.*
         FROM n3
         WHERE (n3.event_number_in_session, n3.event_type, n3.e_value) NOT IN
               (SELECT event_number_in_session, event_type, e_value
                FROM top_n
                WHERE top_n.event_number_in_session = 3))
SELECT *
FROM (
         --          SELECT sum(top_n_with_next.sessions_count)
--          FROM top_n_with_next
--          WHERE event_number_in_session = 1
-- --            AND isNotNull(next_value)
--            AND (next_type, next_value) IN
--                (SELECT others_n.event_type, others_n.e_value FROM others_n WHERE others_n.event_number_in_session = 2)
--            --                   SELECT * FROM others_n
--            --     SELECT * FROM n2
--              SELECT *
--          FROM top_n
--          );
-- Top to Top: valid
         SELECT top_n_with_next.*
         FROM top_n_with_next
                  INNER JOIN top_n
                             ON (top_n_with_next.event_number_in_session + 1 = top_n.event_number_in_session
                                 AND top_n_with_next.next_type = top_n.event_type
                                 AND top_n_with_next.next_value = top_n.e_value)
         UNION ALL
-- Top to Others: valid
         SELECT top_n_with_next.event_number_in_session,
                top_n_with_next.event_type,
                top_n_with_next.e_value,
                'OTHER'                             AS next_type,
                NULL                                AS next_value,
                SUM(top_n_with_next.sessions_count) AS sessions_count
         FROM top_n_with_next
         WHERE (top_n_with_next.event_number_in_session + 1, top_n_with_next.next_type, top_n_with_next.next_value) IN
               (SELECT others_n.event_number_in_session, others_n.event_type, others_n.e_value FROM others_n)
         GROUP BY top_n_with_next.event_number_in_session, top_n_with_next.event_type, top_n_with_next.e_value
         UNION ALL
-- Top go to Drop: valid
         SELECT drop_n.event_number_in_session,
                drop_n.event_type,
                drop_n.e_value,
                drop_n.next_type,
                drop_n.next_value,
                drop_n.sessions_count
         FROM drop_n
                  INNER JOIN top_n ON (drop_n.event_number_in_session = top_n.event_number_in_session
             AND drop_n.event_type = top_n.event_type
             AND drop_n.e_value = top_n.e_value)
         ORDER BY drop_n.event_number_in_session
         UNION ALL
-- Others got to Drop: valid
         SELECT others_n.event_number_in_session,
                'OTHER'                      AS event_type,
                NULL                         AS e_value,
                'DROP'                       AS next_type,
                NULL                         AS next_value,
                SUM(others_n.sessions_count) AS sessions_count
         FROM others_n
         WHERE isNull(others_n.next_type)
           AND others_n.event_number_in_session < 3
         GROUP BY others_n.event_number_in_session, next_type, next_value
         UNION ALL
-- Others got to Top:valid
         SELECT others_n.event_number_in_session,
                'OTHER'                      AS event_type,
                NULL                         AS e_value,
                others_n.next_type,
                others_n.next_value,
                SUM(others_n.sessions_count) AS sessions_count
         FROM others_n
         WHERE isNotNull(others_n.next_type)
           AND (others_n.event_number_in_session + 1, others_n.next_type, others_n.next_value) IN
               (SELECT top_n.event_number_in_session, top_n.event_type, top_n.e_value FROM top_n)
         GROUP BY others_n.event_number_in_session, others_n.next_type, others_n.next_value
         UNION ALL
-- Others got to Others
         SELECT others_n.event_number_in_session,
                'OTHER'             AS event_type,
                NULL                AS e_value,
                'OTHERS'            AS next_type,
                NULL                AS next_value,
                SUM(sessions_count) AS sessions_count
         FROM others_n
         WHERE isNotNull(others_n.next_type)
           AND others_n.event_number_in_session < 3
           AND (others_n.event_number_in_session + 1, others_n.next_type, others_n.next_value) NOT IN
               (SELECT event_number_in_session, event_type, e_value FROM top_n)
         GROUP BY others_n.event_number_in_session)
ORDER BY event_number_in_session, sessions_count
        DESC;


