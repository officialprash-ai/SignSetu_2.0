# SignSetu Technical Build Guide: AI-Powered Sign Language Translation Bridge

## TL;DR
- **Build SignSetu as a pose-based pipeline, not a HamNoSys/SiGML one.** Use OpenAI Whisper (speech) → LLM/MarianMT text-to-gloss → a gloss-to-pose lookup against a sign dictionary → a React Three Fiber avatar that plays MediaPipe Holistic pose sequences. Adopt the proven open-source architecture of sign.mt's `spoken-to-signed-translation` engine rather than inventing your own.
- **ASL is feasible today; ISL is the hard constraint.** Strong open ASL assets exist (WLASL 2,000 words, How2Sign ~80h, ASL-LEX 2,723 signs). For ISL, the largest open corpora are CISLR (7,050 videos / ~4,765 words) and iSign (118,228 pairs) — but all are CC-BY-NC (non-commercial), and there is no openly downloadable ISL HamNoSys/SiGML animation dataset. Plan ISL as a smaller curated dictionary plus fingerspelling fallback.
- **Deploy Next.js on Vercel, but host the FastAPI ML backend on Railway or Render — not Vercel serverless.** Whisper, yt-dlp, and pose processing exceed Vercel's serverless limits. Use Firebase for Auth, Firestore (dictionary index + session history), and Storage (pose/GLB animation files with aggressive caching).

## Key Findings

### The core architectural decision
There are two competing approaches to text-to-sign avatars, and choosing correctly is the single most important decision for this project:

1. **HamNoSys/SiGML → JASigning (CWASA) avatar** — the academic standard from University of East Anglia. You author each sign in Hamburg Notation (HamNoSys, ~200 phonetic characters), convert to SiGML (XML), and a Java/WebGL avatar (avatars "anna", "marc", "francoise") renders it. Pros: parametric, compact, linguistically precise. Cons: JASigning is described in the literature as "a piece of research software that in practice has posed an insurmountable challenge to most linguists without a computer science background"; it is Java-based and awkward to embed in a modern Next.js/Three.js app.

2. **Pose-based (text → gloss → pose → avatar/video)** — the modern open-source standard, used by sign.mt (Amit Moryossef, EMNLP 2024) and Speak2Sign3D (arXiv 2507.06530, July 2025). Signs are stored as MediaPipe Holistic skeletal keypoint sequences (.pose files), retrieved per-gloss from a lexicon, concatenated with interpolation, and either rendered to a 3D avatar via bone retargeting or shown as pose video. This is the recommended path for SignSetu: it fits the JS/Three.js stack, has working open-source code, and is dataset-driven.

**Recommendation: build the pose-based pipeline.** Use the HamNoSys/SiGML route only as an optional secondary renderer if you later need parametric signs not present in any dataset.

### 1. Sign Language Datasets & Libraries

**ASL datasets (strong availability):**
- **WLASL** — 2,000 word-level glosses, ~21,083 video samples, 119 signers, JSON gloss index (`WLASL_vx.x.json`). Subsets WLASL100/300/1000/2000. License: Computational Use of Data Agreement (C-UDA), academic/non-commercial only. GitHub: `dxli94/WLASL`; also on HuggingFace (`Voxel51/WLASL`).
- **MS-ASL** — ~25,000 samples, 1,000 vocabulary, 222 signers. Word-level only (no continuous grammar).
- **How2Sign** — largest public continuous ASL dataset: ~80 hours, 16k vocabulary, 11 signers, multimodal (RGB, depth, 2D/3D pose, speech, English transcripts). A 3-hour subset has Panoptic-studio 3D pose. License: CC BY-NC 4.0, research only. Site: how2sign.github.io.
- **ASL-LEX 2.0** — lexical database of 2,723 signs with 60+ phonological properties, frequency, iconicity ratings, sign durations, lexical class. Download via OSF (osf.io/zpha4) and asl-lex.org. This is the best lexicon for phonological metadata, not raw video.
- **Phoenix-2014T** — German Sign Language (DGS), weather domain, ~11 hours, 3k vocabulary. Useful as a gloss-translation benchmark, not ASL.
- **ChicagoFSWild / ChicagoFSWild+** — fingerspelling, 7,304 / 55,232 sequences. Useful for the fingerspelling fallback.
- **SignAvatars** (ECCV 2024, `ZhengdiYu/SignAvatars`) — large-scale 3D sign language holistic motion dataset with SMPL-X/MANO annotations; directly relevant for 3D avatar motion.

