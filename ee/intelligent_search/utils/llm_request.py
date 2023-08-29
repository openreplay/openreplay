import requests
from decouple import config
from queue import Queue
from utils.sql_to_filters import filter_sql_where_statement
from utils.contexts import search_context_v2
import logging


def call_llm_endpoint(host, port, url, question, timeout=180, **kwargs):
    # curl --request POST \
    # --url http://localhost:8080/completion \
    # --header "Content-Type: application/json" \
    # --data '{"prompt": "Building a website can be done in 10 simple steps:","n_predict": 128}'
    # TODO: Wait untill response is over
    question_w_context = search_context_v2.format(user_question=question)
    response = requests.post(f"http://{host}:{port}/{url}", json={"prompt": question_w_context, "n_predict": 256}, timeout=timeout, **kwargs).json()
    logging.info(response['content'])
    return response


class LLMResponseProcessing:

    def __init__(self, queue_size, **params):
        self.queue = Queue(queue_size)
        self.host = config('LLM_HOST')
        self.port = config('LLM_PORT')
        self.extra_params = params

    def add_question(self, question):
        self.queue.put(question)

    def send_question_to_llm(self):
        # {"content":"\n1. Define your website's purpose and goals: Determine why you want to build the website, what information you want to share with users, and how you want to engage with them.\n2. Choose a domain name and web hosting provider: Pick a unique and memorable domain name and select a reliable web hosting provider that meets your needs in terms of space, bandwidth, and technical support.\n3. Plan your website's design and layout: Sketch out a rough wireframe of your website to determine the overall structure, layout, and functionality.\n4. Create content for your website:","generation_settings":{"frequency_penalty":0.0,"grammar":"","ignore_eos":false,"logit_bias":[],"mirostat":0,"mirostat_eta":0.10000000149011612,"mirostat_tau":5.0,"model":"models/7B/llama-2-7b-chat.ggmlv3.q8_0.bin","n_ctx":2048,"n_keep":0,"n_predict":128,"n_probs":0,"penalize_nl":true,"presence_penalty":0.0,"repeat_last_n":64,"repeat_penalty":1.100000023841858,"seed":4294967295,"stop":[],"stream":false,"temp":0.800000011920929,"tfs_z":1.0,"top_k":40,"top_p":0.949999988079071,"typical_p":1.0},"model":"models/7B/llama-2-7b-chat.ggmlv3.q8_0.bin","prompt":" Building a website can be done in 10 simple steps:","stop":true,"stopped_eos":false,"stopped_limit":true,"stopped_word":false,"stopping_word":"","timings":{"predicted_ms":26957.898,"predicted_n":127,"predicted_per_second":4.711049800692917,"predicted_per_token_ms":212.26691338582677,"prompt_ms":1684.0330000000001,"prompt_n":14,"prompt_per_second":8.313376281818705,"prompt_per_token_ms":120.28807142857144},"tokens_cached":141,"tokens_evaluated":14,"tokens_predicted":128,"truncated":false}
        # TODO: Save all metrics and save them into DB (included question and answer) (two tables maybe?)
        # TODO: Send request only if llm available to get loads, save for later otherwise 
        if not self.queue.empty():
            question = self.queue.get()
            return filter_sql_where_statement(call_llm_endpoint(self.host, self.port, 'completion', question, **self.extra_params)['content'])
        return {"content": None}

    def send_all(self):
        responses = list()
        while not self.queue.empty():
            responses.append(self.send_question_to_llm())
        return responses
