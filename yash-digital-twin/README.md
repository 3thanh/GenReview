# Yash Digital Twin

Digital twin of Yash from [Clay University: Clay 101](https://www.youtube.com/playlist?list=PLOk1iliTgMrWWrQOFtK69xzHkBhF75Jjm) — visual avatar + cloned voice.

## Assets

### Visual (Digital Twin)
| File | Description |
|------|-------------|
| `assets/yash_headshot_01.png` | Clean 500x500 headshot (pink shirt) |
| `assets/yash_headshot_02.png` | Clean 500x500 headshot (pink shirt, smiling) |
| `assets/yash_headshot_03.png` | Clean 500x500 headshot (grey sweater) |
| `assets/yash_talking_head_30s.mp4` | 30s talking head video clip |
| `assets/yash_talking_head_60s.mp4` | 60s talking head video clip |
| `frames/` | 10 full-frame 1280x720 reference screenshots |

### Audio (Voice Clone)
| File | Description |
|------|-------------|
| `assets/yash_voice_training_full.wav` | ~1h51m full training audio (mono, 22050Hz) |
| `assets/yash_voice_30min_sample.wav` | 30-minute sample |
| `assets/yash_voice_5min_sample.wav` | 5-minute sample |
| `assets/yash_voice_1min_sample.wav` | 1-minute sample |
| `audio/` | 23 individual lesson WAV files |

## Quick Start

### 1. Clone Voice (ElevenLabs)

```bash
export ELEVENLABS_API_KEY="your-key"
python3 clone_voice.py
```

This uploads 4 diverse audio samples and creates a voice clone named "Yash - Clay". It also generates a test speech sample.

### 2. Generate Digital Twin Video (HeyGen)

```bash
export HEYGEN_API_KEY="your-key"
python3 generate_avatar.py
```

This uploads Yash's headshot, creates a photo avatar, and generates a talking avatar video. If you have an Enterprise plan, it will also attempt to train an Instant Avatar from the 60s video clip.

### Alternative: Manual Upload

You can manually upload assets to these platforms:

- **ElevenLabs**: Upload any WAV file from `audio/` → Voices → Add Voice → Instant Voice Cloning
- **HeyGen**: Upload headshot from `assets/` → Avatars → Photo Avatar
- **D-ID**: Upload headshot + audio for animated talking head
- **Synthesia**: Upload headshot for avatar training

## Source Data

23 videos from Clay University Clay 101 playlist, totaling ~1h51m of Yash speaking to camera in a studio setting with acoustic panels. Clean audio, consistent lighting, multiple outfits.