**ISL datasets (the bottleneck):**
- **CISLR** (EMNLP 2022, IIT-Kanpur Exploration Lab) — 7,050 videos covering ~4,765 words, 71 signers, ~1.5 videos/word (one-shot regime). HuggingFace: `Exploration-Lab/CISLR`. License: CC-BY-NC.
- **ISLTranslate** (Findings of ACL 2023) — 31k continuous ISL-English sentence/phrase pairs. GitHub: `Exploration-Lab/ISLTranslate`. License: CC-BY-NC 4.0. Ships `ISLTranslate.csv` + video tarballs + MediaPipe holistic pose archives.
- **iSign** (Findings of ACL 2024) — the largest ISL dataset: 118,228 video–English pairs (incorporates ISLTranslate + CISLR after author permissions). Pose files in pose-format (.pose). Gated HuggingFace download (`Exploration-Lab/iSign`), free for research. License: CC-BY-NC-SA 4.0.
- **ISL-CSLTR** (Elakkiya & Natarajan, Mendeley/Kaggle) — 700 videos, 18,863 sentence-level frames, 1,036 word-level images, 100 sentences, 7 signers.
- **INCLUDE** (AI4Bharat) — 263 isolated signs, 7 signers.
- **ISLRTC ISL Dictionary** — Government of India (Ministry of Social Justice & Empowerment) 3rd edition, 10,000 terms, released February 2021, hosted as videos on the ISLRTC YouTube channel and islrtc.nic.in. This is the authoritative ISL source but is published as video (no machine-readable gloss/pose export); you would need to run MediaPipe Holistic over the videos yourself to build poses.

**ISL HamNoSys/SiGML data:** There is no large openly downloadable ISL HamNoSys dataset. The largest documented is a 2,950-word HamNoSys→SiGML corpus (Kumar et al., ACM TALLIP, 10.1145/3384202) built from ISLRTC videos, but it is not publicly hosted for download. Kaur & Kumar's foundational HamNoSys→SiGML automation work (Procedia CS 2016) covers ~250 words and is a method paper with no attached dataset. Directly downloadable HamNoSys+SiGML exemplars exist only for non-ISL languages (Spanish LSE_Lex40_UVIGO: 754 signs / 6,786 videos with HamNoSys + MediaPipe; Algerian 3DZSignDB: 417 words as .sigml files with a Three.js web simulator) — these are useful as structural templates.

**Libraries/packages:**
- `pose-format` (PyPI `pose-format`, GitHub `sign-language-processing/pose`) — read/write/visualize/augment .pose files; `video_to_pose` CLI converts video→.pose via MediaPipe; has Python and JS readers.
- `spoken-to-signed` (PyPI; GitHub `sign-language-processing/spoken-to-signed-translation`, MIT license) — the text→gloss→pose engine behind sign.mt. Install: `pip install spoken-to-signed`. Download a lexicon: `download_lexicon --name <signsuisse> --directory <path>`. Produce a `.pose` from text: `text_to_gloss_to_pose --text "<input>" --glosser <simple|spacylemma|rules|nmt> --lexicon <path> --spoken-language <de|fr|it> --signed-language <sgg|ssr|slf> --pose out.pose`. The lexicon is a directory + CSV index mapping glosses to `.pose`/video files (columns approximately `path, start, end, words, glosses, priority, language`); **no ISL lexicon ships with the package** — you build one from iSign/CISLR `.pose` files, which are already in compatible pose-format. Verify the exact CSV header against `assets/dummy_lexicon` before coding.
- A Python library converting HamNoSys symbols/hex codes directly to SiGML XML exists on GitHub (under the `sign-language-translation` topic).

### 2. 3D Avatar & Animation Systems

**Recommended stack: React Three Fiber + Ready Player Me avatar + Mixamo-compatible rig, driven by pose data.**
- **React Three Fiber** (`@react-three/fiber`) + **drei** (`@react-three/drei`) — the standard React renderer for Three.js. Load GLB via `useGLTF`, play clips via `useAnimations`. Note React 19 compatibility issues — pin React 18 for R3F.
- **Ready Player Me** — free, web-loadable GLB full-body avatars with ARKit/Oculus viseme blendshapes; bone names differ from Mixamo so retargeting is required (well-documented on the three.js forum and Wawa Sensei tutorial).
- **Mixamo** — auto-rigging + animation library; FBX animations retarget onto RPM rigs (via Blender or runtime bone-name remapping).
- **met4citizen/TalkingHead** — browser JS class for full-body GLB avatars + Mixamo FBX animations + lip-sync; a strong reference for runtime animation blending.
- **VerseEngine/three-avatar**, **lo-th/Avatar.lab** — additional Three.js avatar systems.

