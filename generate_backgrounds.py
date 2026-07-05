import os
import sys
import json
import time
import base64
import subprocess

# Load Pixellab API Key from config
API_KEY = None
config_path = os.path.join(os.path.dirname(__file__), "src", "assets", "pixellab_config.json")
if os.path.exists(config_path):
    try:
        with open(config_path, "r") as f:
            config_data = json.load(f)
            API_KEY = config_data.get("pixellab_api_key")
    except Exception as e:
        print(f"Error reading pixellab_config.json: {e}")

if not API_KEY:
    print("Error: Pixellab API Key not found!")
    sys.exit(1)

def api_post(url, data):
    cmd = [
        "curl.exe", "-s", "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {API_KEY}",
        "-d", json.dumps(data),
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

def poll_job(job_id, filename=""):
    last_status = None
    while True:
        res = api_get(f"https://api.pixellab.ai/v2/background-jobs/{job_id}")
        
        if "detail" in res:
            raise RuntimeError(f"API Error for job {job_id}: {res['detail']}")
            
        status = res.get("status")
        if status is None:
            raise RuntimeError(f"Unexpected empty status for job {job_id}. Response: {res}")
            
        if status != last_status:
            print(f"[{filename}] Job status: {status}", flush=True)
            last_status = status
            
        if status == "completed":
            return res
        elif status == "failed":
            raise RuntimeError(f"Job {job_id} failed: {res}")
        elif status not in ["queued", "pending", "processing"]:
            raise RuntimeError(f"Unknown job status '{status}' for job {job_id}. Response: {res}")
            
        time.sleep(5)

def generate_background(prompt, filename):
    out_path = os.path.join("C:/Code2/rpg-scroller/src/assets/indoor", filename)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    if os.path.exists(out_path):
        print(f"SKIPPING: {filename} already exists.", flush=True)
        return

    print(f"Starting background generation: {filename} -> '{prompt}'", flush=True)
    payload = {
        "description": prompt,
        "image_size": {
            "width": 400,
            "height": 224
        }
    }
    
    time.sleep(1.5)
    
    res = api_post("https://api.pixellab.ai/v2/create-image-pixflux-background", payload)
    job_id = res.get("background_job_id")
    if not job_id:
        raise RuntimeError(f"[{filename}] No job ID returned! API response: {res}")
        
    job_res = poll_job(job_id, filename)
    
    last_resp = job_res.get("last_response", {})
    if not last_resp:
        raise RuntimeError(f"[{filename}] No last_response found in finished job!")
        
    image_data = last_resp.get("image", {})
    base64_str = image_data.get("base64")
    if not base64_str:
        raise RuntimeError(f"[{filename}] No base64 image data found in completed response!")
        
    # Write to target path
    with open(out_path, "wb") as fh:
        fh.write(base64.b64decode(base64_str))
    print(f"SUCCESS: Saved background to {out_path}", flush=True)

BACKGROUNDS = {
    # 6 new recruitment indoor locations
    "bg_warrior_guild.png": "16-bit side-view interior of a medieval warrior guildhall. Empty room, no people, no characters, stone walls, weapon racks with swords and shields, wooden training dummies, shield emblems on the wall, warm torchlight, pixel art background",
    "bg_magic_guild.png": "16-bit side-view interior of an arcane magic guildhall. Empty room, no people, no characters, stone walls covered in glowing blue runes, magic spellbooks on pedestals, cauldrons with bubbling purple magic, starry cosmic window, pixel art background",
    "bg_temple_sanctum.png": "16-bit side-view interior of a holy temple sanctum. Empty room, no people, no characters, large stained glass windows, marble pillars, candle stands, gold altar with glowing divine light, pixel art background",
    "bg_ranger_lodge.png": "16-bit flat 2D side-view straight-on interior view of a wooden ranger cabin room. Log walls, animal furs, weapon racks with bows, rustic furniture, fireplace with burning logs. Strictly straight-on 2D side-scroller view, no angle, no isometric view, black background outside the windows, pixel art background",
    "bg_elven_sanctum.png": "16-bit side-view interior of an elegant elven sanctuary. Empty room, no people, no characters, white marble walls, glowing green mystical trees growing indoors, elven leaf motifs, floating magic light globes, training room, pixel art background",
    "bg_witches_coven.png": "16-bit flat 2D side-view straight-on interior of a dark witch's coven hut. Dark wooden logs, shelves with skulls and potion bottles, large green bubbling cauldron in the center. Strictly straight-on 2D side-scroller perspective, flat view, no angle, no isometric view, pixel art background",

    # Original indoor locations
    "bg_tavern.png": "16-bit side-view interior of a cozy medieval fantasy tavern. Empty room, no people, no characters, wooden tables and chairs, a stone hearth fireplace with burning log fire, barrels of ale behind the bar, warm golden lighting, pixel art background",
    "bg_blacksmith.png": "16-bit flat 2D side-view straight-on interior of a medieval blacksmith forge. Empty room, no people, no characters, stone walls, large hot coal forge, anvil on a wooden stump, hammers and metal tools on tables, molten iron flowing, steam rising. Strictly straight-on 2D side-scroller perspective, flat orthographic view, no angle, no perspective distortion, pixel art background",
    "bg_apothecary.png": "16-bit flat 2D side-view straight-on interior of a fantasy alchemist apothecary shop. Shelves lined with colorful potion bottles, dried herbs hanging from the ceiling, bubbling cauldron on a stove, alchemy circles, mysterious and mystical green glow. Strictly straight-on 2D side-scroller perspective, flat orthographic view, no angle, no perspective distortion, pixel art background",
    "bg_guild_hall.png": "16-bit side-view interior of an adventurer guildhall. Empty room, no people, no characters, large wooden bulletin board with bounty posters, shields and banners hanging on the walls, long wooden tables, a grand fireplace, pixel art background",
    "bg_temple.png": "16-bit side-view interior of a majestic fantasy cathedral temple. Empty room, no people, no characters, high arches, stone columns, stained glass windows letting in streams of light, prayer benches, gold altar with glowing holy relics, pixel art background",
    "bg_library.png": "16-bit side-view interior of a grand arcane library. Empty room, no people, no characters, floor-to-ceiling wooden bookshelves packed with ancient scrolls and books, reading tables with candles, ladders leaning on shelves, pixel art background",
    "bg_training_grounds.png": "16-bit flat 2D side-view straight-on interior of a medieval indoor training barracks. Empty room, stone and wooden walls, weapon racks with iron training swords and shields, archery targets, combat dummies. Strictly straight-on 2D side-scroller perspective, flat orthographic view, no angle, no isometric view, warm torchlight, pixel art background",
    "bg_throne_room.png": "16-bit side-view interior of a grand medieval palace throne room. Empty room, no people, no characters, red carpets leading to a golden throne, tall stone pillars, royal banners hanging, high vaulted ceilings, pixel art background",
    "bg_cottage.png": "16-bit side-view interior of a cozy, comfortable medieval cottage home. Empty room, no people, no characters, wooden floor, dining table, fireplace, a comfortable bed, warm hearth fire, simple rustic furniture, pixel art background",
    "bg_heaven_throne.png": "16-bit side-view interior of a celestial grand hall. Empty room, no people, no characters, white marble floors, golden pillars, glowing white light, angelic halos floating, celestial throne made of pure light, pixel art background"
}

if __name__ == "__main__":
    print("=== PIXELLAB BACKGROUND GENERATOR ===")
    for filename, prompt in BACKGROUNDS.items():
        try:
            generate_background(prompt, filename)
        except Exception as e:
            print(f"FAILED to generate {filename}: {e}", file=sys.stderr)
            time.sleep(2)
    print("=== BACKGROUND GENERATOR COMPLETE ===")
