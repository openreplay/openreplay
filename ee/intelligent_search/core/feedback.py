from utils.ch_client import ClickHouseClient
from core.llm_api import LLM_Model
from threading import Semaphore
from decouple import config
import logging


FEEDBACK_LLAMA_TABLE_NAME = config('FEEDBACK_LLAMA_TABLE_NAME')

class QnA:
    user_question: str
    llama_response: str
    user_identifier: int
    project_identifier: int
    
    def __init__(self, question: str, answer: str, user_id: int, project_id: int):
        self.user_question = question
        self.llama_response = answer
        self.user_identifier = user_id
        self.project_identifier = project_id

    def __preprocess_value(**args):
        processed = {}
        for k,v in args.values():
            if __annotations__[k] == str:
                v = v.replace("'", "''")
                processed[k] = f"'{v}'"
            else:
                processed[k] = str(v)
        return processed

    def to_sql(self):
        processed = __preproces_value({'user_question': self.user_question,
                           'llama_response': self.llama_response,
                           'user_identifier': self.user_identifier,
                           'project_identifier': self.project_identifier
                           })
        return "({project_id}, {user_id}, {user_question}, {llama_response})".format(processed)


class RequestsQueue:
    __q_n_a_queue: list[QnA] = list()
    queue_current_size = 0

    def __init__(self, size: int = 100, max_wait_time: int = 1):
        self.queue_size = size
        self.max_wait_time = max_wait_time
        self.semaphore = Semaphore(1)

    def add_to_queue(self, question: str, answer: str, user_id: int, project_id: int):
        self.__q_n_a_queue.append(
                QnA(question=question,
                    answer=answer,
                    user_id=user_id,
                    project_id=project_id)
                )
        self.queue_current_size += 1

    def flush_queue(self):
        replace_sql = ', '.join([question_and_answer.to_sql() for question_and_answer in self.__q_n_a_queue])
        query = "INSERT INTO {table_name} (projectId, userId, userQuestion, llamaResponse) VALUES {replace_sql}".format(
                table_name=FEEDBACK_LLAMA_TABLE_NAME,
                replace_sql=replace_sql)

        try:
            with ClickHouseClient() as conn:
                conn.execute(query)
        except Exception as e:
            logging.error(f'[Flush Queue Error] {repr(e)}')

    def start(self, llm_model: LLM_Model):
        ...

    def recurrent_flush(self):
        if self.semaphore.aquire(timeout=10):
            # TODO: Process requests
            self.semaphore.release()
        else:
            raise TimeoutError('LLM model overloaded with requests')

