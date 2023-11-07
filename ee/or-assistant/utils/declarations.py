from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class EventList(BaseModel):
    data: dict
    eventTypes: Optional[List[str]] = ['CLICK', 'LOCATION']
    filter: Optional[bool] = True
    context: Optional[str] = ''

class Events(str, Enum):
    click = 'CLICK'
    location = 'LOCATION'

