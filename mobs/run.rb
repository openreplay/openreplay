require 'erb'


# TODO: change method names to correct (CapitalCase and camelCase, not CamalCase and firstLower)
class String
  def upperize_abbreviations
    self.sub('Id', 'ID').sub('Url', 'URL')
  end

  # pascal_case
  def pascal_case
    return self if self !~ /_/ && self =~ /[A-Z]+.*/
    split('_').map{|e| e.capitalize}.join.upperize_abbreviations
  end

  # camelCase
  def camel_case
    self.sub(/^[A-Z]+/) {|f| f.downcase }
  end

  # snake_case
  def snake_case
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

  def type_js
    case @type
    when :int
      "number"
    when :uint
      "number"
    when :json
      # TODO
      # raise "Unexpected attribute type: data type attribute #{@name} found in JS template"
      "string"
    when :data
      raise "Unexpected attribute type: data type attribute #{@name} found in JS template"
    else
      @type
    end
  end

  def type_go
    case @type
    when :int
      'int64'
    when :uint
      'uint64'
    when :string
      'string'
    when :data
      '[]byte'
    when :boolean
      'bool'
    when :json
      'interface{}'
    end
  end

  def lengh_encoded
    case @type
    when :string, :data
      true
    else 
      false
    end
  end

end


$context = :web

class Message
  attr_reader :id, :name, :tracker, :replayer, :swift, :seq_index, :attributes, :context
  def initialize(name:, id:, tracker: $context == :web, replayer: $context == :web, swift: $context == :ios, seq_index: false, &block)
    @id = id
    @name = name
    @tracker = tracker
    @replayer = replayer
    @swift = swift
    @seq_index = seq_index
    @context = $context
    @attributes = []
    # opts.each { |key, value| send "#{key}=", value }
    instance_eval &block
  end

  %i(int uint boolean string data).each do |type|
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

$context = :ios
require './ios_messages.rb'

Dir["templates/*.erb"].each do |tpl|
  e = ERB.new(File.read(tpl))
  path = tpl.split '/'
  t = '../' + path[1].gsub('~', '/')
  t = t[0..-5]
  # TODO: .gen subextention
  File.write(t, e.result)
  puts tpl + ' --> ' + t
end
