# Real frame images

Place prepared transparent PNG frame images here.

Recommended structure:

```txt
public/frames/optic-001/rayban-rb5228-black.png
public/frames/optic-001/rayban-rb3025-gold.png
public/frames/optic-001/vogue-vo5276-brown.png
```

Use paths in `src/data/pilotOptics.ts` like:

```ts
imageUrl: '/frames/optic-001/rayban-rb5228-black.png'
```

The production domain is deployed at the root URL `https://vilu.store/`, not under `/optica-shop/`.

Image requirements for the pilot:

- PNG with transparent background.
- Strict front-facing angle.
- Frame aligned horizontally.
- No cropped lenses or rims.
- Prefer 1000-2000 px width.
- File names should use latin characters, numbers, and hyphens only.

If `imageUrl` is missing or the image cannot load, Try-On Pilot falls back to the generated frame drawing.
