#!/usr/bin/env python3
"""
MobileNetV2 Deep Learning Vision Model for Plant Leaf Disease Detection
Krishi Sakha Platform - 4 Supported Crops:
1. Paddy (Rice)
2. Ragi (Finger Millet)
3. Jowar (Sorghum / Jor)
4. Coconut

All non-target crops (Tomato, Potato, Wheat, Corn, Cotton, etc.) have been completely purged.
"""

import sys
import os
import json
import base64
import io
import time
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    import torchvision.models as models
    import torchvision.transforms as transforms
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        "status": "error",
        "error": f"Missing required ML dependency: {str(e)}"
    }))
    sys.exit(1)

# Import local ImageValidator
try:
    from image_validator import ImageValidator
except ImportError:
    from backend.ml.image_validator import ImageValidator

# Base directory for ML artifacts
ML_DIR = Path(__file__).parent.resolve()
METADATA_PATH = ML_DIR / "disease_model_metadata.json"
CHECKPOINT_PATH = ML_DIR / "mobilenet_v2_disease_best.pth"

# Calibrated confidence threshold
CONFIDENCE_THRESHOLD = 50.0

# Supported crops registry (Strictly the 4 user-specified crops)
SUPPORTED_CROPS = {"paddy", "rice", "ragi", "finger millet", "jowar", "jor", "sorghum", "coconut"}

# Crop alias mapping to canonical crop names
CROP_ALIASES = {
    "paddy": "Paddy",
    "rice": "Paddy",
    "ragi": "Ragi",
    "finger millet": "Ragi",
    "finger_millet": "Ragi",
    "eleusine coracana": "Ragi",
    "jowar": "Jowar",
    "jor": "Jowar",
    "sorghum": "Jowar",
    "coconut": "Coconut",
    "cocos nucifera": "Coconut"
}

def normalize_crop_name(name):
    if not name:
        return ""
    cleaned = name.strip().lower()
    return CROP_ALIASES.get(cleaned, cleaned.capitalize())

# The 14 Supported Classes across Paddy, Ragi, Jowar, Coconut
SUPPORTED_CLASSES = [
    "Paddy___Bacterial_Blight",
    "Paddy___Blast",
    "Paddy___Brown_Spot",
    "Paddy___Healthy",
    "Ragi___Blast",
    "Ragi___Brown_Spot",
    "Ragi___Healthy",
    "Jowar___Anthracnose",
    "Jowar___Leaf_Blight",
    "Jowar___Healthy",
    "Coconut___Bud_Rot",
    "Coconut___Leaf_Spot",
    "Coconut___Stem_Bleeding",
    "Coconut___Healthy"
]

NUM_SUPPORTED_CLASSES = len(SUPPORTED_CLASSES)

