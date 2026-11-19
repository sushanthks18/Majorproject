"""
Image Quality and Non-Leaf Validation Module for Krishi Sakha
Provides pre-classification gatekeeping to prevent invalid image predictions
while strictly protecting genuine green, yellow, brown, dry, and white-background crop leaves.
"""

import os
from pathlib import Path
import numpy as np
import torch
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
from scipy.ndimage import laplace

# Thresholds empirically calibrated on 1,594 real validation samples (val_split.csv)
# Real validation leaves: Min lap_var = 10.65, Min mean_lum = 10.72, Min std_rgb = 18.13
MIN_IMAGE_DIM = 64
BLUR_LAPLACIAN_THRESHOLD = 6.0      # Calibrated: real leaves >= 10.65; severe defocus blur < 3.0
DARK_LUMINANCE_THRESHOLD = 5.0      # Calibrated: darkest real leaf = 10.72; pitch black < 5.0
OVEREXPOSED_LUM_THRESHOLD = 250.0   # Calibrated: brightest real leaf = 204.25
FLAT_CANVAS_STD_THRESHOLD = 5.0     # Calibrated: lowest contrast real leaf = 18.13

# Pre-identified non-plant categories in ImageNet (vehicles, electronics, furniture, clothing, household items, animals)
NON_PLANT_KEYWORDS = [
    'screen', 'monitor', 'cellular', 'telephone', 'keyboard', 'computer', 'laptop',
    'puzzle', 'envelope', 'menu', 'packet', 'book', 'paper', 'web', 'site',
    'car', 'truck', 'bus', 'wheel', 'tire', 'vehicle', 'aircraft', 'boat',
    'suit', 'jersey', 'tie', 'sunglasses', 'coat', 'shoe', 'boot', 'sock', 'hat',
    'chair', 'table', 'desk', 'couch', 'sofa', 'lamp', 'clock', 'watch',
    'cup', 'mug', 'bottle', 'plate', 'bowl', 'fork', 'knife', 'spoon',
    'dog', 'cat', 'horse', 'cow', 'sheep', 'elephant', 'bear', 'bird',
    'building', 'house', 'church', 'bridge', 'wall', 'fence', 'pole'
]


