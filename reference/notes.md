# Why the Sky Is Blue

> **Track:** Everyday Science · **Lesson 1** · `science-01` · Tags: `science` `physics` `light` `wavelength` `rayleigh-scattering`

## The big idea

Sunlight looks white, but it is a **mix of every colour**. Each colour is a wave, and colours differ only in their **wavelength**: red is long (about 700 nanometres), blue is short (about 450 nm). A nanometre is a billionth of a metre.

Air is made of nitrogen and oxygen molecules, each far smaller than a wave of light. Most light passes them by, but some of it is **scattered**: sent off in a new direction. And the rule that matters is that **short waves scatter far more than long ones**.

## One rule, two skies

| Where you look | What reaches your eye | Colour |
|---|---|---|
| A patch of sky away from the sun | Light scattered toward you on the way | Blue (short waves scatter most) |
| The sun itself, at sunset | Light that crossed a long path of air without being scattered | Orange and red (the blue was scattered away) |
| The sky on the Moon | Nothing: no air, so nothing scatters | Black, even at noon |

## How scattering works

A light wave passing a molecule shakes the electrons inside it. Shaking electrons send out light of their own, in every direction. Shorter waves shake them faster, and faster shaking radiates much more strongly. This is **Rayleigh scattering**: halve the wavelength and the scattering goes up 16 times. Blue (450 nm) ends up scattered about 6 times more than red (700 nm).

## Why not violet?

Violet scatters even more than blue, but sunlight contains less violet, some of it is absorbed high in the atmosphere, and our eyes are much less sensitive to it. The mix we perceive is a pale blue.

---

## Deep dive

### The rule, in a few lines of code

Rayleigh scattering applies when the thing doing the scattering is much smaller than the wavelength, like a gas molecule (about 0.3 nm) facing visible light (400 to 700 nm). The amount scattered then grows as one over the wavelength to the fourth power.

```python
colours = {"red": 700, "yellow": 580, "green": 530, "blue": 450, "violet": 400}  # nm

def relative_scattering(wavelength_nm, reference_nm=700):
    """How much more a wavelength scatters than the reference (red)."""
    return (reference_nm / wavelength_nm) ** 4

for name, nm in colours.items():
    print(f"{name:6} {nm} nm -> {relative_scattering(nm):.1f}x red")
# red 1.0x, yellow 2.1x, green 3.0x, blue 5.9x, violet 9.4x
```

Read `(700 / 450) ** 4` as: "red's wavelength is about 1.56 times blue's, and the effect multiplies that ratio by itself four times". Small differences in wavelength become big differences in scattering.

### Where the fourth power comes from

Picture each electron as a weight on a spring. The light wave pushes it back and forth at the wave's frequency, and frequency is just "how many waves pass per second", so a shorter wave means a higher frequency. A shaking charge radiates power that grows with the square of its acceleration, and for this kind of forced shaking the acceleration grows with the frequency squared. Square of a square: the radiated power grows with frequency to the fourth power, which is the same as one over the wavelength to the fourth power.

### Numbers worth remembering

| Quantity | Value |
|---|---|
| Visible light | about 400 nm (violet) to 700 nm (red) |
| Nitrogen or oxygen molecule | about 0.3 nm, over a thousand times smaller than the light |
| Blue vs red scattering | about 6 times more |
| Halving the wavelength | 16 times more scattering |
| Cloud water droplet | about 10 micrometres, roughly 20 times *bigger* than the light |

### When the rule stops working

Rayleigh's rule only holds for particles much smaller than the wavelength. Clouds are made of water droplets far larger than the light's wavelength, and particles that big scatter all colours about equally. Equal amounts of every colour add back up to white, which is why clouds are white or grey rather than blue. The same goes for haze, mist and pollution: the bigger the particles, the whiter and milkier the sky looks. The physics for those larger particles is called Mie scattering.

Mars shows the opposite case: its thin air is full of fine reddish dust, so its daytime sky looks butterscotch, while its sunsets look bluish around the sun.

The same rule makes very fine smoke, from a candle or a cigarette, look bluish against a dark background.

### Math corner: powers

"To the fourth power" means multiplying a number by itself four times: 2 to the fourth power is 2 × 2 × 2 × 2 = 16. That's why halving the wavelength gives 16 times more scattering. Powers grow fast: 1.5 to the fourth power is already about 5.1, so a wave only one and a half times shorter scatters five times more.

```python
for ratio in [1.1, 1.25, 1.5, 2]:
    print(ratio, "times shorter ->", round(ratio ** 4, 1), "times more scattering")
```

### Further reading

- Lord Rayleigh, "On the light from the sky, its polarization and colour", *Philosophical Magazine*, 1871: the original argument.
- R. P. Feynman, *The Feynman Lectures on Physics*, Vol. I, chapter 32: radiation from shaking charges and why the sky is blue.
- C. F. Bohren and D. R. Huffman, *Absorption and Scattering of Light by Small Particles*, 1983: the full treatment, Rayleigh and Mie.
