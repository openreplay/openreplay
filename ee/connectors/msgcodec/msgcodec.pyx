# Auto-generated, do not edit

from messages import *
#from io cimport BytesIO
from io import BytesIO
import copy
from libc.stdlib cimport abort

cdef extern from "Python.h":
    int PyArg_ParseTupleAndKeywords(object args, object kwargs, char* format, char** keywords, ...)

cdef class PyMsg:
    def __cinit__(self):
        pass

ctypedef object PyBytesIO
cdef unsigned long c_message_id

cdef class MessageCodec:
    """
    Implements encode/decode primitives
    """
    cdef list msg_selector

    def __init__(self, list msg_selector):
        self.msg_selector = msg_selector

    @staticmethod
    cdef read_boolean(PyBytesIO reader):
        cdef bint b
        b = reader.read(1)[0]
        return b == 1

    @staticmethod
    def read_bool_method(PyBytesIO reader):
        return MessageCodec.read_boolean(reader)

    @staticmethod
    cdef read_uint(PyBytesIO reader):
        cdef unsigned long x = 0  # the result
        cdef unsigned int s = 0  # the shift (our result is big-ending)
        cdef int i = 0  # n of byte (max 9 for uint64)
        cdef bytes b
        cdef unsigned long num

        while True:
            b = reader.read(1)
            if len(b) == 0:
                raise IndexError('bytes out of range')

            num = int.from_bytes(b, "big", signed=False)

            if num < 0x80:
                if i > 9 or (i == 9 and num > 1):
                    raise OverflowError()
                return int(x | num << s)
            x |= (num & 0x7f) << s
            s += 7
            i += 1

    @staticmethod
    def read_size(PyBytesIO reader):
        cdef unsigned long size = 0
        cdef bytes b
        cdef unsigned long num
        for i in range(3):
            b = reader.read(1)
            num = int.from_bytes(b, "big", signed=False)
            size += num << (8*i)
        return size


    @staticmethod
    def read_int(PyBytesIO reader):
        """
        ux, err := ReadUint(reader)
        x := int64(ux >> 1)
        if err != nil {
            return x, err
        }
        if ux&1 != 0 {
            x = ^x
        }
        return x, err
        """
        cdef unsigned long ux = MessageCodec.read_uint(reader)
        cdef long x = int(ux >> 1)

        if ux & 1 != 0:
            x = - x - 1
        return x

    @staticmethod
    def read_string(PyBytesIO reader):
        cdef unsigned long length = MessageCodec.read_uint(reader)
        cdef bytes s
        try:
            s = reader.read(length)
        except Exception as e:
            print(f'Error while reading string of length {length}')
            raise Exception(e)
        try:
            return s.decode("utf-8", errors="replace").replace("\x00", "\uFFFD")
        except UnicodeDecodeError:
            return None

    @staticmethod
    def read_message_id(PyBytesIO reader):
        """
        Read and return the first byte where the message id is encoded
        """
        cdef unsigned long id_ = MessageCodec.read_uint(reader)
        return id_

    @staticmethod
    def encode(PyMsg m):
        ...

    @staticmethod
    def decode(bytes b):
        cdef PyBytesIO reader = BytesIO(b)
        return MessageCodec.read_head_message(reader)

    @staticmethod
    def check_message_id(bytes b):
        """
        todo: make it static and without reader. It's just the first byte
        Read and return the first byte where the message id is encoded
        """
        cdef PyBytesIO reader = BytesIO(b)
        cdef unsigned long id_ = MessageCodec.read_uint(reader)

        return id_

    @staticmethod
    def decode_key(bytes b):
        """
        Decode the message key (encoded with little endian)
        """
        cdef unsigned long decoded
        try:
            decoded = int.from_bytes(b, "little", signed=False)
        except Exception as e:
            print(f"Error while decoding message key (SessionID) from {b}")
            raise e
        return decoded

    def decode_detailed(self, bytes b):
        global c_message_id
        cdef PyBytesIO reader = BytesIO(b)
        cdef list messages_list
        cdef int mode
        try:
            messages_list = [self.handler(reader, 0)]
        except IndexError:
            print(f'[WARN] Broken batch')
            return list()
        if isinstance(messages_list[0], BatchMeta):
            # Old BatchMeta
            mode = 0
        elif isinstance(messages_list[0], BatchMetadata):
            # New BatchMeta
            if messages_list[0].version == 0:
                mode = 0
            else:
                mode = 1
        else:
            # print(f'{messages_list[0].__id__}')
            return messages_list
        while True:
            try:
                msg_decoded = self.handler(reader, mode)
                if msg_decoded is not None:
                    messages_list.append(msg_decoded)
            except IndexError:
                break
        return messages_list

    def handler(self, PyBytesIO reader, int mode = 0):
        global c_message_id
        cdef unsigned long message_id = MessageCodec.read_message_id(reader)
        c_message_id = message_id
        cdef int r_size
        try:
            if mode == 1:
                # We read the three bytes representing the length of message. It can be used to skip unwanted messages
                r_size = MessageCodec.read_size(reader)
                if message_id not in self.msg_selector:
                    reader.read(r_size)
                    return None
                return MessageCodec.read_head_message(reader, message_id)
            elif mode == 0:
                # Old format with no bytes for message length
                return MessageCodec.read_head_message(reader, message_id)
            else:
                raise IOError()
        except Exception as e:
            print(f'[Error-inside] Broken message id {message_id}')
            return None

    @staticmethod
    def read_head_message(PyBytesIO reader, unsigned long message_id):

        if message_id == 0:
            return Timestamp(
                timestamp=MessageCodec.read_uint(reader)
            )

        if message_id == 1:
            return SessionStart(
                timestamp=MessageCodec.read_uint(reader),
                project_id=MessageCodec.read_uint(reader),
                tracker_version=MessageCodec.read_string(reader),
                rev_id=MessageCodec.read_string(reader),
                user_uuid=MessageCodec.read_string(reader),
                user_agent=MessageCodec.read_string(reader),
                user_os=MessageCodec.read_string(reader),
                user_os_version=MessageCodec.read_string(reader),
                user_browser=MessageCodec.read_string(reader),
                user_browser_version=MessageCodec.read_string(reader),
                user_device=MessageCodec.read_string(reader),
                user_device_type=MessageCodec.read_string(reader),
                user_device_memory_size=MessageCodec.read_uint(reader),
                user_device_heap_size=MessageCodec.read_uint(reader),
                user_country=MessageCodec.read_string(reader),
                user_id=MessageCodec.read_string(reader)
            )

        if message_id == 3:
            return SessionEndDeprecated(
                timestamp=MessageCodec.read_uint(reader)
            )

        if message_id == 4:
            return SetPageLocation(
                url=MessageCodec.read_string(reader),
                referrer=MessageCodec.read_string(reader),
                navigation_start=MessageCodec.read_uint(reader)
            )

        if message_id == 5:
            return SetViewportSize(
                width=MessageCodec.read_uint(reader),
                height=MessageCodec.read_uint(reader)
            )

        if message_id == 6:
            return SetViewportScroll(
                x=MessageCodec.read_int(reader),
                y=MessageCodec.read_int(reader)
            )

        if message_id == 7:
            return CreateDocument(
                
            )

        if message_id == 8:
            return CreateElementNode(
                id=MessageCodec.read_uint(reader),
                parent_id=MessageCodec.read_uint(reader),
                index=MessageCodec.read_uint(reader),
                tag=MessageCodec.read_string(reader),
                svg=MessageCodec.read_boolean(reader)
            )

        if message_id == 9:
            return CreateTextNode(
                id=MessageCodec.read_uint(reader),
                parent_id=MessageCodec.read_uint(reader),
                index=MessageCodec.read_uint(reader)
            )

        if message_id == 10:
            return MoveNode(
                id=MessageCodec.read_uint(reader),
                parent_id=MessageCodec.read_uint(reader),
                index=MessageCodec.read_uint(reader)
            )

        if message_id == 11:
            return RemoveNode(
                id=MessageCodec.read_uint(reader)
            )

        if message_id == 12:
            return SetNodeAttribute(
                id=MessageCodec.read_uint(reader),
                name=MessageCodec.read_string(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 13:
            return RemoveNodeAttribute(
                id=MessageCodec.read_uint(reader),
                name=MessageCodec.read_string(reader)
            )

        if message_id == 14:
            return SetNodeData(
                id=MessageCodec.read_uint(reader),
                data=MessageCodec.read_string(reader)
            )

        if message_id == 15:
            return SetCSSData(
                id=MessageCodec.read_uint(reader),
                data=MessageCodec.read_string(reader)
            )

        if message_id == 16:
            return SetNodeScroll(
                id=MessageCodec.read_uint(reader),
                x=MessageCodec.read_int(reader),
                y=MessageCodec.read_int(reader)
            )

        if message_id == 17:
            return SetInputTarget(
                id=MessageCodec.read_uint(reader),
                label=MessageCodec.read_string(reader)
            )

        if message_id == 18:
            return SetInputValue(
                id=MessageCodec.read_uint(reader),
                value=MessageCodec.read_string(reader),
                mask=MessageCodec.read_int(reader)
            )

        if message_id == 19:
            return SetInputChecked(
                id=MessageCodec.read_uint(reader),
                checked=MessageCodec.read_boolean(reader)
            )

        if message_id == 20:
            return MouseMove(
                x=MessageCodec.read_uint(reader),
                y=MessageCodec.read_uint(reader)
            )

        if message_id == 21:
            return NetworkRequest(
                type=MessageCodec.read_string(reader),
                method=MessageCodec.read_string(reader),
                url=MessageCodec.read_string(reader),
                request=MessageCodec.read_string(reader),
                response=MessageCodec.read_string(reader),
                status=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_uint(reader),
                duration=MessageCodec.read_uint(reader)
            )

        if message_id == 22:
            return ConsoleLog(
                level=MessageCodec.read_string(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 23:
            return PageLoadTiming(
                request_start=MessageCodec.read_uint(reader),
                response_start=MessageCodec.read_uint(reader),
                response_end=MessageCodec.read_uint(reader),
                dom_content_loaded_event_start=MessageCodec.read_uint(reader),
                dom_content_loaded_event_end=MessageCodec.read_uint(reader),
                load_event_start=MessageCodec.read_uint(reader),
                load_event_end=MessageCodec.read_uint(reader),
                first_paint=MessageCodec.read_uint(reader),
                first_contentful_paint=MessageCodec.read_uint(reader)
            )

        if message_id == 24:
            return PageRenderTiming(
                speed_index=MessageCodec.read_uint(reader),
                visually_complete=MessageCodec.read_uint(reader),
                time_to_interactive=MessageCodec.read_uint(reader)
            )

        if message_id == 25:
            return JSExceptionDeprecated(
                name=MessageCodec.read_string(reader),
                message=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

        if message_id == 26:
            return IntegrationEvent(
                timestamp=MessageCodec.read_uint(reader),
                source=MessageCodec.read_string(reader),
                name=MessageCodec.read_string(reader),
                message=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

        if message_id == 27:
            return CustomEvent(
                name=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

        if message_id == 28:
            return UserID(
                id=MessageCodec.read_string(reader)
            )

        if message_id == 29:
            return UserAnonymousID(
                id=MessageCodec.read_string(reader)
            )

        if message_id == 30:
            return Metadata(
                key=MessageCodec.read_string(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 31:
            return PageEvent(
                message_id=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_uint(reader),
                url=MessageCodec.read_string(reader),
                referrer=MessageCodec.read_string(reader),
                loaded=MessageCodec.read_boolean(reader),
                request_start=MessageCodec.read_uint(reader),
                response_start=MessageCodec.read_uint(reader),
                response_end=MessageCodec.read_uint(reader),
                dom_content_loaded_event_start=MessageCodec.read_uint(reader),
                dom_content_loaded_event_end=MessageCodec.read_uint(reader),
                load_event_start=MessageCodec.read_uint(reader),
                load_event_end=MessageCodec.read_uint(reader),
                first_paint=MessageCodec.read_uint(reader),
                first_contentful_paint=MessageCodec.read_uint(reader),
                speed_index=MessageCodec.read_uint(reader),
                visually_complete=MessageCodec.read_uint(reader),
                time_to_interactive=MessageCodec.read_uint(reader)
            )

        if message_id == 32:
            return InputEvent(
                message_id=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_uint(reader),
                value=MessageCodec.read_string(reader),
                value_masked=MessageCodec.read_boolean(reader),
                label=MessageCodec.read_string(reader)
            )

        if message_id == 37:
            return CSSInsertRule(
                id=MessageCodec.read_uint(reader),
                rule=MessageCodec.read_string(reader),
                index=MessageCodec.read_uint(reader)
            )

        if message_id == 38:
            return CSSDeleteRule(
                id=MessageCodec.read_uint(reader),
                index=MessageCodec.read_uint(reader)
            )

        if message_id == 39:
            return Fetch(
                method=MessageCodec.read_string(reader),
                url=MessageCodec.read_string(reader),
                request=MessageCodec.read_string(reader),
                response=MessageCodec.read_string(reader),
                status=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_uint(reader),
                duration=MessageCodec.read_uint(reader)
            )

        if message_id == 40:
            return Profiler(
                name=MessageCodec.read_string(reader),
                duration=MessageCodec.read_uint(reader),
                args=MessageCodec.read_string(reader),
                result=MessageCodec.read_string(reader)
            )

        if message_id == 41:
            return OTable(
                key=MessageCodec.read_string(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 42:
            return StateAction(
                type=MessageCodec.read_string(reader)
            )

        if message_id == 44:
            return Redux(
                action=MessageCodec.read_string(reader),
                state=MessageCodec.read_string(reader),
                duration=MessageCodec.read_uint(reader)
            )

        if message_id == 45:
            return Vuex(
                mutation=MessageCodec.read_string(reader),
                state=MessageCodec.read_string(reader)
            )

        if message_id == 46:
            return MobX(
                type=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

        if message_id == 47:
            return NgRx(
                action=MessageCodec.read_string(reader),
                state=MessageCodec.read_string(reader),
                duration=MessageCodec.read_uint(reader)
            )

        if message_id == 48:
            return GraphQL(
                operation_kind=MessageCodec.read_string(reader),
                operation_name=MessageCodec.read_string(reader),
                variables=MessageCodec.read_string(reader),
                response=MessageCodec.read_string(reader)
            )

        if message_id == 49:
            return PerformanceTrack(
                frames=MessageCodec.read_int(reader),
                ticks=MessageCodec.read_int(reader),
                total_js_heap_size=MessageCodec.read_uint(reader),
                used_js_heap_size=MessageCodec.read_uint(reader)
            )

        if message_id == 50:
            return StringDict(
                key=MessageCodec.read_uint(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 51:
            return SetNodeAttributeDict(
                id=MessageCodec.read_uint(reader),
                name_key=MessageCodec.read_uint(reader),
                value_key=MessageCodec.read_uint(reader)
            )

        if message_id == 53:
            return ResourceTimingDeprecated(
                timestamp=MessageCodec.read_uint(reader),
                duration=MessageCodec.read_uint(reader),
                ttfb=MessageCodec.read_uint(reader),
                header_size=MessageCodec.read_uint(reader),
                encoded_body_size=MessageCodec.read_uint(reader),
                decoded_body_size=MessageCodec.read_uint(reader),
                url=MessageCodec.read_string(reader),
                initiator=MessageCodec.read_string(reader)
            )

        if message_id == 54:
            return ConnectionInformation(
                downlink=MessageCodec.read_uint(reader),
                type=MessageCodec.read_string(reader)
            )

        if message_id == 55:
            return SetPageVisibility(
                hidden=MessageCodec.read_boolean(reader)
            )

        if message_id == 56:
            return PerformanceTrackAggr(
                timestamp_start=MessageCodec.read_uint(reader),
                timestamp_end=MessageCodec.read_uint(reader),
                min_fps=MessageCodec.read_uint(reader),
                avg_fps=MessageCodec.read_uint(reader),
                max_fps=MessageCodec.read_uint(reader),
                min_cpu=MessageCodec.read_uint(reader),
                avg_cpu=MessageCodec.read_uint(reader),
                max_cpu=MessageCodec.read_uint(reader),
                min_total_js_heap_size=MessageCodec.read_uint(reader),
                avg_total_js_heap_size=MessageCodec.read_uint(reader),
                max_total_js_heap_size=MessageCodec.read_uint(reader),
                min_used_js_heap_size=MessageCodec.read_uint(reader),
                avg_used_js_heap_size=MessageCodec.read_uint(reader),
                max_used_js_heap_size=MessageCodec.read_uint(reader)
            )

        if message_id == 57:
            return LoadFontFace(
                parent_id=MessageCodec.read_uint(reader),
                family=MessageCodec.read_string(reader),
                source=MessageCodec.read_string(reader),
                descriptors=MessageCodec.read_string(reader)
            )

        if message_id == 58:
            return SetNodeFocus(
                id=MessageCodec.read_int(reader)
            )

        if message_id == 59:
            return LongTask(
                timestamp=MessageCodec.read_uint(reader),
                duration=MessageCodec.read_uint(reader),
                context=MessageCodec.read_uint(reader),
                container_type=MessageCodec.read_uint(reader),
                container_src=MessageCodec.read_string(reader),
                container_id=MessageCodec.read_string(reader),
                container_name=MessageCodec.read_string(reader)
            )

        if message_id == 60:
            return SetNodeAttributeURLBased(
                id=MessageCodec.read_uint(reader),
                name=MessageCodec.read_string(reader),
                value=MessageCodec.read_string(reader),
                base_url=MessageCodec.read_string(reader)
            )

        if message_id == 61:
            return SetCSSDataURLBased(
                id=MessageCodec.read_uint(reader),
                data=MessageCodec.read_string(reader),
                base_url=MessageCodec.read_string(reader)
            )

        if message_id == 62:
            return IssueEventDeprecated(
                message_id=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_uint(reader),
                type=MessageCodec.read_string(reader),
                context_string=MessageCodec.read_string(reader),
                context=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

        if message_id == 63:
            return TechnicalInfo(
                type=MessageCodec.read_string(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 64:
            return CustomIssue(
                name=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

        if message_id == 66:
            return AssetCache(
                url=MessageCodec.read_string(reader)
            )

        if message_id == 67:
            return CSSInsertRuleURLBased(
                id=MessageCodec.read_uint(reader),
                rule=MessageCodec.read_string(reader),
                index=MessageCodec.read_uint(reader),
                base_url=MessageCodec.read_string(reader)
            )

        if message_id == 69:
            return MouseClick(
                id=MessageCodec.read_uint(reader),
                hesitation_time=MessageCodec.read_uint(reader),
                label=MessageCodec.read_string(reader),
                selector=MessageCodec.read_string(reader)
            )

        if message_id == 70:
            return CreateIFrameDocument(
                frame_id=MessageCodec.read_uint(reader),
                id=MessageCodec.read_uint(reader)
            )

        if message_id == 71:
            return AdoptedSSReplaceURLBased(
                sheet_id=MessageCodec.read_uint(reader),
                text=MessageCodec.read_string(reader),
                base_url=MessageCodec.read_string(reader)
            )

        if message_id == 72:
            return AdoptedSSReplace(
                sheet_id=MessageCodec.read_uint(reader),
                text=MessageCodec.read_string(reader)
            )

        if message_id == 73:
            return AdoptedSSInsertRuleURLBased(
                sheet_id=MessageCodec.read_uint(reader),
                rule=MessageCodec.read_string(reader),
                index=MessageCodec.read_uint(reader),
                base_url=MessageCodec.read_string(reader)
            )

        if message_id == 74:
            return AdoptedSSInsertRule(
                sheet_id=MessageCodec.read_uint(reader),
                rule=MessageCodec.read_string(reader),
                index=MessageCodec.read_uint(reader)
            )

        if message_id == 75:
            return AdoptedSSDeleteRule(
                sheet_id=MessageCodec.read_uint(reader),
                index=MessageCodec.read_uint(reader)
            )

        if message_id == 76:
            return AdoptedSSAddOwner(
                sheet_id=MessageCodec.read_uint(reader),
                id=MessageCodec.read_uint(reader)
            )

        if message_id == 77:
            return AdoptedSSRemoveOwner(
                sheet_id=MessageCodec.read_uint(reader),
                id=MessageCodec.read_uint(reader)
            )

        if message_id == 78:
            return JSException(
                name=MessageCodec.read_string(reader),
                message=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader),
                metadata=MessageCodec.read_string(reader)
            )

        if message_id == 79:
            return Zustand(
                mutation=MessageCodec.read_string(reader),
                state=MessageCodec.read_string(reader)
            )

        if message_id == 80:
            return BatchMeta(
                page_no=MessageCodec.read_uint(reader),
                first_index=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_int(reader)
            )

        if message_id == 81:
            return BatchMetadata(
                version=MessageCodec.read_uint(reader),
                page_no=MessageCodec.read_uint(reader),
                first_index=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_int(reader),
                location=MessageCodec.read_string(reader)
            )

        if message_id == 82:
            return PartitionedMessage(
                part_no=MessageCodec.read_uint(reader),
                part_total=MessageCodec.read_uint(reader)
            )

        if message_id == 112:
            return InputChange(
                id=MessageCodec.read_uint(reader),
                value=MessageCodec.read_string(reader),
                value_masked=MessageCodec.read_boolean(reader),
                label=MessageCodec.read_string(reader),
                hesitation_time=MessageCodec.read_int(reader),
                input_duration=MessageCodec.read_int(reader)
            )

        if message_id == 113:
            return SelectionChange(
                selection_start=MessageCodec.read_uint(reader),
                selection_end=MessageCodec.read_uint(reader),
                selection=MessageCodec.read_string(reader)
            )

        if message_id == 114:
            return MouseThrashing(
                timestamp=MessageCodec.read_uint(reader)
            )

        if message_id == 115:
            return UnbindNodes(
                total_removed_percent=MessageCodec.read_uint(reader)
            )

        if message_id == 116:
            return ResourceTiming(
                timestamp=MessageCodec.read_uint(reader),
                duration=MessageCodec.read_uint(reader),
                ttfb=MessageCodec.read_uint(reader),
                header_size=MessageCodec.read_uint(reader),
                encoded_body_size=MessageCodec.read_uint(reader),
                decoded_body_size=MessageCodec.read_uint(reader),
                url=MessageCodec.read_string(reader),
                initiator=MessageCodec.read_string(reader),
                transferred_size=MessageCodec.read_uint(reader),
                cached=MessageCodec.read_boolean(reader)
            )

        if message_id == 125:
            return IssueEvent(
                message_id=MessageCodec.read_uint(reader),
                timestamp=MessageCodec.read_uint(reader),
                type=MessageCodec.read_string(reader),
                context_string=MessageCodec.read_string(reader),
                context=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader),
                url=MessageCodec.read_string(reader)
            )

        if message_id == 126:
            return SessionEnd(
                timestamp=MessageCodec.read_uint(reader),
                encryption_key=MessageCodec.read_string(reader)
            )

        if message_id == 127:
            return SessionSearch(
                timestamp=MessageCodec.read_uint(reader),
                partition=MessageCodec.read_uint(reader)
            )

        if message_id == 107:
            return IOSBatchMeta(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                first_index=MessageCodec.read_uint(reader)
            )

        if message_id == 90:
            return IOSSessionStart(
                timestamp=MessageCodec.read_uint(reader),
                project_id=MessageCodec.read_uint(reader),
                tracker_version=MessageCodec.read_string(reader),
                rev_id=MessageCodec.read_string(reader),
                user_uuid=MessageCodec.read_string(reader),
                user_os=MessageCodec.read_string(reader),
                user_os_version=MessageCodec.read_string(reader),
                user_device=MessageCodec.read_string(reader),
                user_device_type=MessageCodec.read_string(reader),
                user_country=MessageCodec.read_string(reader)
            )

        if message_id == 91:
            return IOSSessionEnd(
                timestamp=MessageCodec.read_uint(reader)
            )

        if message_id == 92:
            return IOSMetadata(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                key=MessageCodec.read_string(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 93:
            return IOSCustomEvent(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                name=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

        if message_id == 94:
            return IOSUserID(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 95:
            return IOSUserAnonymousID(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                value=MessageCodec.read_string(reader)
            )

        if message_id == 96:
            return IOSScreenChanges(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                x=MessageCodec.read_uint(reader),
                y=MessageCodec.read_uint(reader),
                width=MessageCodec.read_uint(reader),
                height=MessageCodec.read_uint(reader)
            )

        if message_id == 97:
            return IOSCrash(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                name=MessageCodec.read_string(reader),
                reason=MessageCodec.read_string(reader),
                stacktrace=MessageCodec.read_string(reader)
            )

        if message_id == 98:
            return IOSScreenEnter(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                title=MessageCodec.read_string(reader),
                view_name=MessageCodec.read_string(reader)
            )

        if message_id == 99:
            return IOSScreenLeave(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                title=MessageCodec.read_string(reader),
                view_name=MessageCodec.read_string(reader)
            )

        if message_id == 100:
            return IOSClickEvent(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                label=MessageCodec.read_string(reader),
                x=MessageCodec.read_uint(reader),
                y=MessageCodec.read_uint(reader)
            )

        if message_id == 101:
            return IOSInputEvent(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                value=MessageCodec.read_string(reader),
                value_masked=MessageCodec.read_boolean(reader),
                label=MessageCodec.read_string(reader)
            )

        if message_id == 102:
            return IOSPerformanceEvent(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                name=MessageCodec.read_string(reader),
                value=MessageCodec.read_uint(reader)
            )

        if message_id == 103:
            return IOSLog(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                severity=MessageCodec.read_string(reader),
                content=MessageCodec.read_string(reader)
            )

        if message_id == 104:
            return IOSInternalError(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                content=MessageCodec.read_string(reader)
            )

        if message_id == 105:
            return IOSNetworkCall(
                timestamp=MessageCodec.read_uint(reader),
                length=MessageCodec.read_uint(reader),
                duration=MessageCodec.read_uint(reader),
                headers=MessageCodec.read_string(reader),
                body=MessageCodec.read_string(reader),
                url=MessageCodec.read_string(reader),
                success=MessageCodec.read_boolean(reader),
                method=MessageCodec.read_string(reader),
                status=MessageCodec.read_uint(reader)
            )

        if message_id == 110:
            return IOSPerformanceAggregated(
                timestamp_start=MessageCodec.read_uint(reader),
                timestamp_end=MessageCodec.read_uint(reader),
                min_fps=MessageCodec.read_uint(reader),
                avg_fps=MessageCodec.read_uint(reader),
                max_fps=MessageCodec.read_uint(reader),
                min_cpu=MessageCodec.read_uint(reader),
                avg_cpu=MessageCodec.read_uint(reader),
                max_cpu=MessageCodec.read_uint(reader),
                min_memory=MessageCodec.read_uint(reader),
                avg_memory=MessageCodec.read_uint(reader),
                max_memory=MessageCodec.read_uint(reader),
                min_battery=MessageCodec.read_uint(reader),
                avg_battery=MessageCodec.read_uint(reader),
                max_battery=MessageCodec.read_uint(reader)
            )

        if message_id == 111:
            return IOSIssueEvent(
                timestamp=MessageCodec.read_uint(reader),
                type=MessageCodec.read_string(reader),
                context_string=MessageCodec.read_string(reader),
                context=MessageCodec.read_string(reader),
                payload=MessageCodec.read_string(reader)
            )

