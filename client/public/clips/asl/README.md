# ASL sign clips — drop folder

Put real ASL motion-capture clips here and the avatar plays them automatically.

## How it works (zero config)
The avatar auto-loads `/clips/asl/<GLOSS>.fbx` (or `.glb`) for each sign it needs.
- **Filename = the gloss in UPPERCASE**, exactly as shown in the app's "Gloss Sequence".
- Examples: `HELLO.fbx`, `THANK-YOU.fbx`, `YES.fbx`, `NO.fbx`, `PLEASE.fbx`.
- Missing file → that sign falls back to the procedural animation (no error).

## Getting clips (free, CC0)
StudioGalt Sign-Language-Mocap-Archive: https://github.com/StudioGalt/Sign-Language-Mocap-Archive
1. Find the sign's folder.
2. Download the **"No Mesh Mixamo"** `.fbx` (FBX → game-ready → No Mesh Mixamo). It's
   animation on a Mixamo rig and retargets cleanly onto our avatar.
   Use https://downgit.github.io to grab single files without cloning the whole archive.
3. Rename it to the gloss, e.g. `HELLO.fbx`, and drop it in this folder.
4. Reload the Translator — type a sentence with that word → avatar performs the real sign.

## Notes
- Only the rotation tracks are used (root position/scale dropped) so the body never flings.
- For a custom filename/path, add an override in `SIGN_CLIPS` in
  `client/src/components/SignAvatar.tsx`.
- FBX is heavy; for many signs convert to `.glb` later (FBX2glTF) to shrink the bundle.