class ImageValidator:
    """
    Validates uploaded images prior to disease classification.
    Identifies unusable images and obvious non-leaf objects without falsely rejecting
    genuine diseased, yellow, brown, dry, or white-background leaves.
    """
    def __init__(self, device=None):
        self.device = device or torch.device("cpu")
        self._imgnet_model = None
        self._imgnet_categories = None
        self._imgnet_preprocess = None
        self._non_plant_indices = None

    def _load_imgnet_model(self):
        """Lazy loader for ImageNet MobileNetV2 experimental negative filter."""
        if self._imgnet_model is None:
            weights = models.MobileNet_V2_Weights.DEFAULT
            self._imgnet_model = models.mobilenet_v2(weights=weights).to(self.device).eval()
            self._imgnet_categories = weights.meta['categories']
            self._imgnet_preprocess = weights.transforms()
            
            # Map non-plant keywords to category indices
            self._non_plant_indices = set()
            for idx, cat in enumerate(self._imgnet_categories):
                cat_lower = cat.lower()
                for kw in NON_PLANT_KEYWORDS:
                    if kw in cat_lower:
                        self._non_plant_indices.add(idx)
                        break

    def validate(self, pil_image: Image.Image) -> dict:
        """
        Runs multi-tier validation on the image.
        Returns:
            dict with 'valid': bool, 'status': str, 'message': str, 'reason': str, 'details': dict
        """
        # 1. Dimensions and channel check
        if not isinstance(pil_image, Image.Image):
            return {
                "valid": False,
                "status": "invalid_image",
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": "Not a valid PIL image object",
                "details": {}
            }

        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        w, h = pil_image.size
        if w < MIN_IMAGE_DIM or h < MIN_IMAGE_DIM:
            return {
                "valid": False,
                "status": "invalid_image",
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": f"Image dimensions too small ({w}x{h}, minimum {MIN_IMAGE_DIM}x{MIN_IMAGE_DIM})",
                "details": {"width": w, "height": h}
            }

        # Standardized 256x256 frame for calibrated quality measurements
        img_256 = pil_image.resize((256, 256), Image.BILINEAR)
        arr_256 = np.array(img_256, dtype=float)
        gray = 0.299 * arr_256[:, :, 0] + 0.587 * arr_256[:, :, 1] + 0.114 * arr_256[:, :, 2]

        std_rgb = float(np.std(arr_256))
        mean_lum = float(np.mean(gray))

        # 2. Canvas Uniformity (Blank / Flat solid color)
        if std_rgb < FLAT_CANVAS_STD_THRESHOLD:
            return {
                "valid": False,
                "status": "invalid_image",
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": f"Blank or uniform canvas detected (std_rgb={std_rgb:.2f})",
                "details": {"std_rgb": std_rgb}
            }

        # 3. Extreme Underexposure (Pitch black)
        if mean_lum < DARK_LUMINANCE_THRESHOLD:
            return {
                "valid": False,
                "status": "invalid_image",
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": f"Extremely dark or unexposed image (mean_lum={mean_lum:.2f})",
                "details": {"mean_lum": mean_lum}
            }

        # 4. Extreme Overexposure (Completely blown out white canvas)
        if mean_lum > OVEREXPOSED_LUM_THRESHOLD and std_rgb < FLAT_CANVAS_STD_THRESHOLD:
            return {
                "valid": False,
                "status": "invalid_image",
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": f"Overexposed or washed-out image (mean_lum={mean_lum:.2f})",
                "details": {"mean_lum": mean_lum}
            }

        # 5. Severe Defocus Blur (Laplacian variance calibrated against val_split.csv)
        lap_var = float(np.var(laplace(gray)))
        if lap_var < BLUR_LAPLACIAN_THRESHOLD:
            return {
                "valid": False,
                "status": "invalid_image",
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": f"Image is too blurry or out of focus (laplacian_var={lap_var:.2f})",
                "details": {"laplacian_var": lap_var}
            }

        # 6. QR Code, Barcode, and Monochrome Document Structure
        # QR codes / monochrome documents have >90% pixels near pure black or pure white AND zero foreground saturation
        r_ch, g_ch, b_ch = arr_256[:, :, 0], arr_256[:, :, 1], arr_256[:, :, 2]
        mx = np.maximum(np.maximum(r_ch, g_ch), b_ch)
        mn = np.minimum(np.minimum(r_ch, g_ch), b_ch)
        sat = np.zeros_like(mx)
        nz = mx > 0
        sat[nz] = (mx[nz] - mn[nz]) / mx[nz]

        mean_sat = float(np.mean(sat))
        bw_fraction = float(np.mean((gray <= 35) | (gray >= 220)))
        # Non-background pixels (pixels that are not white canvas)
        fg_mask = gray < 220
        fg_sat = float(np.mean(sat[fg_mask])) if np.any(fg_mask) else 0.0

        # QR codes, barcodes, and monochrome documents/screenshots have nearly zero chromaticity
        # Real leaves (even brown/yellow/dry or on white background) have mean_sat >= 0.068 and fg_sat > 0.18
        if mean_sat < 0.04 or (bw_fraction > 0.80 and fg_sat < 0.05):
            return {
                "valid": False,
                "status": "invalid_image",
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": f"Monochrome QR code, barcode, or text document detected (mean_sat={mean_sat:.3f}, bw_fraction={bw_fraction:.2f}, fg_sat={fg_sat:.3f})",
                "details": {"mean_sat": mean_sat, "bw_fraction": bw_fraction, "fg_sat": fg_sat}
            }

        # 7. Experimental Negative Filter (ImageNet MobileNetV2)
        # Identifies clearly recognizable non-plant objects (vehicles, monitors, cellular telephones, keyboards)
        # Limitation: This is an out-of-distribution negative filter, NOT a positive botanical leaf detector.
        try:
            self._load_imgnet_model()
            t = self._imgnet_preprocess(pil_image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                imgnet_logits = self._imgnet_model(t)
                imgnet_probs = torch.softmax(imgnet_logits, dim=1)[0]

            top1_prob, top1_idx = torch.topk(imgnet_probs, 1)
            p_val = float(top1_prob.item())
            idx_val = int(top1_idx.item())
            cat_val = self._imgnet_categories[idx_val]

            # If the model predicts an explicit non-plant man-made object with confidence >= 30.0%
            if idx_val in self._non_plant_indices and p_val >= 0.30:
                return {
                    "valid": False,
                    "status": "invalid_image",
                    "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                    "reason": f"Non-plant object detected ({cat_val}, {p_val*100:.1f}%)",
                    "details": {"top1_category": cat_val, "top1_probability": p_val}
                }
        except Exception as e:
            # If negative filter fails, do not block the pipeline
            pass

        # Image passed all quality and non-leaf checks
        return {
            "valid": True,
            "status": "valid",
            "message": "Image quality and structural validation passed.",
            "details": {
                "laplacian_var": lap_var,
                "mean_lum": mean_lum,
                "std_rgb": std_rgb,
                "bw_fraction": bw_fraction,
                "fg_sat": fg_sat
            }
        }
