QT += core gui quick quickcontrols2 quickwidgets qml multimedia serialport  sql
QT += quick3d quick3dassetimport

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets

CONFIG += c++17
# CONFIG += debug
CONFIG += release
# You can make your code fail to compile if it uses deprecated APIs.
# In order to do so, uncomment the following line.
#DEFINES += QT_DISABLE_DEPRECATED_BEFORE=0x060000    # disables all the APIs deprecated before Qt 6.0.0

SOURCES += \
    main.cpp \
    mainwindow.cpp

HEADERS += \
    mainwindow.h

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target

INCLUDEPATH += "F:/LIBS/vcpkg/vcpkg/installed/x64-windows/include/opencv4"
INCLUDEPATH += "F:/LIBS/vcpkg/vcpkg/installed/x64-windows/include/"


INCLUDEPATH += "F:/LIBS/eigen-3.4.0/eigen-3.4.0"


# INCLUDEPATH += "F:/LIBS/ffmpeg-master-latest-win64-gpl-shared/ffmpeg-master-latest-win64-gpl-shared/include"
# LIBS += -L"F:/LIBS/ffmpeg-master-latest-win64-gpl-shared/ffmpeg-master-latest-win64-gpl-shared/lib" \
#         -lavformat \
#         -lavcodec \
#         -lavutil \
#         -lswscale


win32 {

    CONFIG(debug, debug|release) {
    LIBS += -lws2_32
        LIBS += -L"F:/LIBS/vcpkg/vcpkg/installed/x64-windows/debug/lib"
        LIBS += -lopencv_core4d -lopencv_dnn4d -lopencv_imgproc4d -lopencv_highgui4d
        LIBS += -lopencv_imgcodecs4d -lopencv_videoio4d -lopencv_video4d
        LIBS += -lopencv_features2d4d -lopencv_calib3d4d -lopencv_flann4d
        LIBS += -lopencv_objdetect4d -lopencv_photo4d -lopencv_stitching4d -llibprotobufd -lgrpc++_unsecure -lgrpc -lzlibd -laddress_sorting -lgpr \
        -labsl_flags_internal -labseil_dll -labsl_log_flags -lcares -lgrpc_authorization_provider -lre2 -llibssl -llibcrypto -llibprotocd \
        -lupb_base_lib -lupb_json_lib -lupb_mem_lib -lupb_message_lib -lupb_mini_descriptor_lib -lupb_textformat_lib -lupb_wire_lib \
        -lupb_base_lib -lupb_json_lib -lupb_mem_lib -lupb_message_lib -lupb_mini_descriptor_lib \
        -lupb_textformat_lib -lupb_wire_lib -lutf8_validity -lutf8_range \
        -labsl_flags_internal -labsl_flags_program_name -labsl_flags_config -labsl_flags_usage \
        -labsl_flags_marshalling -labsl_flags_private_handle_accessor -labsl_flags_reflection \
        -labsl_flags_parse -labsl_flags_usage_internal -labsl_flags_commandlineflag \
        -labsl_flags_commandlineflag_internal \
        -lavformat -lavcodec -lavutil -lswscale -lavdevice

    } else {
    LIBS += -lws2_32
        LIBS += -L"F:/LIBS/vcpkg/vcpkg/installed/x64-windows/lib"
        LIBS += -lopencv_core4 -lopencv_dnn4 -lopencv_imgproc4 -lopencv_highgui4
        LIBS += -lopencv_imgcodecs4 -lopencv_videoio4 -lopencv_video4
        LIBS += -lopencv_features2d4 -lopencv_calib3d4 -lopencv_flann4
        LIBS += -lopencv_objdetect4 -lopencv_photo4 -lopencv_stitching4 -llibprotobuf -lgrpc++ -lgrpc -lzlib -laddress_sorting -lgpr -llibcrypto -llibprotoc \
        -labsl_flags_internal -labseil_dll -labsl_log_flags -lcares -lgrpc_authorization_provider -lre2 -llibssl \
        -lupb_base_lib -lupb_json_lib -lupb_mem_lib -lupb_message_lib -lupb_mini_descriptor_lib -lupb_textformat_lib -lupb_wire_lib \
        -lupb_base_lib -lupb_json_lib -lupb_mem_lib -lupb_message_lib -lupb_mini_descriptor_lib \
        -lupb_textformat_lib -lupb_wire_lib -lutf8_validity -lutf8_range \
        -labsl_flags_internal -labsl_flags_program_name -labsl_flags_config -labsl_flags_usage \
        -labsl_flags_marshalling -labsl_flags_private_handle_accessor -labsl_flags_reflection \
        -labsl_flags_parse -labsl_flags_usage_internal -labsl_flags_commandlineflag \
        -labsl_flags_commandlineflag_internal \
        -lavformat -lavcodec -lavutil -lswscale -lavdevice  \
    }
}


include(../VideoViewer/VideoViewer.pri)
include(../DatabaseManager/DatabaseManager.pri)
include(../Settings/Settings.pri)
include(../Algorithms/Algorithms.pri)
include(../ViewModels/ViewModels.pri)
include(../TCP_Server/TCP_Server.pri)
include(../Proxy/Proxy.pri)

RESOURCES += \
    resources.qrc