**Hand/finger articulation** is achieved via the avatar's skeletal bone rig (each finger joint is a bone). For sign language you drive these bones from MediaPipe hand landmarks (21 keypoints/hand) by mapping landmark positions to bone rotations (inverse kinematics or direct quaternion solving). Morph targets/blendshapes handle facial non-manual markers (essential for grammatically correct signing).

**JASigning/CWASA** (UEA Virtual Humans, vh.cmp.uea.ac.uk) remains the most linguistically complete avatar system (current release 0.9.5+, avatars anna/marc/francoise, supports HamNoSys 4 non-manuals) but is Java-based and hard to integrate.

**Production approaches:** Signapse (UK, officially launched spring 2022, BSL/transport sector) deliberately rejected graphical avatars in favor of generative-AI photo-realistic signers. Co-founder/CTO Ben Saunders, in a 2025 Enigma interview: "they're obviously not human and we often find that the deaf community are a little bit offended by this. They are often quite simplistic and cartoony. Whereas when we showed them our photo-realistic videos they were like; 'Oh, that's a human.'" Signapse blends between glosses to compute positioning; SignAll uses computer vision for sign-to-text. This tells you avatar quality and non-manual expressiveness matter enormously to deaf users — budget for facial expression and smooth interpolation.

### 3. Text-to-Gloss Pipeline
English and sign-language grammar differ fundamentally (ASL is topic-comment; "Today is Friday" → gloss "NOW DAY FRIDAY"). Options:
- **Rule-based / lemmatization** (fastest to ship): spaCy `en_core_web_md` for POS tagging + lemmatization, drop articles/prepositions, keep NOUN/NUM/ADV/PRON/PROPN/ADJ/VERB, reorder to topic-comment. The `spoken-to-signed` package's `spacylemma` and `rules` glossers do exactly this.
- **Neural MT**: MarianMT, T5, or BART fine-tuned on parallel corpora. Speak2Sign3D used MarianMT and reported BLEU 0.77–0.89 on its data, training on a custom BookGlossCorpus-CG (English sentences → ASL gloss via grammar rules). The main large parallel corpus is ASLG-PC12 (Othman & Jemni, LREC 2012); the commonly used benchmark release contains 87,710 gloss–text pairs built with 800 expert-validated transformation rules from Project Gutenberg text (the full corpus claims "100 million pairs", but the widely-cited working version is ~87.7k).
- **LLM-based** (best quality/speed tradeoff today): sign.mt and others prompt GPT-4o-class models with rule instructions to drop articles and reorder. Recommended for SignSetu's first version — fast, no training needed, easily swapped for open models later.

**For ISL:** use rule-based grammar conversion (ISL is SOV, drops copula/articles; well-described in the ACM ISL grammar papers).

**Fingerspelling fallback:** When a gloss isn't in the dictionary, spell it letter-by-letter using the manual alphabet (each letter = one handshape pose; J and Z have motion). Padden & Gunsauls (2003), "How the Alphabet Came to Be Used in a Sign Language," *Sign Language Studies* 41:10–33 — based on a review of 5,400 lexical items from 36 signers — estimate fingerspelling is "12–35% of signing" (note Morford & MacFarlane 2003 give a lower 6.4% from 4,111 signs). Either way, this is core functionality, not an edge case. It is used for proper nouns, technical terms, slang, and unknown words; numbers get dedicated number signs. Store the 26 letter poses + number poses as a small base dictionary that always works.

### 4. Speech & Video Processing
- **Whisper** for speech-to-text. Use **faster-whisper** (SYSTRAN/CTranslate2): per the official GitHub repo README, it is "up to 4 times faster than openai/whisper for the same accuracy while using less memory", with batched inference giving "upto 10-12x compared to openAI implementation". `large-v3` needs ~10GB VRAM; use `base`/`small` on CPU. Returns timestamped segments (JSON) — keep these timestamps for syncing the avatar to source video.
- **YouTube/video**: `yt-dlp` (actively maintained, weekly fixes for YouTube changes) to extract `bestaudio`, then FFmpeg to normalize, then Whisper. Subtitle-first optimization: if a YouTube video already has captions, pull them directly (instant) and use Whisper only as fallback.
- **Pipeline**: URL → yt-dlp download → ffprobe (validate/duration) → faster-whisper → segments. Validate audio with ffprobe before Whisper (yt-dlp sometimes produces files Whisper chokes on).
- **Real-time vs batch**: transcription of long videos is slow, so process as async background jobs with a status endpoint; reserve "real-time" for short text/voice input.

