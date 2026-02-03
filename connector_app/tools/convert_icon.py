from PIL import Image
import os

img_path = "assets/icon.png"
ico_path = "assets/icon.ico"

if os.path.exists(img_path):
    img = Image.open(img_path)
    # Windows likes multiple sizes in the ICO
    img.save(ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    print(f"Icon converted (Multi-size): {ico_path}")
else:
    print("Icon source not found, skipping conversion.")
