// Auto-generated, do not edit
import UIKit

enum ASMessageType: UInt64 {
<%= $messages.map { |msg| "    case #{msg.name.camel_case} = #{msg.id}" }.join "\n" %>
}
<% $messages.each do |msg| %>
class AS<%= msg.name.to_s.pascal_case %>: ASMessage {
<%= msg.attributes[2..-1].map { |attr| "    let #{attr.property}: #{attr.type_swift}" }.join "\n" %>

    init(<%= msg.attributes[2..-1].map { |attr| "#{attr.property}: #{attr.type_swift}" }.join ", " %>) {
<%= msg.attributes[2..-1].map { |attr| "        self.#{attr.property} = #{attr.property}" }.join "\n" %>
        super.init(messageType: .<%= "#{msg.name.camel_case}" %>)
    }

    override init?(genericMessage: GenericMessage) {
    <% if msg.attributes.length > 2 %>  do {
            var offset = 0
<%= msg.attributes[2..-1].map { |attr| "            self.#{attr.property} = try genericMessage.body.read#{attr.type_swift_read}(offset: &offset)" }.join "\n" %>
            super.init(genericMessage: genericMessage)
        } catch {
            return nil
        }
    <% else %>
        super.init(genericMessage: genericMessage)
    <% end %>}

    override func contentData() -> Data {
        return Data(values: UInt64(<%= "#{msg.id}"%>), timestamp<% if msg.attributes.length > 2 %>, Data(values: <%= msg.attributes[2..-1].map { |attr| attr.property }.join ", "%>)<% end %>)
    }

    override var description: String {
        return "-->> <%= msg.name.to_s.pascal_case %>(<%= "#{msg.id}"%>): timestamp:\(timestamp) <%= msg.attributes[2..-1].map { |attr| "#{attr.property}:\\(#{attr.property})" }.join " "%>";
    }
}
<% end %>