### 5. Frontend Architecture (Next.js)
- **Split dashboard**: left = video player (HTML5 `<video>` or react-player) with controls; right = R3F `<Canvas>` avatar. Sync by subscribing to the video's `timeupdate` event and indexing into the pose/gloss timeline (each gloss has start/end ms offsets from the Whisper segment timestamps).
- **Playback controls**: speed (adjust AnimationMixer `timeScale`), pause (`mixer.timeScale = 0`), replay-sign (seek the clip), step-through gloss-by-gloss.
- **Voice recording**: `MediaRecorder` API (simplest) for capturing mic audio to upload; WebRTC only if you later need live streaming.
- **Accessible UI**: use a headless/accessible component library (Radix UI / shadcn/ui) with full keyboard navigation, high-contrast mode, captions, and visible focus states — your users are deaf/HoH so visual clarity and captioning are paramount.
- **R3F in Next.js**: render the Canvas client-side only (`dynamic(() => import(...), { ssr: false })`).

### 6. Backend Architecture (FastAPI)
Suggested endpoints:
- `POST /transcribe` — audio/video file → text + timestamped segments
- `POST /process-youtube` — URL → (async job) → transcript
- `POST /translate-to-gloss` — text → gloss sequence (+language ASL/ISL)
- `GET /get-sign-animation?gloss=...&lang=...` — gloss → pose/GLB animation (served from cache)
- `GET /jobs/{id}` — async job status

Structure: async routes throughout (FastAPI + ASGI), `BackgroundTasks` or a queue (Celery/RQ/Redis) for video jobs, run Whisper in a thread/executor to avoid blocking the event loop. Firebase Admin SDK (`firebase-admin`) integrates cleanly — initialize once at startup, use Firestore for the dictionary index and Storage for animation blobs. Add rate limiting (slowapi) on the expensive transcription/YouTube endpoints.

### 7. Firebase Setup
**Firestore collections (keep hierarchy shallow, denormalize):**
- `users/{uid}` — profile, preferences (ASL/ISL, avatar choice, speed)
- `signDictionary/{lang}/glosses/{gloss}` — gloss → {storagePath of .pose/GLB, duration, hasFingerspelling, priority}
- `animationCache/{hash}` — cache key (hash of text+lang) → ordered list of gloss IDs + total duration
- `sessionHistory/{uid}/sessions/{sessionId}` — input text, source (text/audio/youtube), gloss sequence, timestamp

**Firebase Storage**: store pose sequences (JSON or binary .pose) and/or GLB clips at `animations/{lang}/{gloss}.pose`. Cache aggressively — animations are immutable once generated, so set long cache headers and check Storage before regenerating.

**Firestore cost discipline**: minimize reads via denormalization and client-side caching; add `.limit()` to all queries; use `startAfter()` (not offset) pagination; use aggregation `count()` not full reads. Document limit is 1MB — keep large pose blobs in Storage, only metadata in Firestore.

**Auth**: Firebase Auth (email + Google). **Rules**: users read/write only their own `users/{uid}` and `sessionHistory/{uid}/*`; `signDictionary` and `animationCache` are public-read, admin-write only.

### 8. Deployment on Vercel
- **Next.js frontend → Vercel** (native, zero-config).
- **FastAPI backend → Railway or Render, NOT Vercel serverless.** Vercel does officially support Python/FastAPI serverless functions, but Whisper model loading, yt-dlp downloads, FFmpeg, and MediaPipe pose processing exceed serverless time/memory/binary limits and suffer cold starts. Railway (Dockerfile or Nixpacks, Hypercorn/Uvicorn) or Render (managed web service) are the right homes for a long-running ML backend. Fly.io is a good alternative if you need global low latency.
- **Env vars**: Firebase service-account JSON (base64), OpenAI key (if using hosted Whisper/LLM), allowed CORS origins — set in each platform's dashboard, never commit.
- **CORS**: FastAPI `CORSMiddleware` allowing your Vercel domain(s); remember Vercel preview deployments use changing `*.vercel.app` subdomains, so use a regex or explicit allow-list and a stable production domain.

