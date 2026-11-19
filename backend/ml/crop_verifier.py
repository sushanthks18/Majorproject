"""
Krishi Sakha - Stage 2 Botanical Crop Verifier Inference Module
Provides high-accuracy botanical crop verification across:
  - Supported crops: Tomato, Potato, Rice, Wheat, Corn (Maize), Cotton
  - Unsupported crop detection: Identifies non-target plant leaves (Soybean, Sugarcane, Ragi, Apple, Grape, etc.)
"""

import os
import logging
from pathlib import Path
import torch
import torch.nn as nn
import torchvision.models as models
from PIL import Image

logger = logging.getLogger("krishi_sakha.crop_verifier")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

CROP_NAMES = ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton", "Unsupported"]
SUPPORTED_CROPS = set(["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton"])
MARGIN_THRESHOLD = 0.50  # P(best supported crop) - P(Unsupported) >= 0.50
MIN_CONFIDENCE_THRESHOLD = 0.50

class CropClassifierHead(nn.Module):
    def __init__(self, in_features=1280, num_classes=7):
        super().__init__()
        self.net = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.net(x)


class BotanicalCropVerifier:
    def __init__(self, device=None, checkpoint_path=None):
        if device is not None:
            self.device = device
        elif torch.backends.mps.is_available():
            self.device = torch.device("mps")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        if checkpoint_path is None:
            checkpoint_path = Path(__file__).parent / "crop_verifier.pth"
        self.checkpoint_path = Path(checkpoint_path)

        # Load backbone
        weights = models.MobileNet_V2_Weights.DEFAULT
        self.transform = weights.transforms()
        base_model = models.mobilenet_v2(weights=weights)
        self.features = base_model.features.to(self.device).eval()
        self.pool = nn.AdaptiveAvgPool2d((1, 1))

        # Load head
        self.head = CropClassifierHead(in_features=1280, num_classes=7).to(self.device)
        if self.checkpoint_path.exists():
            state = torch.load(self.checkpoint_path, map_location=self.device)
            self.head.load_state_dict(state)
        self.head.eval()

    def verify(self, pil_image: Image.Image) -> dict:
        """
        Botanically identifies whether the leaf belongs to a supported crop or is unsupported.
        Returns:
            dict containing crop, is_supported, confidence, and class_probabilities.
        """
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        t = self.transform(pil_image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            feat = self.pool(self.features(t)).flatten(1)
            logits = self.head(feat)[0]
            probs = torch.softmax(logits, dim=0)

        top_prob, top_idx = torch.topk(probs, 1)
        prob_val = float(top_prob.item())
        idx_val = int(top_idx.item())

        predicted_crop = CROP_NAMES[idx_val]
        unsupported_prob = float(probs[6].item())

        # Determine best supported crop among classes 0..5 (Tomato, Potato, Rice, Wheat, Corn, Cotton)
        best_supported_idx = int(torch.argmax(probs[:6]).item())
        best_supported_crop = CROP_NAMES[best_supported_idx]
        best_supported_prob = float(probs[best_supported_idx].item())

        # Probability Margin Gate: P(best supported crop) - P(Unsupported) >= 0.50
        margin = float(best_supported_prob - unsupported_prob)

        # An image is verified as a supported crop ONLY if:
        # 1. Top predicted class is NOT Unsupported
        # 2. Probability margin: P(best supported crop) - P(Unsupported) >= 0.50
        # 3. Best supported crop confidence >= 0.50
        is_supported = (predicted_crop != "Unsupported") and (margin >= MARGIN_THRESHOLD) and (best_supported_prob >= MIN_CONFIDENCE_THRESHOLD)

        res_crop = predicted_crop if is_supported else "Unsupported"

        # Structured logging for traceability
        logger.info(
            f"Botanical Crop Verification: Best Supported='{best_supported_crop}' ({best_supported_prob*100:.1f}%) | "
            f"Unsupported=({unsupported_prob*100:.1f}%) | "
            f"Margin={margin*100:+.1f}% (threshold: >={MARGIN_THRESHOLD*100:.1f}%) | "
            f"Decision={'ACCEPTED (' + res_crop + ')' if is_supported else 'REJECTED (Unsupported/Uncertain)'}"
        )

        return {
            "crop": res_crop,
            "raw_crop": predicted_crop,
            "is_supported": is_supported,
            "confidence": round(prob_val * 100, 1),
            "best_supported_crop": best_supported_crop,
            "best_supported_prob": round(best_supported_prob * 100, 1),
            "unsupported_prob": round(unsupported_prob * 100, 1),
            "margin": round(margin * 100, 1),
            "margin_threshold": round(MARGIN_THRESHOLD * 100, 1),
            "probabilities": {CROP_NAMES[i]: round(float(probs[i].item() * 100), 1) for i in range(7)}
        }
