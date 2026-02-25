from ultralytics import YOLO

model = YOLO("../NeuroModel/yolov7.pt")      # или ваша обученная .pt
model.export(format="onnx")     # создаст yolo11n.onnx
