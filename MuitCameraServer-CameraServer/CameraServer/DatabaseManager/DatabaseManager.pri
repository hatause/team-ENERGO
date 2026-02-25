HEADERS += \
    $$PWD/DatabaseConnector.h \
    $$PWD/DatabaseManager.h \
    $$PWD/Database_dictionary.h

SOURCES += \
    $$PWD/DatabaseConnector.cpp \
    $$PWD/DatabaseManager.cpp

include(Filters/Filters.pri)
include(Requests/Requests.pri)
