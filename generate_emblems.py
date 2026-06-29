import subprocess
import json
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

# Pixellab API Key
API_KEY = "9995495e-4f0a-4376-88c6-c49eb29d8179"

def api_post(url, data):
    payload = json.dumps(data)
    cmd = [
        "curl.exe", "-s",
        "-H", f"Authorization: Bearer {API_KEY}",
        "-H", "Content-Type: application/json",
        "-d", payload,
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"curl POST failed: {res.stderr}")
    try:
        return json.loads(res.stdout)
    except Exception as e:
        raise RuntimeError(f"Failed to parse JSON response: {res.stdout}. Error: {e}")

def api_get(url):
    cmd = [
        "curl.exe", "-s",
        "-H", f"Authorization: Bearer {API_KEY}",
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"curl GET failed: {res.stderr}")
    try:
        return json.loads(res.stdout)
    except Exception as e:
        raise RuntimeError(f"Failed to parse JSON response: {res.stdout}. Error: {e}")

def download_file(url, out_path):
    cmd = [
        "curl.exe", "-s",
        "-o", out_path,
        url
    ]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(f"curl download failed: {res.stderr}")

def poll_job(job_id, filename=""):
    last_status = None
    while True:
        res = api_get(f"https://api.pixellab.ai/v2/background-jobs/{job_id}")
        status = res.get("status")
        if status != last_status:
            print(f"[{filename}] Job status: {status}", flush=True)
            last_status = status
        if status == "completed":
            return res
        elif status == "failed":
            raise RuntimeError(f"Job {job_id} failed: {res}")
        time.sleep(5)

def generate_single_emblem(prompt, filename):
    out_path = os.path.join("C:/Code2/rpg-scroller/src/assets/emblems", filename)
    if os.path.exists(out_path):
        print(f"SKIPPING: {filename} already exists.", flush=True)
        return

    print(f"Starting: {filename} -> '{prompt}'", flush=True)
    payload = {
        "description": prompt
    }
    
    # Introduce a small stagger to avoid spamming the rate limiter on start
    time.sleep(1.5)
    
    res = api_post("https://api.pixellab.ai/v2/create-1-direction-object", payload)
    job_id = res.get("background_job_id")
    if not job_id:
        raise RuntimeError(f"[{filename}] No job ID returned! API response: {res}")
        
    job_res = poll_job(job_id, filename)
    object_id = job_res.get("result", {}).get("object_id")
    if not object_id:
        object_id = res.get("object_id")
    if not object_id:
        raise RuntimeError(f"[{filename}] No object ID found!")
        
    obj_details = api_get(f"https://api.pixellab.ai/v2/objects/{object_id}")
    
    urls = obj_details.get("frame_urls", [])
    if not urls:
        rotations = obj_details.get("rotations", {})
        if "default" in rotations:
            urls = rotations["default"]
        elif "east" in rotations:
            urls = rotations["east"]
        elif isinstance(rotations, list):
            urls = rotations
            
    if not urls:
        urls = obj_details.get("frames", [])
        
    if not urls:
        raise RuntimeError(f"[{filename}] No frames found!")
        
    first_frame_url = urls[0]
    
    scratch_dir = "C:/Users/stefd/.gemini/antigravity/brain/9631c907-b2e6-461f-b379-d95a5c05f369/scratch/emblem_frames"
    os.makedirs(scratch_dir, exist_ok=True)
    temp_path = os.path.join(scratch_dir, f"temp_{filename}")
    
    download_file(first_frame_url, temp_path)
    
    # Process icon to 128x128 (canonical emblem dimensions)
    img = Image.open(temp_path)
    img_resized = img.resize((128, 128), Image.Resampling.LANCZOS)
    
    img_resized.save(out_path)
    print(f"SUCCESS: Generated {out_path}", flush=True)