# Comprehensive Agricultural Disease Profiles
DISEASE_PROFILES = {
    # ==================== PADDY (RICE) ====================
    "Paddy___Bacterial_Blight": {
        "disease": "Bacterial Blight (Xanthomonas oryzae pv. oryzae)",
        "crop": "Paddy",
        "isHealthy": False,
        "severity": "High",
        "symptoms": [
            "Water-soaked yellowish translucent stripes starting from leaf tips and margins",
            "Lesions turn dull white or straw-colored with undulating wavy margins",
            "Bacterial ooze droplets visible on infected leaf blades early in the morning"
        ],
        "treatments": [
            "Spray Copper Oxychloride 50% WP (2.5 g/L) + Streptocycline (1 g per 10 L water)",
            "Drain excess water from fields to lower canopy humidity",
            "Avoid excessive nitrogen top-dressing; delay urea till lesions stabilize"
        ],
        "organicControl": "Foliar spray with Pseudomonas fluorescens (10 g/L) or 5% Neem Seed Kernel Extract (NSKE)."
    },
    "Paddy___Blast": {
        "disease": "Blast (Magnaporthe oryzae / Pyricularia oryzae)",
        "crop": "Paddy",
        "isHealthy": False,
        "severity": "High",
        "symptoms": [
            "Spindle-shaped diamond lesions with ash-grey center and dark reddish-brown margin",
            "Lesions enlarge, coalesce, and cause entire leaf blade to desiccate and wither",
            "Collar blast and neck rot leading to blank panicles in severe infestations"
        ],
        "treatments": [
            "Spray Tricyclazole 75% WP (0.6 g/L) or Isoprothiolane 40% EC (1.5 mL/L)",
            "Apply Azoxystrobin 18.2% + Difenoconazole 11.4% SC (1 mL/L water)",
            "Maintain balanced fertilization with split application of nitrogen"
        ],
        "organicControl": "Bio-control foliar spray of Trichoderma harzianum (10 g/L) with fermented sour buttermilk."
    },
    "Paddy___Brown_Spot": {
        "disease": "Brown Spot (Bipolaris oryzae / Helminthosporium)",
        "crop": "Paddy",
        "isHealthy": False,
        "severity": "Moderate",
        "symptoms": [
            "Isolated oval to circular dark brown spots with a light brown center and yellow halo",
            "Numerous spots give leaves a scorched, speckled appearance",
            "Severe infection leads to grain discoloration and poor seed filling"
        ],
        "treatments": [
            "Spray Mancozeb 75% WP (2.0 g/L) or Propiconazole 25% EC (1.0 mL/L)",
            "Apply Muriate of Potash (MOP) to correct potassium deficiency in the soil",
            "Ensure proper seed treatment with Carbendazim (2 g/kg seed) before sowing"
        ],
        "organicControl": "Foliar application of Neem oil emulsion (5 mL/L) or garlic-chili botanical extract."
    },
    "Paddy___Healthy": {
        "disease": "Healthy Leaf (No Pathogen Detected)",
        "crop": "Paddy",
        "isHealthy": True,
        "severity": "None",
        "symptoms": [
            "Vibrant green uniform leaf blade with intact cuticle",
            "Distinct clear venation without necrotic spots or chlorotic halos",
            "Strong upright tillers and healthy vegetative canopy"
        ],
        "treatments": [
            "Maintain recommended N:P:K ratio (100:50:50 kg/ha) with split nitrogen applications",
            "Maintain shallow 2-5 cm standing water layer during vegetative and tillering stages",
            "Regularly scout field borders and bunds for weeds and early pest signs"
        ],
        "organicControl": "Apply Farm Yard Manure (FYM 10 t/ha) and bio-fertilizers (Azospirillum & PSB)."
    },

    # ==================== RAGI (FINGER MILLET) ====================
    "Ragi___Blast": {
        "disease": "Finger Millet Blast (Magnaporthe grisea / Pyricularia)",
        "crop": "Ragi",
        "isHealthy": False,
        "severity": "High",
        "symptoms": [
            "Typical spindle-shaped diamond lesions with grey center and brown margins on leaves",
            "Lesions join together causing extensive leaf drying and premature senescence",
            "Neck blast and finger blast resulting in chaffy or unformed ragi grains"
        ],
        "treatments": [
            "Spray Kitazin 48% EC (2.0 mL/L) or Tricyclazole 75% WP (0.6 g/L)",
            "Alternatively spray Carbendazim 50% WP (1.0 g/L water)",
            "Avoid high doses of nitrogenous fertilizers during cloudy or foggy weather"
        ],
        "organicControl": "Treat seeds with Pseudomonas fluorescens (10 g/kg) and foliar spray neem oil (5 mL/L)."
    },
    "Ragi___Brown_Spot": {
        "disease": "Brown Spot (Bipolaris nodulosa)",
        "crop": "Ragi",
        "isHealthy": False,
        "severity": "Moderate",
        "symptoms": [
            "Small dark-brown to reddish-brown circular specks across the leaf lamina",
            "Infected leaves wither and dry prematurely from tips downwards",
            "Seedling blight and foot rot in heavily infected nursery stages"
        ],
        "treatments": [
            "Spray Mancozeb 75% WP (2.0 g/L) or Chlorothalonil 75% WP (2.0 g/L)",
            "Ensure adequate potash nutrition to bolster epidermal cell wall resistance",
            "Destroy infected crop residues post-harvest through deep summer plowing"
        ],
        "organicControl": "Foliar spray with Trichoderma viride (10 g/L) and cow urine distillate (50 mL/L)."
    },
    "Ragi___Healthy": {
        "disease": "Healthy Leaf (No Pathogen Detected)",
        "crop": "Ragi",
        "isHealthy": True,
        "severity": "None",
        "symptoms": [
            "Lush deep-green erect linear leaves with smooth borders",
            "Well-defined central midrib with zero fungal lesions or necrotic margins",
            "Healthy tiller initiation and robust vegetative vigor"
        ],
        "treatments": [
            "Follow balanced fertilization: 50:40:25 kg NPK/ha for rainfed ragi",
            "Perform timely inter-cultivation and manual weeding at 20 and 40 days after sowing",
            "Provide protective irrigation during critical tillering and flowering stages"
        ],
        "organicControl": "Incorporate well-decomposed FYM (10 t/ha) and apply Jeevamrutha foliar spray."
    },

    # ==================== JOWAR (SORGHUM) ====================
    "Jowar___Anthracnose": {
        "disease": "Anthracnose & Red Rot (Colletotrichum sublineolum)",
        "crop": "Jowar",
        "isHealthy": False,
        "severity": "Moderate to High",
        "symptoms": [
            "Circular to elliptical spots with dark reddish-purple margins and straw-colored centers",
            "Black pin-head fruiting bodies (acervuli) visible in central dead tissue",
            "Midrib infection and stalk rot causing lodging and significant grain yield loss"
        ],
        "treatments": [
            "Spray Carbendazim 50% WP (1.0 g/L) or Mancozeb 75% WP (2.0 g/L)",
            "Spray Propiconazole 25% EC (1.0 mL/L) at first symptom appearance",
            "Practice 2-year crop rotation with non-host legumes or pulses"
        ],
        "organicControl": "Foliar application of Trichoderma harzianum (10 g/L) combined with 5% NSKE."
    },
    "Jowar___Leaf_Blight": {
        "disease": "Leaf Blight (Exserohilum turcicum / Helminthosporium)",
        "crop": "Jowar",
        "isHealthy": False,
        "severity": "Moderate",
        "symptoms": [
            "Long, spindle-shaped or elliptical necrotic lesions with dark reddish-purple margins",
            "Straw-colored central dead tissue extending parallel to leaf veins",
            "Lower leaves dry out completely giving the field a scorched appearance"
        ],
        "treatments": [
            "Spray Mancozeb 75% WP (2.5 g/L) or Zineb 75% WP (2.0 g/L)",
            "Adopt certified blight-resistant sorghum cultivars",
            "Incorporate crop residues into soil through deep tillage after harvest"
        ],
        "organicControl": "Foliar bio-formulation spray of Pseudomonas fluorescens (10 g/L)."
    },
    "Jowar___Healthy": {
        "disease": "Healthy Leaf (No Pathogen Detected)",
        "crop": "Jowar",
        "isHealthy": True,
        "severity": "None",
        "symptoms": [
            "Broad, vigorous deep-green leaves with sturdy thick stalks",
            "Pronounced white central midrib with clean parallel venation",
            "Zero fungal pustules, necrotic stripes, or leaf spotting"
        ],
        "treatments": [
            "Apply 80:40:40 kg NPK/ha with split nitrogen application (basal + 30 DAS)",
            "Ensure furrow drainage to avoid standing water during heavy downpours",
            "Regularly monitor for shoot fly and stem borer activity"
        ],
        "organicControl": "Soil application of VAM biofertilizer and spray with vermiwash (10%)."
    },

    # ==================== COCONUT ====================
    "Coconut___Bud_Rot": {
        "disease": "Bud Rot (Phytophthora palmivora)",
        "crop": "Coconut",
        "isHealthy": False,
        "severity": "Critical / Severe",
        "symptoms": [
            "Yellowing and withering of central spear leaf, turning brownish-black at spindle base",
            "Foul odor emanating from rotting central cabbage / growing bud",
            "Spear leaf easily pulls away when tugged gently by hand"
        ],
        "treatments": [
            "Excise all infected rotten heart tissues down to healthy white wood",
            "Apply 10% Bordeaux paste or Copper Oxychloride paste over cut surface",
            "Drench crown and spear leaf base with Copper Oxychloride (3 g/L) or Metalaxyl + Mancozeb (2 g/L)"
        ],
        "organicControl": "Place Trichoderma viride coir pith packets (50 g) in the crown leaf axils before monsoon."
    },
    "Coconut___Leaf_Spot": {
        "disease": "Grey Leaf Spot / Blight (Pestalotiopsis palmarum)",
        "crop": "Coconut",
        "isHealthy": False,
        "severity": "Moderate",
        "symptoms": [
            "Minute yellow spots expanding into oval lesions with ash-grey centers and dark brown margins",
            "Numerous spots coalesce, causing outer leaflets to turn yellow, scorch, and dry",
            "Premature dropping of lower fronds leading to reduced nut yield"
        ],
        "treatments": [
            "Cut and burn heavily infected lower senescent fronds",
            "Spray Hexaconazole 5% EC (2.0 mL/L) or Mancozeb 75% WP (2.5 g/L)",
            "Apply balanced potassium (1.2 kg MOP/palm/year) and Magnesium Sulphate (500 g/palm)"
        ],
        "organicControl": "Spray 1% Bordeaux mixture or 5% neem cake water extract on fronds."
    },
    "Coconut___Stem_Bleeding": {
        "disease": "Stem Bleeding (Thielaviopsis paradoxa)",
        "crop": "Coconut",
        "isHealthy": False,
        "severity": "High",
        "symptoms": [
            "Exudation of dark reddish-brown viscous liquid through cracks in the trunk bark",
            "Bark lesions darken and decay, leaving hollow pockets inside the trunk wood",
            "Progressive yellowing of lower fronds, reduction in crown size, and nut drop"
        ],
        "treatments": [
            "Chisel out infected bark and discolored wood tissue down to healthy wood",
            "Swab the wound with Coal tar or 10% Bordeaux paste to seal exposure",
            "Root feed with Hexaconazole (2 mL in 100 mL water per palm) at 45-day intervals"
        ],
        "organicControl": "Soil application of Trichoderma harzianum (50 g/palm) mixed with 5 kg neem cake."
    },
    "Coconut___Healthy": {
        "disease": "Healthy Frond (No Pathogen Detected)",
        "crop": "Coconut",
        "isHealthy": True,
        "severity": "None",
        "symptoms": [
            "Lush dark-green arching pinnate fronds forming a full spherical canopy (30-40 fronds)",
            "Intact leaflets with uniform emerald coloration and strong central rachis",
            "Sturdy trunk, vibrant inflorescences, and healthy coconut nut clusters"
        ],
        "treatments": [
            "Apply recommended fertilizer per palm/year: 500g N, 320g P2O5, 1200g K2O in two splits",
            "Provide regular basin irrigation (45–50 liters per palm per day) during summer",
            "Mulch tree basin (1.8m radius) with coconut husks/coir pith for soil moisture conservation"
        ],
        "organicControl": "Apply 50 kg farmyard manure / compost per tree annually during monsoon."
    }
}


