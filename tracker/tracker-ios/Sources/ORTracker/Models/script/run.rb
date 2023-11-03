require 'erb'

class String
  def camel_case
    return self if self !~ /_/ && self =~ /[A-Z]+.*/
    split('_').map{|e| e.capitalize}.join.upperize
  end

  def camel_case_lower
      self.split('_').inject([]) do |buffer, e|
          word = if e.downcase == "url"
                   "URL"
                 else
                   buffer.empty? ? e : e.capitalize
                 end
          buffer.push(word)
      end.join.upperize
  end

  def upperize
    self.sub('Id', 'ID').sub('Url', 'URL').sub('url', 'URL')
  end

  def first_lower
    return "URL" if self == "URL"
    "" if self == ""
    self[0].downcase + self[1..-1]
  end

  def underscore
    self.gsub(/::/, '/').
    gsub(/([A-Z]+)([A-Z][a-z])/,'\1_\2').
    gsub(/([a-z\d])([A-Z])/,'\1_\2').
    tr("-", "_").
    downcase
  end
end

class Attribute
  attr_reader :name, :type
  def initialize(name:, type:)
    @name = name
    @type = type
  end

  def property
    @name.first_lower
  end

  def type_swift
    case @type
    when :string
      "String"
    when :data
      "Data"
    when :uint
      "UInt64"
    when :boolean
      "Bool"
    else
      "Primary"
    end
  end

  def type_swift_read
    case @type
    when :string
      "String"
    when :data
      "Data"
    else
      "Primary"
    end
  end
end

class Message
  attr_reader :id, :name, :js, :replayer, :attributes
  def initialize(name:, id:, js: true, replayer: true, &block)
    @id = id
    @name = name
    @js = js
    @replayer = replayer
    @attributes = []
    instance_eval &block
  end

  %i(uint string data boolean).each do |type|
    define_method type do |name, opts = {}|
      opts.merge!(
        name: name,
        type: type,
      )
      @attributes << Attribute.new(opts)
    end
  end
end

$ids = []
$messages = []
def message(id, name, opts = {}, &block)
  raise "id duplicated #{name}" if $ids.include? id
  raise "id is too big #{name}" if id > 120
  $ids << id
  opts[:id] = id
  opts[:name] = name
  msg = Message.new(opts, &block)
  $messages << msg
end

require './messages.rb'

e = ERB.new(File.read('./messages.erb'))
File.write('ORMessages.swift', e.result)
