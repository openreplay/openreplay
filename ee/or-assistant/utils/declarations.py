from pydantic import BaseModel
from typing import Optional, List, Union
from enum import Enum


class Events(str, Enum):
    click = 'CLICK'
    location = 'LOCATION'
    input = 'INPUT'
    tap = 'TAP' #iOS
    view = 'VIEW' #iOS
    swipe = 'SWIPE' #iOS

class Issues(str, Enum):
    click_rage = 'click_rage'
    dead_click = 'dead_click'
    bad_request = 'bad_request'
    missing_resource = 'missing_resource'
    memory = 'memory'
    cpu = 'cpu'
    custom = 'custom'
    mouse_thrashing = 'mouse_thrashing'

class EventList(BaseModel):
    data: dict
    eventTypes: Optional[List[Events]] = [Events.click, Events.location]
    issueTypes: Optional[List[Issues]] = [Issues.click_rage, Issues.bad_request]
    filter: Optional[bool] = True
#    context: Optional[str] = ''
    raw: Optional[bool] = True
    limitEvents: Optional[bool] = False
    maxClickEvents: Optional[int] = 10
    maxPageEvents: Optional[int] = 10
#    space
    sessionStartTimestamp: Optional[Union[int, None]] = None
    sessionDuration: Optional[Union[int, None]] = None

