-- Session Videos Table Schema
-- This table stores information about session video export jobs and their status

CREATE TABLE IF NOT EXISTS session_videos (
    video_id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    project_id INTEGER NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    job_id VARCHAR(255),
    file_url TEXT,
    error_message TEXT,
    screenshots INTEGER DEFAULT 0,
    start_offset BIGINT,
    created_at BIGINT NOT NULL,
    modified_at BIGINT NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_videos_session_id ON session_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_session_videos_project_id ON session_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_session_videos_user_id ON session_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_session_videos_status ON session_videos(status);
CREATE INDEX IF NOT EXISTS idx_session_videos_created_at ON session_videos(created_at);

-- Add comments for documentation
COMMENT ON TABLE session_videos IS 'Stores session video export jobs and their completion status';
COMMENT ON COLUMN session_videos.video_id IS 'Unique identifier for the video record';
COMMENT ON COLUMN session_videos.session_id IS 'Session ID from OpenReplay session';
COMMENT ON COLUMN session_videos.project_id IS 'Project ID associated with the session';
COMMENT ON COLUMN session_videos.user_id IS 'User ID who requested the video export';
COMMENT ON COLUMN session_videos.status IS 'Job status: pending, completed, failed';
COMMENT ON COLUMN session_videos.job_id IS 'AWS Batch job ID or similar external job identifier';
COMMENT ON COLUMN session_videos.file_url IS 'S3 or file storage URL where the video is stored';
COMMENT ON COLUMN session_videos.error_message IS 'Error message if job failed';
COMMENT ON COLUMN session_videos.screenshots IS 'Number of screenshots captured in the video';
COMMENT ON COLUMN session_videos.start_offset IS 'Start offset timestamp for the video';
COMMENT ON COLUMN session_videos.created_at IS 'Unix timestamp when record was created';
COMMENT ON COLUMN session_videos.modified_at IS 'Unix timestamp when record was last modified';

-- Add constraints
ALTER TABLE session_videos
ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

ALTER TABLE session_videos
ADD CONSTRAINT chk_screenshots CHECK (screenshots >= 0);

ALTER TABLE session_videos
ADD CONSTRAINT chk_timestamps CHECK (modified_at >= created_at);
