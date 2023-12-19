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

class Errors(str, Enum):
    js_exception = 'js_exception'

class EventList(BaseModel):
    data: dict
    eventTypes: Optional[List[Events]] = [Events.click, Events.location]
    issueTypes: Optional[List[Issues]] = [Issues.click_rage, Issues.bad_request]
    errorTypes: Optional[List[Errors]] = [Errors.js_exception]
    sessionStartTimestamp: Optional[Union[int, None]] = None
    sessionDuration: Optional[Union[int, None]] = None