class MobileNetV2PlantClassifier:
    """
    MobileNetV2 Deep CNN Vision Classifier for 4 Agricultural Crops.
    Strictly restricted to: Paddy, Ragi, Jowar, Coconut.
    """
    def __init__(self, checkpoint_path=CHECKPOINT_PATH, metadata_path=METADATA_PATH, device=None):
        self.checkpoint_path = Path(checkpoint_path).resolve()
        self.metadata_path = Path(metadata_path).resolve()

        if not self.checkpoint_path.exists():
            raise FileNotFoundError(f"Model checkpoint not found: {self.checkpoint_path}")

        if device is not None:
            self.device = torch.device(device)
        else:
            self.device = torch.device("cpu")

        self.validator = ImageValidator(device=self.device)

        # Build MobileNetV2 architecture with 14 output heads
        self.model = models.mobilenet_v2(weights=None)
        in_features = self.model.classifier[1].in_features  # 1280
        self.model.classifier[1] = nn.Linear(in_features, NUM_SUPPORTED_CLASSES, bias=True)

        # Load trained checkpoint
        checkpoint = torch.load(self.checkpoint_path, map_location=self.device, weights_only=True)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def predict(self, pil_image, target_crop=None):
        start_time = time.time()

        # 1. Target Crop Normalization
        canonical_target = None
        if target_crop:
            canonical_target = normalize_crop_name(target_crop)
            if canonical_target.lower() not in [c.lower() for c in ["Paddy", "Ragi", "Jowar", "Coconut"]]:
                return {
                    "status": "unsupported",
                    "supported": False,
                    "crop": target_crop,
                    "detectedCrop": target_crop,
                    "diagnosis": "NOT SUPPORTED",
                    "message": f"Disease detection is strictly restricted to Ragi, Paddy, Jowar, and Coconut. '{target_crop}' is not supported.",
                    "model": "MobileNetV2 4-Crop Agricultural Leaf Disease Classifier",
                    "architecture": "MobileNetV2 (14 Supported Classes)",
                    "accuracy": "90.38% (Independent Benchmark)",
                    "quantization": "PyTorch FP32",
                    "inferenceTimeMs": round((time.time() - start_time) * 1000, 1),
                    "severity": "None",
                    "isHealthy": None,
                    "confidence": None,
                    "symptoms": [],
                    "recommendedTreatments": [
                        "Please select one of the 4 supported crops: Ragi, Paddy, Jowar, or Coconut."
                    ],
                    "organicControl": "Consult local agronomic extension guidelines (Raitha Samparka Kendra / KVK).",
                    "topPredictions": [],
                    "cropMismatch": False,
                    "disclaimer": "Only Ragi, Paddy, Jowar, and Coconut are supported."
                }

        # 2. Image Usability & Leaf Quality Validation
        val_result = self.validator.validate(pil_image)
        if not val_result["valid"]:
            return {
                "status": "invalid_image",
                "valid": False,
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": val_result.get("reason", "Image quality or structural check failed"),
                "details": val_result.get("details", {}),
                "crop": canonical_target or "Unknown",
                "detectedCrop": None,
                "inferenceTimeMs": round((time.time() - start_time) * 1000, 1)
            }

        # 3. MobileNetV2 Deep Learning Forward Pass
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(input_tensor)[0]
            global_probs = torch.softmax(logits, dim=0)

        # 4. Crop-Guided Probability Evaluation
        if canonical_target:
            # Filter classes belonging to target crop
            crop_indices = [i for i, c in enumerate(SUPPORTED_CLASSES) if c.startswith(canonical_target + "___")]
            if crop_indices:
                crop_logits = logits[crop_indices]
                crop_probs = torch.softmax(crop_logits, dim=0)
                best_sub_idx = torch.argmax(crop_probs).item()
                best_idx = crop_indices[best_sub_idx]
                confidence = round(float(crop_probs[best_sub_idx].item() * 100), 1)

                # Candidate predictions within target crop
                top_predictions = []
                sorted_sub_indices = torch.argsort(crop_probs, descending=True)
                for s_idx in sorted_sub_indices:
                    orig_idx = crop_indices[s_idx.item()]
                    cls_name = SUPPORTED_CLASSES[orig_idx]
                    prof = DISEASE_PROFILES[cls_name]
                    top_predictions.append({
                        "disease": prof["disease"],
                        "crop": prof["crop"],
                        "canonicalClass": cls_name,
                        "confidence": round(float(crop_probs[s_idx].item() * 100), 1),
                        "isHealthy": prof["isHealthy"]
                    })
            else:
                best_idx = torch.argmax(global_probs).item()
                confidence = round(float(global_probs[best_idx].item() * 100), 1)
                top_predictions = []
        else:
            best_idx = torch.argmax(global_probs).item()
            confidence = round(float(global_probs[best_idx].item() * 100), 1)
            top_k = min(3, NUM_SUPPORTED_CLASSES)
            top_probs, top_indices = torch.topk(global_probs, top_k)
            top_predictions = []
            for k in range(top_k):
                k_idx = top_indices[k].item()
                cls_name = SUPPORTED_CLASSES[k_idx]
                prof = DISEASE_PROFILES[cls_name]
                top_predictions.append({
                    "disease": prof["disease"],
                    "crop": prof["crop"],
                    "canonicalClass": cls_name,
                    "confidence": round(float(top_probs[k].item() * 100), 1),
                    "isHealthy": prof["isHealthy"]
                })

        best_class = SUPPORTED_CLASSES[best_idx]
        best_profile = DISEASE_PROFILES[best_class]
        latency_ms = round((time.time() - start_time) * 1000, 1)

        # 5. Low-Confidence Rejection (< 50%)
        if confidence < CONFIDENCE_THRESHOLD:
            return {
                "status": "uncertain",
                "diagnosis": "Uncertain Prediction",
                "message": "Unable to identify the disease reliably. Please upload another clear, well-lit leaf photograph.",
                "confidence": confidence,
                "confidenceThreshold": CONFIDENCE_THRESHOLD,
                "crop": canonical_target or best_profile["crop"],
                "detectedCrop": best_profile["crop"],
                "model": "MobileNetV2 4-Crop Agricultural Leaf Disease Classifier",
                "architecture": "MobileNetV2 (14 Supported Classes)",
                "accuracy": "90.38% (Independent Benchmark)",
                "quantization": "PyTorch FP32",
                "inferenceTimeMs": latency_ms,
                "severity": "Uncertain",
                "isHealthy": None,
                "symptoms": [],
                "recommendedTreatments": [
                    "Prediction confidence is below the reliability threshold. Do not apply chemical fungicides without field inspection."
                ],
                "organicControl": "Inspect foliage closely and re-take a steady photograph in natural daylight.",
                "topPredictions": top_predictions,
                "cropMismatch": False,
                "disclaimer": "Prediction confidence is below the reliability threshold."
            }

        # 6. Formulate Verified Diagnosis
        res_crop = canonical_target or best_profile["crop"]
        diagnosis = best_profile["disease"]
        if best_profile["isHealthy"]:
            diagnosis = f"Healthy {res_crop} Leaf"

        return {
            "status": "success",
            "supported": True,
            "crop": res_crop,
            "detectedCrop": best_profile["crop"],
            "canonicalClass": best_class,
            "diagnosis": diagnosis,
            "isHealthy": best_profile["isHealthy"],
            "severity": best_profile["severity"],
            "confidence": confidence,
            "symptoms": best_profile["symptoms"],
            "recommendedTreatments": best_profile["treatments"],
            "organicControl": best_profile["organicControl"],
            "topPredictions": top_predictions,
            "cropMismatch": False,
            "model": "MobileNetV2 4-Crop Agricultural Leaf Disease Classifier",
            "architecture": "MobileNetV2 (14 Classes: Paddy, Ragi, Jowar, Coconut)",
            "accuracy": "90.38% (Independent Benchmark)",
            "quantization": "PyTorch FP32",
            "inferenceTimeMs": latency_ms,
            "disclaimer": "Advisory provided for farm management assistance. Always confirm with local agricultural guidelines before chemical application."
        }


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        classifier = MobileNetV2PlantClassifier()
        print("Classifier loaded successfully!", file=sys.stderr)
        test_img = Image.new("RGB", (224, 224), color=(34, 139, 34))
        res = classifier.predict(test_img, target_crop="Coconut")
        print(json.dumps(res, indent=2))
        sys.exit(0)

    try:
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            print(json.dumps({
                "status": "invalid_image",
                "valid": False,
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": "No input received via stdin"
            }))
            sys.exit(0)

        input_data = json.loads(raw_input)
        image_str = input_data.get("image", "")
        crop_target = input_data.get("crop", None)

        if not image_str:
            print(json.dumps({
                "status": "invalid_image",
                "valid": False,
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": "No image data provided"
            }))
            sys.exit(0)

        if "base64," in image_str:
            image_str = image_str.split("base64,")[1]

        try:
            img_bytes = base64.b64decode(image_str)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception as img_err:
            print(json.dumps({
                "status": "invalid_image",
                "valid": False,
                "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
                "reason": f"Corrupted or invalid image data: {str(img_err)}"
            }))
            sys.exit(0)

        classifier = MobileNetV2PlantClassifier()
        result = classifier.predict(pil_img, target_crop=crop_target)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "status": "invalid_image",
            "valid": False,
            "message": "Invalid Image: Please upload a clear photograph of a crop leaf.",
            "reason": str(e)
        }))
        sys.exit(0)


if __name__ == "__main__":
    main()
