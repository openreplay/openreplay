CREATE TABLE IF NOT EXISTS mlruns.public.llm_data
(
	user_id		TEXT,
	project_id	BIGINT,
	request		TEXT,
	response	TEXT,
	accuracy	BOOL
);

CREATE TABLE IF NOT EXISTS mlruns.public.llm_metrics
(
	load_time		BIGINT,
	sample_time		BIGINT,
	prompt_eval_time	BIGINT,
	eval_time		BIGINT,
	total_time		BIGINT,
	PARAMS			jsonb
);

