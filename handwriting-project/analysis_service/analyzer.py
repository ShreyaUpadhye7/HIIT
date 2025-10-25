import os
import json
import numpy as np
import dotenv
import requests
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
from io import BytesIO

# Load environment variables
dotenv.load_dotenv()

# The path to your models and JSON files
MODELS_PATH = os.path.join(os.path.dirname(__file__), 'models')

class HandwritingAnalyzer:
    def __init__(self, models_path):
        print("Loading models...")
        try:
            # Load Keras CNN Models (renamed to remove spaces)
            self.dheight_model = load_model(os.path.join(models_path, 'best_dheight_model.keras'))
            self.dloop_model = load_model(os.path.join(models_path, 'best_dloop_model.keras'))
            self.gloop_model = load_model(os.path.join(models_path, 'best_gloop_model.keras'))
            self.t_mirrored_model = load_model(os.path.join(models_path, 'best_t_mirrored_model.keras'))
            self.tloop_model = load_model(os.path.join(models_path, 'best_tloop_model.keras'))
            self.ttall_model = load_model(os.path.join(models_path, 'best_ttall_model.keras'))
            self.yloop_model = load_model(os.path.join(models_path, 'best_yloop_model.keras'))

            # Load JSON Thresholds (renamed to remove spaces)
            with open(os.path.join(models_path, 'pressure_model.json'), 'r') as f:
                self.pressure_thresholds = json.load(f)
            with open(os.path.join(models_path, 'spacing_model.json'), 'r') as f:
                self.spacing_thresholds = json.load(f)

            print("Models loaded successfully!")
        except Exception as e:
            print(f"Error loading models or thresholds: {str(e)}")
            raise

    def _predict_pressure(self, file_object):
        try:
            file_object.seek(0)  # Ensure pointer is at the start
            with Image.open(file_object) as img:
                grayscale_img = img.convert('L')
                np_img = np.array(grayscale_img)
                avg_pixel_value = np.mean(np_img)
                print(f"Average Pixel Intensity (Pressure): {avg_pixel_value}")
                if avg_pixel_value < self.pressure_thresholds['low_threshold']:
                    return 'heavy'
                elif avg_pixel_value > self.pressure_thresholds['high_threshold']:
                    return 'light'
                else:
                    return 'medium'
        except Exception as e:
            print(f"Error calculating pressure: {str(e)}")
            return 'medium'

    def _predict_spacing(self, ocr_result):
        try:
            word_gaps = []
            lines = ocr_result.get('ParsedResults', [{}])[0].get('TextOverlay', {}).get('Lines', [])
            for line in lines:
                words = sorted(line.get('Words', []), key=lambda w: w.get('Left', 0))
                for i in range(len(words) - 1):
                    current_word = words[i]
                    next_word = words[i + 1]
                    gap = next_word.get('Left', 0) - (current_word.get('Left', 0) + current_word.get('Width', 0))
                    if gap > 0:
                        word_gaps.append(gap)
            if len(word_gaps) < 2:
                return 'very even'
            std_dev = np.std(word_gaps)
            print(f"Standard Deviation of Word Gaps (Spacing): {std_dev}")
            if std_dev < self.spacing_thresholds['very_even_thresh']:
                return 'very even'
            elif std_dev < self.spacing_thresholds['slightly_even_thresh']:
                return 'even'
            elif std_dev < self.spacing_thresholds['uneven_thresh']:
                return 'uneven'
            else:
                return 'very uneven'
        except Exception as e:
            print(f"Error calculating spacing: {str(e)}")
            return 'even'

    def _perform_ocr(self, file_object, filename='uploaded_image.png'):
        try:
            api_key = os.getenv("OCR_SPACE_API_KEY")
            if not api_key:
                raise ValueError("OCR_SPACE_API_KEY is not set.")
            
            file_object.seek(0)  # Ensure pointer is at the start
            image_content = file_object.read()  # Read the content
            
            payload = {'apikey': api_key, 'isOverlayRequired': True}
            response = requests.post(
                'https://api.ocr.space/parse/image',
                data=payload,
                files={'filename': (filename, image_content, 'image/png')}
            )
            response.raise_for_status()
            result = response.json()
            if result.get('IsErroredOnProcessing'):
                raise Exception(f"OCR.space Error: {result.get('ErrorMessage', 'Unknown error')}")
            return result
        except Exception as e:
            print(f"Error during OCR.space API call: {str(e)}")
            return None

    def _crop_letters(self, original_image, ocr_result, letters_to_find=['g', 'y', 't', 'd', 'e']):
        cropped_letters = {}
        if not ocr_result:
            return cropped_letters
        try:
            lines = ocr_result.get('ParsedResults', [{}])[0].get('TextOverlay', {}).get('Lines', [])
            for line in lines:
                for word in line.get('Words', []):
                    word_text_clean = ''.join(filter(str.isalpha, word.get('WordText', '').lower()))
                    # Check each character in the word
                    for char in word_text_clean:
                        if char in letters_to_find and char not in cropped_letters:
                            box = (
                                word.get('Left', 0),
                                word.get('Top', 0),
                                word.get('Left', 0) + word.get('Width', 0),
                                word.get('Top', 0) + word.get('Height', 0)
                            )
                            # Ensure box coordinates are valid
                            if box[2] > box[0] and box[3] > box[1]:
                                cropped_letters[char] = original_image.crop(box)
                            break  # Only crop the first occurrence of the letter
            return cropped_letters
        except Exception as e:
            print(f"Error during letter cropping: {str(e)}")
            return cropped_letters

    def _preprocess_image(self, pil_image, target_size=(128, 128)):
        try:
            img = pil_image.convert('L')
            img = img.resize(target_size)
            img_array = img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array /= 255.0
            return img_array
        except Exception as e:
            print(f"Error preprocessing image: {str(e)}")
            return None

    def _predict_from_cnn_models(self, cropped_letters):
        predictions = {}
        try:
            if 'g' in cropped_letters:
                g_loop_labels = ['absent', 'balanced']
                img_array = self._preprocess_image(cropped_letters['g'])
                if img_array is not None:
                    pred = self.gloop_model.predict(img_array)[0]
                    predictions['g_loop'] = g_loop_labels[np.argmax(pred)]

            if 'y' in cropped_letters:
                y_loop_labels = ['absent', 'balanced']
                img_array = self._preprocess_image(cropped_letters['y'])
                if img_array is not None:
                    pred = self.yloop_model.predict(img_array)[0]
                    predictions['y_loop'] = y_loop_labels[np.argmax(pred)]

            if 'd' in cropped_letters:
                d_height_labels = ['normal', 'tall']
                d_loop_labels = ['normal_loop', 'wide_loop']
                img_d = self._preprocess_image(cropped_letters['d'])
                if img_d is not None:
                    pred_height = self.dheight_model.predict(img_d)[0]
                    pred_loop = self.dloop_model.predict(img_d)[0]
                    predictions['d_height'] = d_height_labels[np.argmax(pred_height)]
                    predictions['d_loop'] = d_loop_labels[np.argmax(pred_loop)]

            if 't' in cropped_letters:
                t_height_labels = ['normal', 'tall']
                t_loop_labels = ['normal_bar', 'heavy_bar']
                t_mirrored_labels = ['normal_lean', 'left_lean']
                img_t = self._preprocess_image(cropped_letters['t'])
                if img_t is not None:
                    pred_tall = self.ttall_model.predict(img_t)[0]
                    pred_loop = self.tloop_model.predict(img_t)[0]
                    pred_mirrored = self.t_mirrored_model.predict(img_t)[0]
                    predictions['t_height'] = t_height_labels[np.argmax(pred_tall)]
                    predictions['t_bar'] = t_loop_labels[np.argmax(pred_loop)]
                    predictions['t_lean'] = t_mirrored_labels[np.argmax(pred_mirrored)]
        except Exception as e:
            print(f"Error during CNN model prediction: {str(e)}")
        return predictions

    def _calculate_final_result(self, predictions):
        relapse_score = 0
        recovery_score = 0
        # Define default values for missing predictions
        default_predictions = {
            'pressure': 'medium',
            'spacing': 'even',
            'g_loop': 'balanced',
            'y_loop': 'balanced',
            'd_height': 'normal',
            't_height': 'normal',
            'd_loop': 'normal_loop',
            't_lean': 'normal_lean',
            't_bar': 'normal_bar'
        }
        # Merge actual predictions with defaults
        all_predictions = {**default_predictions, **predictions}

        if all_predictions['pressure'] in ['light', 'heavy']:
            relapse_score += 1
        elif all_predictions['pressure'] == 'medium':
            recovery_score += 1
        if all_predictions['spacing'] in ['uneven', 'very uneven']:
            relapse_score += 1
        elif all_predictions['spacing'] in ['even', 'very even']:
            recovery_score += 1
        if all_predictions['g_loop'] == 'absent':
            relapse_score += 1
        elif all_predictions['g_loop'] == 'balanced':
            recovery_score += 1
        if all_predictions['y_loop'] == 'absent':
            relapse_score += 1
        elif all_predictions['y_loop'] == 'balanced':
            recovery_score += 1
        if all_predictions['d_height'] == 'tall':
            relapse_score += 1
        if all_predictions['t_height'] == 'tall':
            relapse_score += 1
        if all_predictions['d_loop'] == 'wide_loop':
            relapse_score += 1
        if all_predictions['t_lean'] == 'left_lean':
            relapse_score += 1
        if all_predictions['t_bar'] == 'heavy_bar':
            relapse_score += 1
        elif all_predictions['t_bar'] == 'normal_bar':
            recovery_score += 1

        final_prediction = "Inconclusive"
        if relapse_score > recovery_score:
            final_prediction = "Relapse Risk"
        elif recovery_score > relapse_score:
            final_prediction = "Recovery"
        return {
            "prediction": final_prediction,
            "scores": {"relapse": relapse_score, "recovery": recovery_score},
            "features": all_predictions
        }

    def analyze(self, file_object):
        print(f"Analyzing in-memory file...")
        try:
            # Perform OCR
            ocr_result = self._perform_ocr(file_object)
            if not ocr_result:
                return {"error": "OCR processing failed or returned no results."}

            file_object.seek(0)  # Reset pointer before opening with PIL
            with Image.open(file_object) as original_image:
                cropped_letters = self._crop_letters(original_image.copy(), ocr_result)
            
            cnn_predictions = self._predict_from_cnn_models(cropped_letters)
            file_object.seek(0)  # Reset pointer for pressure prediction
            pressure_prediction = self._predict_pressure(file_object)
            spacing_prediction = self._predict_spacing(ocr_result)

            all_predictions = {**cnn_predictions, "pressure": pressure_prediction, "spacing": spacing_prediction}
            
            final_result = self._calculate_final_result(all_predictions)
            
            print("Analysis complete.")
            return final_result
        except Exception as e:
            print(f"An error occurred during analysis: {str(e)}")
            return {"error": f"An internal error occurred: {str(e)}"}