# frozen_string_literal: true

require_relative 'ter/version'
require_relative 'ter/core/types'
require_relative 'ter/core/schema'
require_relative 'ter/core/validation'
require_relative 'ter/runtime/resolver'
require_relative 'ter/runtime/environment'
require_relative 'ter/adapters/dotenv'

module Ter
  class Error < StandardError; end

  def self.version
    VERSION
  end
end
