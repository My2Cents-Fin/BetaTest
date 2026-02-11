# App Icons Needed

For the PWA to work properly, you need to create two app icon files:

## Required Icons

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

## How to Create

You can use any of these methods:

### Option 1: Use Figma/Canva
1. Create a 512x512 canvas
2. Design your app icon (e.g., "₹2" or "Finny" logo)
3. Use brand colors: Purple #9333ea, Gold #D4A84B
4. Export as PNG at 512x512
5. Resize to 192x192 for the smaller version

### Option 2: Use Online Icon Generator
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload a square logo (at least 512x512)
3. Download the generated icons
4. Rename to `icon-192.png` and `icon-512.png`

### Option 3: Simple Text Icon
For now, you can use a simple text-based icon:
1. Create a 512x512 purple square
2. Add white "₹2" or "F" text in the center
3. Export as PNG
4. Resize for 192x192 version

## Placement

Save both files in this directory:
```
/app/public/
├── icon-192.png
├── icon-512.png
└── manifest.json
```

## Design Tips

- Use high contrast (white text on purple background)
- Keep it simple - will be displayed at very small sizes
- Make it recognizable at a glance
- Avoid fine details or thin lines
- Test how it looks on both iOS and Android home screens

## Temporary Solution

For quick deployment testing, you can use a simple colored square with initials. Create a proper branded icon before launching to real users.