### 9. Challenges & Solutions
- **Biggest challenge: ISL animation data.** There is no open, machine-readable ISL animation dataset. Solution: build a curated ISL dictionary by running MediaPipe Holistic over ISLRTC dictionary videos (10,000 terms exist as video) and/or iSign/CISLR .pose files, capped at your most-used vocabulary, plus fingerspelling fallback for everything else.
- **Missing signs**: fingerspelling fallback first; then closest-match via semantic embedding (sign.mt-style: embed gloss with all-MiniLM-L6-v2, cosine-similarity lookup in a vector DB) before giving up.
- **Avatar realism**: deaf users dislike robotic avatars (per Signapse). Invest in smooth inter-sign interpolation, correct hold/transition timing, and non-manual facial markers.
- **Browser 3D performance**: compress GLB with Draco; reuse a single avatar mesh and only swap animation tracks; cap pixel ratio; lazy-load animations; avoid re-mounting the Canvas. Stream pose sequences rather than loading all at once.
- **Licensing**: CISLR/ISLTranslate/iSign are all non-commercial (CC-BY-NC/-SA). If SignSetu is ever commercial, you cannot ship models/data derived from them — build your own data or license ISLRTC content.

### 10. Existing Open Source Projects to Reference
- **sign.mt** + `sign-language-processing/spoken-to-signed-translation` (MIT) — the reference architecture; text→gloss→pose→video; CC BY-NC-SA app, MIT engine.
- **spectre900/Sign-Kit-An-Avatar-based-ISL-Toolkit** — MERN + three.js ISL toolkit (repo topics: `three-js`, `mern-stack`, `indian-sign-language`, `3d-avatars`), speech/text → 3D avatar ISL; live at sign-kit.vercel.app; reported WER 6.39%, animation similarity 4.87/5, SUS 81.5. Closest existing analog to SignSetu (likely uses pre-built 3D animation clips served via its Node API, though the README does not state the mechanism or sign count — inspect the `client/` and `api` branches before relying on it).
- **ZhengdiYu/SignAvatars** (ECCV 2024) — 3D holistic motion dataset.
- **Speak2Sign3D** (arXiv 2507.06530, 2025) — Whisper + MarianMT + 3D keypoint animation; created Sign3D-WLASL and BookGlossCorpus-CG.
- **asanchezyali/talking-avatar-with-ai**, **met4citizen/TalkingHead** — R3F/Three.js avatar + lip-sync reference implementations.
- Research papers (2022–2025): sign.mt (EMNLP 2024); Sign2GPT (gloss-free SLT, 2024); iSign (ACL Findings 2024); CISLR (EMNLP 2022); ISLTranslate (ACL Findings 2023); Speak2Sign3D (2025).

## Recommendations

**Phase 1 — ASL MVP (validate the pipeline):**
1. Next.js + R3F front end on Vercel; FastAPI backend on Railway.
2. Text input → LLM-based gloss (GPT-4o or open model) → lookup in a small WLASL/ASL-LEX-derived pose dictionary → RPM avatar plays interpolated poses. Implement fingerspelling fallback (26 letters + numbers) from day one.
3. Add Whisper (faster-whisper) for audio, then yt-dlp for YouTube.
4. Firebase Auth + Firestore dictionary index + Storage for poses.

**Phase 2 — ISL + polish:**
5. Build ISL dictionary by running MediaPipe Holistic over ISLRTC videos / iSign poses for top ~1,000–2,000 words; rule-based ISL (SOV) grammar.
6. Add semantic closest-match (MiniLM embeddings + vector search) before fingerspelling.
7. Improve non-manual facial markers and inter-sign blending.

**Benchmarks that change the plan:**
- If avatar realism testing with deaf users scores poorly (Signapse found avatars offend some users), pivot toward pose-video or photo-realistic generation for production.
- If ISL dictionary coverage is <70% of common input words, prioritize expanding the curated dictionary over new features.
- If Whisper latency on Railway is unacceptable, move to GPU hosting (Modal/Replicate) or a hosted Whisper API.
- If the project goes commercial, replace all CC-BY-NC ISL data with self-collected or ISLRTC-licensed content.

## Caveats
- All major ISL corpora (CISLR, ISLTranslate, iSign) and How2Sign/WLASL are research/non-commercial licensed; commercial use requires replacement data.
- The exact animation mechanism and sign count of Sign-Kit could not be confirmed from its README; inspect the source before relying on it as a template.
- The `spoken-to-signed` lexicon CSV column names should be verified against the repo's `assets/dummy_lexicon` before coding; no ISL lexicon ships with the package — you must build one.
- BLEU scores cited for Speak2Sign3D (0.77–0.89) are on the authors' own custom BookGlossCorpus-CG dataset (arXiv 2507.06530, 2025) and are not independently verified.
- Signapse's photo-realistic approach is commercial/closed; only their methodology (gloss blending) is public.
- ISLRTC's 10,000-term dictionary is authoritative but published as video only; converting it to poses is a significant data-engineering effort and the licensing for redistribution is unclear.