class HomeController < ApplicationController

  def index
  end

  def dashboard
  end

  def liturgy
    # Load today liturgy
    # Check if there is a read record
    #   Button to mark as read
    #   Create it - save liturgic title fand lang for reference
    # Show date picker to change to another date
    # Show lang picker to change to another lang
  end

  def myrecord
    # Show month picker
    # Show for the current month, cards about date/lang that the user read
    # ToDo: show ccards in another color for the dates the user did not read
    # Order them all by date
  end

  def mailsettings
    # Conf interface for email settings
  end

  def profile
  end
end
