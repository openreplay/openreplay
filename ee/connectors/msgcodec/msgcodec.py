# Auto-generated, do not edit

from msgcodec.codec import Codec
from msgcodec.messages import *
from typing import List
import io

class MessageCodec(Codec):

    def read_message_id(self, reader: io.BytesIO) -> int:
        """
        Read and return the first byte where the message id is encoded
        """
        id_ = self.read_uint(reader)
        return id_

    def encode(self, m: Message) -> bytes:
        ...

    def decode(self, b: bytes) -> Message:
        reader = io.BytesIO(b)
        return self.read_head_message(reader)

    @staticmethod
    def check_message_id(b: bytes) -> int:
        """
        todo: make it static and without reader. It's just the first byte
        Read and return the first byte where the message id is encoded
        """
        reader = io.BytesIO(b)
        id_ = Codec.read_uint(reader)

        return id_

    @staticmethod
    def decode_key(b) -> int:
        """
        Decode the message key (encoded with little endian)
        """
        try:
            decoded = int.from_bytes(b, "little", signed=False)
        except Exception as e:
            raise UnicodeDecodeError(f"Error while decoding message key (SessionID) from {b}\n{e}")
        return decoded

    def decode_detailed(self, b: bytes) -> List[Message]:
        reader = io.BytesIO(b)
        messages_list = list()
        messages_list.append(self.handler(reader, 0))
        if isinstance(messages_list[0], BatchMeta):
            # Old BatchMeta
            mode = 0
        elif isinstance(messages_list[0], BatchMetadata):
            # New BatchMeta
            mode = 1
        else:
            return messages_list
        while True:
            try:
                messages_list.append(self.handler(reader, mode))
            except IndexError:
                break
        return messages_list

    def handler(self, reader: io.BytesIO, mode=0) -> Message:
        message_id = self.read_message_id(reader)
        if mode == 1:
            # We skip the three bytes representing the length of message. It can be used to skip unwanted messages
            reader.read(3)
            return self.read_head_message(reader, message_id)
        elif mode == 0:
            # Old format with no bytes for message length
            return self.read_head_message(reader, message_id)
        else:
            raise IOError()

    def read_head_message(self, reader: io.BytesIO, message_id) -> Message:

        if message_id == 80:
            return BatchMeta(
                page_no=self.read_uint(reader),
                first_index=self.read_uint(reader),
                timestamp=self.read_int(reader)
            )

        if message_id == 81:
            return BatchMetadata(
                version=self.read_uint(reader),
                page_no=self.read_uint(reader),
                first_index=self.read_uint(reader),
                timestamp=self.read_int(reader),
                location=self.read_string(reader)
            )

        if message_id == 82:
            return PartitionedMessage(
                part_no=self.read_uint(reader),
                part_total=self.read_uint(reader)
            )

        if message_id == 0:
            return Timestamp(
                timestamp=self.read_uint(reader)
            )

        if message_id == 1:
            return SessionStart(
                timestamp=self.read_uint(reader),
                project_id=self.read_uint(reader),
                tracker_version=self.read_string(reader),
                rev_id=self.read_string(reader),
                user_uuid=self.read_string(reader),
                user_agent=self.read_string(reader),
                user_os=self.read_string(reader),
                user_os_version=self.read_string(reader),
                user_browser=self.read_string(reader),
                user_browser_version=self.read_string(reader),
                user_device=self.read_string(reader),
                user_device_type=self.read_string(reader),
                user_device_memory_size=self.read_uint(reader),
                user_device_heap_size=self.read_uint(reader),
                user_country=self.read_string(reader),
                user_id=self.read_string(reader)
            )

        if message_id == 3:
            return SessionEnd(
                timestamp=self.read_uint(reader)
            )

        if message_id == 4:
            return SetPageLocation(
                url=self.read_string(reader),
                referrer=self.read_string(reader),
                navigation_start=self.read_uint(reader)
            )

        if message_id == 5:
            return SetViewportSize(
                width=self.read_uint(reader),
                height=self.read_uint(reader)
            )

        if message_id == 6:
            return SetViewportScroll(
                x=self.read_int(reader),
                y=self.read_int(reader)
            )

        if message_id == 7:
            return CreateDocument(
                
            )

        if message_id == 8:
            return CreateElementNode(
                id=self.read_uint(reader),
                parent_id=self.read_uint(reader),
                index=self.read_uint(reader),
                tag=self.read_string(reader),
                svg=self.read_boolean(reader)
            )

        if message_id == 9:
            return CreateTextNode(
                id=self.read_uint(reader),
                parent_id=self.read_uint(reader),
                index=self.read_uint(reader)
            )

        if message_id == 10:
            return MoveNode(
                id=self.read_uint(reader),
                parent_id=self.read_uint(reader),
                index=self.read_uint(reader)
            )

        if message_id == 11:
            return RemoveNode(
                id=self.read_uint(reader)
            )

        if message_id == 12:
            return SetNodeAttribute(
                id=self.read_uint(reader),
                name=self.read_string(reader),
                value=self.read_string(reader)
            )

        if message_id == 13:
            return RemoveNodeAttribute(
                id=self.read_uint(reader),
                name=self.read_string(reader)
            )

        if message_id == 14:
            return SetNodeData(
                id=self.read_uint(reader),
                data=self.read_string(reader)
            )

        if message_id == 15:
            return SetCSSData(
                id=self.read_uint(reader),
                data=self.read_string(reader)
            )

        if message_id == 16:
            return SetNodeScroll(
                id=self.read_uint(reader),
                x=self.read_int(reader),
                y=self.read_int(reader)
            )

        if message_id == 17:
            return SetInputTarget(
                id=self.read_uint(reader),
                label=self.read_string(reader)
            )

        if message_id == 18:
            return SetInputValue(
                id=self.read_uint(reader),
                value=self.read_string(reader),
                mask=self.read_int(reader)
            )

        if message_id == 19:
            return SetInputChecked(
                id=self.read_uint(reader),
                checked=self.read_boolean(reader)
            )

        if message_id == 20:
            return MouseMove(
                x=self.read_uint(reader),
                y=self.read_uint(reader)
            )

        if message_id == 21:
            return MouseClickDepricated(
                id=self.read_uint(reader),
                hesitation_time=self.read_uint(reader),
                label=self.read_string(reader)
            )

        if message_id == 22:
            return ConsoleLog(
                level=self.read_string(reader),
                value=self.read_string(reader)
            )

        if message_id == 23:
            return PageLoadTiming(
                request_start=self.read_uint(reader),
                response_start=self.read_uint(reader),
                response_end=self.read_uint(reader),
                dom_content_loaded_event_start=self.read_uint(reader),
                dom_content_loaded_event_end=self.read_uint(reader),
                load_event_start=self.read_uint(reader),
                load_event_end=self.read_uint(reader),
                first_paint=self.read_uint(reader),
                first_contentful_paint=self.read_uint(reader)
            )

        if message_id == 24:
            return PageRenderTiming(
                speed_index=self.read_uint(reader),
                visually_complete=self.read_uint(reader),
                time_to_interactive=self.read_uint(reader)
            )

        if message_id == 25:
            return JSException(
                name=self.read_string(reader),
                message=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 26:
            return IntegrationEvent(
                timestamp=self.read_uint(reader),
                source=self.read_string(reader),
                name=self.read_string(reader),
                message=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 27:
            return RawCustomEvent(
                name=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 28:
            return UserID(
                id=self.read_string(reader)
            )

        if message_id == 29:
            return UserAnonymousID(
                id=self.read_string(reader)
            )

        if message_id == 30:
            return Metadata(
                key=self.read_string(reader),
                value=self.read_string(reader)
            )

        if message_id == 31:
            return PageEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                url=self.read_string(reader),
                referrer=self.read_string(reader),
                loaded=self.read_boolean(reader),
                request_start=self.read_uint(reader),
                response_start=self.read_uint(reader),
                response_end=self.read_uint(reader),
                dom_content_loaded_event_start=self.read_uint(reader),
                dom_content_loaded_event_end=self.read_uint(reader),
                load_event_start=self.read_uint(reader),
                load_event_end=self.read_uint(reader),
                first_paint=self.read_uint(reader),
                first_contentful_paint=self.read_uint(reader),
                speed_index=self.read_uint(reader),
                visually_complete=self.read_uint(reader),
                time_to_interactive=self.read_uint(reader)
            )

        if message_id == 32:
            return InputEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                value=self.read_string(reader),
                value_masked=self.read_boolean(reader),
                label=self.read_string(reader)
            )

        if message_id == 33:
            return ClickEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                hesitation_time=self.read_uint(reader),
                label=self.read_string(reader),
                selector=self.read_string(reader)
            )

        if message_id == 34:
            return ErrorEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                source=self.read_string(reader),
                name=self.read_string(reader),
                message=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 35:
            return ResourceEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                duration=self.read_uint(reader),
                ttfb=self.read_uint(reader),
                header_size=self.read_uint(reader),
                encoded_body_size=self.read_uint(reader),
                decoded_body_size=self.read_uint(reader),
                url=self.read_string(reader),
                type=self.read_string(reader),
                success=self.read_boolean(reader),
                method=self.read_string(reader),
                status=self.read_uint(reader)
            )

        if message_id == 36:
            return CustomEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                name=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 37:
            return CSSInsertRule(
                id=self.read_uint(reader),
                rule=self.read_string(reader),
                index=self.read_uint(reader)
            )

        if message_id == 38:
            return CSSDeleteRule(
                id=self.read_uint(reader),
                index=self.read_uint(reader)
            )

        if message_id == 39:
            return Fetch(
                method=self.read_string(reader),
                url=self.read_string(reader),
                request=self.read_string(reader),
                response=self.read_string(reader),
                status=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                duration=self.read_uint(reader)
            )

        if message_id == 40:
            return Profiler(
                name=self.read_string(reader),
                duration=self.read_uint(reader),
                args=self.read_string(reader),
                result=self.read_string(reader)
            )

        if message_id == 41:
            return OTable(
                key=self.read_string(reader),
                value=self.read_string(reader)
            )

        if message_id == 42:
            return StateAction(
                type=self.read_string(reader)
            )

        if message_id == 43:
            return StateActionEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                type=self.read_string(reader)
            )

        if message_id == 44:
            return Redux(
                action=self.read_string(reader),
                state=self.read_string(reader),
                duration=self.read_uint(reader)
            )

        if message_id == 45:
            return Vuex(
                mutation=self.read_string(reader),
                state=self.read_string(reader)
            )

        if message_id == 46:
            return MobX(
                type=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 47:
            return NgRx(
                action=self.read_string(reader),
                state=self.read_string(reader),
                duration=self.read_uint(reader)
            )

        if message_id == 48:
            return GraphQL(
                operation_kind=self.read_string(reader),
                operation_name=self.read_string(reader),
                variables=self.read_string(reader),
                response=self.read_string(reader)
            )

        if message_id == 49:
            return PerformanceTrack(
                frames=self.read_int(reader),
                ticks=self.read_int(reader),
                total_js_heap_size=self.read_uint(reader),
                used_js_heap_size=self.read_uint(reader)
            )

        if message_id == 50:
            return GraphQLEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                operation_kind=self.read_string(reader),
                operation_name=self.read_string(reader),
                variables=self.read_string(reader),
                response=self.read_string(reader)
            )

        if message_id == 51:
            return FetchEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                method=self.read_string(reader),
                url=self.read_string(reader),
                request=self.read_string(reader),
                response=self.read_string(reader),
                status=self.read_uint(reader),
                duration=self.read_uint(reader)
            )

        if message_id == 52:
            return DOMDrop(
                timestamp=self.read_uint(reader)
            )

        if message_id == 53:
            return ResourceTiming(
                timestamp=self.read_uint(reader),
                duration=self.read_uint(reader),
                ttfb=self.read_uint(reader),
                header_size=self.read_uint(reader),
                encoded_body_size=self.read_uint(reader),
                decoded_body_size=self.read_uint(reader),
                url=self.read_string(reader),
                initiator=self.read_string(reader)
            )

        if message_id == 54:
            return ConnectionInformation(
                downlink=self.read_uint(reader),
                type=self.read_string(reader)
            )

        if message_id == 55:
            return SetPageVisibility(
                hidden=self.read_boolean(reader)
            )

        if message_id == 56:
            return PerformanceTrackAggr(
                timestamp_start=self.read_uint(reader),
                timestamp_end=self.read_uint(reader),
                min_fps=self.read_uint(reader),
                avg_fps=self.read_uint(reader),
                max_fps=self.read_uint(reader),
                min_cpu=self.read_uint(reader),
                avg_cpu=self.read_uint(reader),
                max_cpu=self.read_uint(reader),
                min_total_js_heap_size=self.read_uint(reader),
                avg_total_js_heap_size=self.read_uint(reader),
                max_total_js_heap_size=self.read_uint(reader),
                min_used_js_heap_size=self.read_uint(reader),
                avg_used_js_heap_size=self.read_uint(reader),
                max_used_js_heap_size=self.read_uint(reader)
            )

        if message_id == 59:
            return LongTask(
                timestamp=self.read_uint(reader),
                duration=self.read_uint(reader),
                context=self.read_uint(reader),
                container_type=self.read_uint(reader),
                container_src=self.read_string(reader),
                container_id=self.read_string(reader),
                container_name=self.read_string(reader)
            )

        if message_id == 60:
            return SetNodeAttributeURLBased(
                id=self.read_uint(reader),
                name=self.read_string(reader),
                value=self.read_string(reader),
                base_url=self.read_string(reader)
            )

        if message_id == 61:
            return SetCSSDataURLBased(
                id=self.read_uint(reader),
                data=self.read_string(reader),
                base_url=self.read_string(reader)
            )

        if message_id == 62:
            return IssueEvent(
                message_id=self.read_uint(reader),
                timestamp=self.read_uint(reader),
                type=self.read_string(reader),
                context_string=self.read_string(reader),
                context=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 63:
            return TechnicalInfo(
                type=self.read_string(reader),
                value=self.read_string(reader)
            )

        if message_id == 64:
            return CustomIssue(
                name=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 66:
            return AssetCache(
                url=self.read_string(reader)
            )

        if message_id == 67:
            return CSSInsertRuleURLBased(
                id=self.read_uint(reader),
                rule=self.read_string(reader),
                index=self.read_uint(reader),
                base_url=self.read_string(reader)
            )

        if message_id == 69:
            return MouseClick(
                id=self.read_uint(reader),
                hesitation_time=self.read_uint(reader),
                label=self.read_string(reader),
                selector=self.read_string(reader)
            )

        if message_id == 70:
            return CreateIFrameDocument(
                frame_id=self.read_uint(reader),
                id=self.read_uint(reader)
            )

        if message_id == 71:
            return AdoptedSSReplaceURLBased(
                sheet_id=self.read_uint(reader),
                text=self.read_string(reader),
                base_url=self.read_string(reader)
            )

        if message_id == 72:
            return AdoptedSSReplace(
                sheet_id=self.read_uint(reader),
                text=self.read_string(reader)
            )

        if message_id == 73:
            return AdoptedSSInsertRuleURLBased(
                sheet_id=self.read_uint(reader),
                rule=self.read_string(reader),
                index=self.read_uint(reader),
                base_url=self.read_string(reader)
            )

        if message_id == 74:
            return AdoptedSSInsertRule(
                sheet_id=self.read_uint(reader),
                rule=self.read_string(reader),
                index=self.read_uint(reader)
            )

        if message_id == 75:
            return AdoptedSSDeleteRule(
                sheet_id=self.read_uint(reader),
                index=self.read_uint(reader)
            )

        if message_id == 76:
            return AdoptedSSAddOwner(
                sheet_id=self.read_uint(reader),
                id=self.read_uint(reader)
            )

        if message_id == 77:
            return AdoptedSSRemoveOwner(
                sheet_id=self.read_uint(reader),
                id=self.read_uint(reader)
            )

        if message_id == 79:
            return Zustand(
                mutation=self.read_string(reader),
                state=self.read_string(reader)
            )

        if message_id == 107:
            return IOSBatchMeta(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                first_index=self.read_uint(reader)
            )

        if message_id == 90:
            return IOSSessionStart(
                timestamp=self.read_uint(reader),
                project_id=self.read_uint(reader),
                tracker_version=self.read_string(reader),
                rev_id=self.read_string(reader),
                user_uuid=self.read_string(reader),
                user_os=self.read_string(reader),
                user_os_version=self.read_string(reader),
                user_device=self.read_string(reader),
                user_device_type=self.read_string(reader),
                user_country=self.read_string(reader)
            )

        if message_id == 91:
            return IOSSessionEnd(
                timestamp=self.read_uint(reader)
            )

        if message_id == 92:
            return IOSMetadata(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                key=self.read_string(reader),
                value=self.read_string(reader)
            )

        if message_id == 93:
            return IOSCustomEvent(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                name=self.read_string(reader),
                payload=self.read_string(reader)
            )

        if message_id == 94:
            return IOSUserID(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                value=self.read_string(reader)
            )

        if message_id == 95:
            return IOSUserAnonymousID(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                value=self.read_string(reader)
            )

        if message_id == 96:
            return IOSScreenChanges(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                x=self.read_uint(reader),
                y=self.read_uint(reader),
                width=self.read_uint(reader),
                height=self.read_uint(reader)
            )

        if message_id == 97:
            return IOSCrash(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                name=self.read_string(reader),
                reason=self.read_string(reader),
                stacktrace=self.read_string(reader)
            )

        if message_id == 98:
            return IOSScreenEnter(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                title=self.read_string(reader),
                view_name=self.read_string(reader)
            )

        if message_id == 99:
            return IOSScreenLeave(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                title=self.read_string(reader),
                view_name=self.read_string(reader)
            )

        if message_id == 100:
            return IOSClickEvent(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                label=self.read_string(reader),
                x=self.read_uint(reader),
                y=self.read_uint(reader)
            )

        if message_id == 101:
            return IOSInputEvent(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                value=self.read_string(reader),
                value_masked=self.read_boolean(reader),
                label=self.read_string(reader)
            )

        if message_id == 102:
            return IOSPerformanceEvent(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                name=self.read_string(reader),
                value=self.read_uint(reader)
            )

        if message_id == 103:
            return IOSLog(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                severity=self.read_string(reader),
                content=self.read_string(reader)
            )

        if message_id == 104:
            return IOSInternalError(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                content=self.read_string(reader)
            )

        if message_id == 105:
            return IOSNetworkCall(
                timestamp=self.read_uint(reader),
                length=self.read_uint(reader),
                duration=self.read_uint(reader),
                headers=self.read_string(reader),
                body=self.read_string(reader),
                url=self.read_string(reader),
                success=self.read_boolean(reader),
                method=self.read_string(reader),
                status=self.read_uint(reader)
            )

        if message_id == 110:
            return IOSPerformanceAggregated(
                timestamp_start=self.read_uint(reader),
                timestamp_end=self.read_uint(reader),
                min_fps=self.read_uint(reader),
                avg_fps=self.read_uint(reader),
                max_fps=self.read_uint(reader),
                min_cpu=self.read_uint(reader),
                avg_cpu=self.read_uint(reader),
                max_cpu=self.read_uint(reader),
                min_memory=self.read_uint(reader),
                avg_memory=self.read_uint(reader),
                max_memory=self.read_uint(reader),
                min_battery=self.read_uint(reader),
                avg_battery=self.read_uint(reader),
                max_battery=self.read_uint(reader)
            )

        if message_id == 111:
            return IOSIssueEvent(
                timestamp=self.read_uint(reader),
                type=self.read_string(reader),
                context_string=self.read_string(reader),
                context=self.read_string(reader),
                payload=self.read_string(reader)
            )

