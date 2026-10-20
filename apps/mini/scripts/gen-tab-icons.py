#!/usr/bin/env python3
# 生成小程序 tabBar 单色图标：首页(房子) / 个人(人像)，普通灰 + 选中绿，81x81 透明底
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "tab")
os.makedirs(OUT, exist_ok=True)

SIZE = 81
NORMAL = (139, 151, 168, 255)   # #8b97a8
ACTIVE = (74, 222, 128, 255)    # #4ade80

def home(color):
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 屋顶（三角）
    d.polygon([(40, 12), (13, 40), (67, 40)], fill=color)
    # 墙体分段绘制，自然留出门口（左块 / 右块 / 门楣）
    d.rounded_rectangle([20, 38, 35, 67], radius=6, fill=color)
    d.rounded_rectangle([45, 38, 60, 67], radius=6, fill=color)
    d.rectangle([35, 38, 45, 50], fill=color)
    return layer

def user(color):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 头
    d.ellipse([28, 12, 52, 36], fill=color)
    # 肩：下半圆（180°→360°）
    d.chord([18, 44, 62, 86], start=180, end=360, fill=color)
    return img

def save(fn, img):
    p = os.path.join(OUT, fn)
    img.save(p)
    print("written", p)

save("home.png", home(NORMAL))
save("home-active.png", home(ACTIVE))
save("user.png", user(NORMAL))
save("user-active.png", user(ACTIVE))