def main():
    emblems = [
        ("medieval heraldic shield emblem featuring a golden lion, 2d pixel art icon, transparent background", "emblem_unknown_5.png"),
        ("medieval heraldic shield emblem featuring a blue eagle, 2d pixel art icon, transparent background", "emblem_unknown_6.png"),
        ("medieval heraldic shield emblem featuring a silver wolf, 2d pixel art icon, transparent background", "emblem_unknown_7.png"),
        ("medieval heraldic shield emblem featuring a red dragon, 2d pixel art icon, transparent background", "emblem_unknown_8.png"),
        ("medieval heraldic shield emblem featuring a green griffin, 2d pixel art icon, transparent background", "emblem_unknown_9.png"),
        ("medieval heraldic shield emblem featuring a black bear, 2d pixel art icon, transparent background", "emblem_unknown_10.png"),
        ("medieval heraldic shield emblem featuring a white unicorn, 2d pixel art icon, transparent background", "emblem_unknown_11.png"),
        ("medieval heraldic shield emblem featuring a golden stag, 2d pixel art icon, transparent background", "emblem_unknown_12.png"),
        ("medieval heraldic shield emblem featuring a bronze boar, 2d pixel art icon, transparent background", "emblem_unknown_13.png"),
        ("medieval heraldic shield emblem featuring a purple serpent, 2d pixel art icon, transparent background", "emblem_unknown_14.png"),
        ("medieval heraldic shield emblem featuring an emerald turtle, 2d pixel art icon, transparent background", "emblem_unknown_15.png"),
        ("medieval heraldic shield emblem featuring an iron anvil, 2d pixel art icon, transparent background", "emblem_unknown_16.png"),
        ("medieval heraldic shield emblem featuring a crimson skull, 2d pixel art icon, transparent background", "emblem_unknown_17.png"),
        ("medieval heraldic shield emblem featuring a golden wheat sheaf, 2d pixel art icon, transparent background", "emblem_unknown_18.png"),
        ("medieval heraldic shield emblem featuring a silver crescent moon, 2d pixel art icon, transparent background", "emblem_unknown_19.png"),
        ("medieval heraldic shield emblem featuring a burning torch, 2d pixel art icon, transparent background", "emblem_unknown_20.png"),
        ("medieval heraldic shield emblem featuring crossed swords, 2d pixel art icon, transparent background", "emblem_unknown_21.png"),
        ("medieval heraldic shield emblem featuring a blue anchor, 2d pixel art icon, transparent background", "emblem_unknown_22.png"),
        ("medieval heraldic shield emblem featuring a golden crown, 2d pixel art icon, transparent background", "emblem_unknown_23.png"),
        ("medieval heraldic shield emblem featuring a red rose, 2d pixel art icon, transparent background", "emblem_unknown_24.png"),
        ("medieval heraldic shield emblem featuring a green oak tree, 2d pixel art icon, transparent background", "emblem_unknown_25.png"),
        ("medieval heraldic shield emblem featuring a golden star, 2d pixel art icon, transparent background", "emblem_unknown_26.png"),
        ("medieval heraldic shield emblem featuring a white tower, 2d pixel art icon, transparent background", "emblem_unknown_27.png"),
        ("medieval heraldic shield emblem featuring a black raven, 2d pixel art icon, transparent background", "emblem_unknown_28.png"),
        ("medieval heraldic shield emblem featuring a silver key, 2d pixel art icon, transparent background", "emblem_unknown_29.png"),
        ("medieval heraldic shield emblem featuring a golden harp, 2d pixel art icon, transparent background", "emblem_unknown_30.png"),
        ("medieval heraldic shield emblem featuring a blue wave, 2d pixel art icon, transparent background", "emblem_unknown_31.png"),
        ("medieval heraldic shield emblem featuring a red phoenix, 2d pixel art icon, transparent background", "emblem_unknown_32.png"),
        ("medieval heraldic shield emblem featuring a golden trident, 2d pixel art icon, transparent background", "emblem_unknown_33.png"),
        ("medieval heraldic shield emblem featuring a green basilisk, 2d pixel art icon, transparent background", "emblem_unknown_34.png"),
        ("medieval heraldic shield emblem featuring a purple chimera, 2d pixel art icon, transparent background", "emblem_unknown_35.png"),
        ("medieval heraldic shield emblem featuring a silver pegasus, 2d pixel art icon, transparent background", "emblem_unknown_36.png"),
        ("medieval heraldic shield emblem featuring a black stallion, 2d pixel art icon, transparent background", "emblem_unknown_37.png"),
        ("medieval heraldic shield emblem featuring a white lily, 2d pixel art icon, transparent background", "emblem_unknown_38.png"),
        ("medieval heraldic shield emblem featuring a golden chalice, 2d pixel art icon, transparent background", "emblem_unknown_39.png"),
        ("medieval heraldic shield emblem featuring a red gauntlet, 2d pixel art icon, transparent background", "emblem_unknown_40.png"),
        ("medieval heraldic shield emblem featuring a blue scale of justice, 2d pixel art icon, transparent background", "emblem_unknown_41.png"),
        ("medieval heraldic shield emblem featuring a silver compass, 2d pixel art icon, transparent background", "emblem_unknown_42.png"),
        ("medieval heraldic shield emblem featuring a green bow and arrow, 2d pixel art icon, transparent background", "emblem_unknown_43.png"),
        ("medieval heraldic shield emblem featuring a golden horn, 2d pixel art icon, transparent background", "emblem_unknown_44.png"),
        ("medieval heraldic shield emblem featuring a black battleaxe, 2d pixel art icon, transparent background", "emblem_unknown_45.png"),
        ("medieval heraldic shield emblem featuring a silver cross, 2d pixel art icon, transparent background", "emblem_unknown_46.png"),
        ("medieval heraldic shield emblem featuring a golden fleece, 2d pixel art icon, transparent background", "emblem_unknown_47.png"),
        ("medieval heraldic shield emblem featuring a red lightning bolt, 2d pixel art icon, transparent background", "emblem_unknown_48.png")
    ]
    
    # We lower max_workers to 3 to reduce the chance of triggering Pixellab rate limiting
    # while the other 120 icon script is concurrently running.
    print(f"Spawning generation queue using 3 concurrent workers...", flush=True)
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(generate_single_emblem, prompt, filename): filename for prompt, filename in emblems}
        for future in as_completed(futures):
            filename = futures[future]
            try:
                future.result()
            except Exception as exc:
                print(f"ERROR: {filename} generated an exception: {exc}", flush=True)

if __name__ == "__main__":
    main()
