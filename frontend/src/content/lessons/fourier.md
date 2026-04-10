# Fourier lesson copy

<!-- Keep the ## step ids stable. Edit the Markdown below freely. -->

## fundamental
### instruction
Set a₁ to 1.0 and all others to 0. This is a pure tone -- the fundamental frequency.

### hint
Drag a₂, a₃, a₄ down to 0 and keep a₁ at 1.0.

### insight
A single sine wave is the simplest possible sound -- a pure tone like a tuning fork. Every other sound is built by combining multiple pure tones at different frequencies.

## add-harmonics
### instruction
Now bring a₂ up to about 0.5. Watch how the composite signal changes shape.

### hint
Drag the amber a₂ up to about 0.50.

### insight
Adding a second harmonic changes the timbre -- the "color" of the sound. This is why a violin and a flute playing the same note sound different: they have different harmonic recipes.

## square-wave
### instruction
Try to approximate a square wave: set a₁=1.0, a₂=0, a₃=0.35, a₄=0. (Only odd harmonics!)

### hint
Set a₁=1.0, a₂=0, a₃=0.35, a₄=0.

### insight
A square wave is built from only odd harmonics (1, 3, 5...) with amplitudes 1/n. This is Fourier's great insight: ANY shape can be built from sine waves. MP3 compression works by throwing away the harmonics your ear can't hear.
